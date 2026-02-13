from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from django.contrib.contenttypes.models import ContentType

from core.models import Reward, RewardStatus
from cases.models import Case, Notification
from core.serializers.reward import (
    RewardCreateSerializer,
    RewardListSerializer,
    RewardDetailSerializer,
    RewardLookupSerializer,
    OfficerReviewSerializer,
    DetectiveReviewSerializer,
)
from core.permissions import IsOfficer, IsDetective, IsCadetOrOfficer


class RewardViewSet(viewsets.ModelViewSet):
    queryset = Reward.objects.select_related(
        'case', 'recipient', 'officer_reviewed_by', 'approved_by'
    ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return RewardCreateSerializer
        if self.action in ['officer_reviews', 'detective_reviews']:
            return None
        if self.action == 'lookup':
            return RewardLookupSerializer
        if self.action == 'retrieve':
            return RewardDetailSerializer
        return RewardListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action == 'officer_reviews':
            return [IsOfficer()]
        if self.action == 'detective_reviews':
            return [IsDetective()]
        if self.action == 'lookup':
            return [IsCadetOrOfficer()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(is_civilian_reward=True)
        if user.has_any_role(['Police Officer', 'Sergeant', 'Captain', 'Police Chief']):
            return qs.filter(status=RewardStatus.PENDING)
        if user.has_role('Detective'):
            return qs.filter(
                status=RewardStatus.PENDING_DETECTIVE,
                case__assigned_detective=user
            )
        return qs.filter(recipient=user)

    def create(self, request, *args, **kwargs):
        serializer = RewardCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        reward = serializer.save()
        return Response(
            {
                'status': 'success',
                'data': RewardDetailSerializer(reward).data,
                'message': 'Information submitted. Pending police officer review.',
            },
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        reward = self.get_object()
        if reward.recipient != request.user and not request.user.has_any_role(
            ['Police Officer', 'Detective', 'Sergeant', 'Captain', 'Police Chief', 'Cadet']
        ):
            return Response(
                {'status': 'error', 'message': 'Not allowed to view this reward.'},
                status=status.HTTP_403_FORBIDDEN
            )
        data = RewardDetailSerializer(reward).data
        if reward.status != RewardStatus.READY_FOR_PAYMENT and reward.status != RewardStatus.PAID:
            data.pop('reward_code', None)
        return Response({'status': 'success', 'data': data})

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = RewardListSerializer(qs, many=True)
        for item in serializer.data:
            if item.get('status') not in (RewardStatus.READY_FOR_PAYMENT, RewardStatus.PAID):
                item.pop('reward_code', None)
        return Response({'status': 'success', 'data': serializer.data})

    @action(detail=True, methods=['post'], url_path='officer-reviews')
    def officer_reviews(self, request, pk=None):
        reward = get_object_or_404(
            Reward,
            pk=pk,
            is_civilian_reward=True,
            status=RewardStatus.PENDING
        )
        ser = OfficerReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_type = ser.validated_data['action']
        message = ser.validated_data.get('message', '')

        if action_type == 'reject':
            reward.status = RewardStatus.REJECTED
            reward.rejection_reason = message
            reward.officer_reviewed_by = request.user
            reward.officer_reviewed_at = timezone.now()
            reward.save()
            return Response({
                'status': 'success',
                'data': RewardDetailSerializer(reward).data,
                'message': 'Reward submission rejected.',
            })

        reward.status = RewardStatus.PENDING_DETECTIVE
        reward.officer_reviewed_by = request.user
        reward.officer_reviewed_at = timezone.now()
        reward.save()
        return Response({
            'status': 'success',
            'data': RewardDetailSerializer(reward).data,
            'message': 'Sent to detective responsible for the case.',
        })

    @action(detail=True, methods=['post'], url_path='detective-reviews')
    def detective_reviews(self, request, pk=None):
        reward = get_object_or_404(
            Reward,
            pk=pk,
            is_civilian_reward=True,
            status=RewardStatus.PENDING_DETECTIVE
        )
        if reward.case and reward.case.assigned_detective != request.user:
            return Response(
                {'status': 'error', 'message': 'Only the detective assigned to this case may review.'},
                status=status.HTTP_403_FORBIDDEN
            )
        ser = DetectiveReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_type = ser.validated_data['action']
        message = ser.validated_data.get('message', '')
        amount = ser.validated_data.get('amount')

        if action_type == 'reject':
            reward.status = RewardStatus.REJECTED
            reward.rejection_reason = message
            reward.approved_by = request.user
            reward.approved_date = timezone.now()
            reward.save()
            return Response({
                'status': 'success',
                'data': RewardDetailSerializer(reward).data,
                'message': 'Reward submission rejected.',
            })

        reward.status = RewardStatus.READY_FOR_PAYMENT
        reward.approved_by = request.user
        reward.approved_date = timezone.now()
        if amount is not None:
            reward.amount = amount
        reward.save()

        try:
            from cases.models import Notification
            Notification.objects.get_or_create(
                case=reward.case,
                recipient=reward.recipient,
                content_type=ContentType.objects.get_for_model(Reward),
                object_id=reward.pk,
                defaults={
                    'message': f'Your reward has been approved. Present this code at the police department: {reward.reward_code}'
                }
            )
        except Exception:
            pass

        return Response({
            'status': 'success',
            'data': RewardDetailSerializer(reward).data,
            'message': 'Approved. User has been notified and can claim with the unique code.',
            'reward_code': reward.reward_code,
        })

    @action(detail=False, methods=['get'], url_path='lookups')
    def lookup(self, request):
        """Police: look up reward by person's national_id + reward_code."""
        national_id = request.query_params.get('national_id')
        reward_code = request.query_params.get('reward_code')
        if not national_id or not reward_code:
            return Response(
                {'status': 'error', 'message': 'national_id and reward_code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        reward = Reward.objects.filter(
            is_civilian_reward=True,
            recipient__national_id=national_id,
            reward_code=reward_code.strip()
        ).select_related('case', 'recipient').first()
        if not reward:
            return Response(
                {'status': 'error', 'message': 'No reward found for this national ID and code.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'status': 'success',
            'data': RewardLookupSerializer(reward).data,
        })
