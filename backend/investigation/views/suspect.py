from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from cases.models import Case
from investigation.models import SuspectCaseLink
from investigation.serializers.suspect import (
    SuspectCaseLinkSerializer,
    SuspectCaseLinkCreateSerializer,
    GuiltScoreSerializer,
    CaptainOpinionSerializer,
    ChiefApprovalSerializer,
)
from accounts.permissions import (
    IsDetective,
    IsSergeant,
    IsCaptain,
    IsPoliceChief,
    IsDetectiveOrSergeantOrChief,
    IsSergeantOrCaptainOrChief,
)


class SuspectCaseLinkViewSet(viewsets.GenericViewSet):
    """Suspect-case links: guilt scores (detective/sergeant), captain opinion, chief approval (critical cases)."""
    serializer_class = SuspectCaseLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SuspectCaseLink.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('suspect', 'case', 'captain', 'chief').order_by('-created_at')

    def get_permissions(self):
        if self.action == 'create':
            return [IsSergeant()]
        if self.action == 'detective_assessment':
            return [IsDetective()]
        if self.action == 'sergeant_assessment':
            return [IsSergeant()]
        if self.action == 'captain_opinion':
            return [IsCaptain()]
        if self.action == 'chief_approval':
            return [IsPoliceChief()]
        return [IsDetectiveOrSergeantOrChief()]

    def list(self, request, case_pk=None):
        links = self.get_queryset()
        return Response({'status': 'success', 'data': SuspectCaseLinkSerializer(links, many=True).data})

    def retrieve(self, request, case_pk=None, pk=None):
        link = get_object_or_404(SuspectCaseLink, case_id=case_pk, pk=pk)
        return Response({'status': 'success', 'data': SuspectCaseLinkSerializer(link).data})

    def create(self, request, case_pk=None):
        case = get_object_or_404(Case, pk=case_pk)
        serializer = SuspectCaseLinkCreateSerializer(data=request.data, context={'case': case})
        serializer.is_valid(raise_exception=True)
        link = serializer.save()
        return Response(
            {
                'status': 'success',
                'data': SuspectCaseLinkSerializer(link).data,
                'message': 'Suspect created and linked to case.',
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='detective-assessment')
    def detective_assessment(self, request, case_pk=None, pk=None):
        """Detective sets guilt probability 1-10 for this suspect (after arrest)."""
        link = get_object_or_404(SuspectCaseLink, case_id=case_pk, pk=pk)
        ser = GuiltScoreSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        score = ser.validated_data['guilt_score']
        link.detective_guilt_score = score
        link.detective_assessment_date = timezone.now()
        link.save()
        return Response({
            'status': 'success',
            'data': SuspectCaseLinkSerializer(link).data,
            'message': 'Detective guilt score recorded.',
        })

    @action(detail=True, methods=['post'], url_path='sergeant-assessment')
    def sergeant_assessment(self, request, case_pk=None, pk=None):
        """Sergeant sets guilt probability 1-10 for this suspect (after arrest)."""
        link = get_object_or_404(SuspectCaseLink, case_id=case_pk, pk=pk)
        ser = GuiltScoreSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        score = ser.validated_data['guilt_score']
        link.sergeant_guilt_score = score
        link.sergeant_assessment_date = timezone.now()
        link.save()
        return Response({
            'status': 'success',
            'data': SuspectCaseLinkSerializer(link).data,
            'message': 'Sergeant guilt score recorded.',
        })

    @action(detail=True, methods=['post'], url_path='captain-opinion')
    def captain_opinion(self, request, case_pk=None, pk=None):
        """Captain sets final opinion (statements, documents, scores). Requires both detective and sergeant scores."""
        link = get_object_or_404(SuspectCaseLink, case_id=case_pk, pk=pk)
        if not link.has_both_assessments:
            return Response(
                {'status': 'error', 'message': 'Both detective and sergeant guilt scores must be set first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ser = CaptainOpinionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        link.captain_opinion = ser.validated_data['opinion']
        link.captain = request.user
        link.captain_opinion_at = timezone.now()
        link.save()
        return Response({
            'status': 'success',
            'data': SuspectCaseLinkSerializer(link).data,
            'message': 'Captain opinion recorded.' + (
                ' For critical case, police chief must approve or reject.' if link.is_critical_case else ''
            ),
        })

    @action(detail=True, methods=['post'], url_path='chief-approval')
    def chief_approval(self, request, case_pk=None, pk=None):
        """Police chief approves or rejects captain's opinion. Only for critical crimes."""
        link = get_object_or_404(SuspectCaseLink, case_id=case_pk, pk=pk)
        if not link.is_critical_case:
            return Response(
                {'status': 'error', 'message': 'Chief approval is only required for critical crimes.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not (link.captain_opinion and link.captain_id):
            return Response(
                {'status': 'error', 'message': 'Captain must set opinion before chief can approve or reject.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ser = ChiefApprovalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        link.chief_approved = ser.validated_data['approved']
        link.chief = request.user
        link.chief_approval_at = timezone.now()
        link.save()
        return Response({
            'status': 'success',
            'data': SuspectCaseLinkSerializer(link).data,
            'message': 'Captain opinion approved.' if link.chief_approved else 'Captain opinion rejected.',
        })
