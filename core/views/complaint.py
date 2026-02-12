from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction

from core.models import Complaint, ComplaintStatus, Case, CaseStatus
from core.serializers.complaint import (
    ComplaintSerializer,
    ComplaintCreateSerializer,
    ComplaintUpdateSerializer,
    CadetReviewSerializer,
    OfficerReviewSerializer
)
from core.permissions import IsComplainant, IsCadet, IsOfficer, IsCadetOrOfficer


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.select_related(
        'complainant',
        'reviewed_by_cadet',
        'reviewed_by_officer',
        'case'
    ).all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ComplaintCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ComplaintUpdateSerializer
        return ComplaintSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'retrieve']:
            return [IsComplainant()]
        if self.action == 'cadet_review':
            return [IsCadet()]
        if self.action == 'officer_review':
            return [IsOfficer()]
        if self.action == 'list':
            return [IsCadetOrOfficer()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.has_role('Cadet'):
            return self.queryset.filter(
                status__in=[
                    ComplaintStatus.PENDING_CADET,
                    ComplaintStatus.RETURNED_TO_CADET
                ]
            )

        if user.has_any_role(['Police Officer', 'Detective', 'Sergeant', 'Captain', 'Police Chief']):
            return self.queryset.filter(status=ComplaintStatus.PENDING_OFFICER)

        return self.queryset.filter(complainant=user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()

        return Response(
            {
                'status': 'success',
                'data': ComplaintSerializer(complaint).data,
                'message': 'Complaint submitted successfully. Pending cadet review.'
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='cadet-reviews')
    def cadet_review(self, request, pk=None):
        complaint = get_object_or_404(
            Complaint,
            pk=pk,
            status__in=[ComplaintStatus.PENDING_CADET, ComplaintStatus.RETURNED_TO_CADET]
        )

        serializer = CadetReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        message = serializer.validated_data.get('message', '')

        with transaction.atomic():
            if action_type == 'approve':
                complaint.status = ComplaintStatus.PENDING_OFFICER
                complaint.reviewed_by_cadet = request.user
                complaint.cadet_message = message
                complaint.save()

                return Response({
                    'status': 'success',
                    'data': ComplaintSerializer(complaint).data,
                    'message': 'Complaint approved and sent to officer for review'
                })

            else:
                complaint.rejection_count += 1
                complaint.cadet_message = message
                complaint.reviewed_by_cadet = request.user

                if complaint.rejection_count >= 3:
                    complaint.status = ComplaintStatus.VOIDED
                    complaint.save()
                    return Response({
                        'status': 'success',
                        'data': ComplaintSerializer(complaint).data,
                        'message': 'Complaint voided due to 3 rejections'
                    })

                complaint.status = ComplaintStatus.RETURNED_TO_COMPLAINANT
                complaint.save()

                return Response({
                    'status': 'success',
                    'data': ComplaintSerializer(complaint).data,
                    'message': 'Complaint returned to complainant for correction'
                })

    @action(detail=True, methods=['post'], url_path='officer-reviews')
    def officer_review(self, request, pk=None):
        complaint = get_object_or_404(
            Complaint,
            pk=pk,
            status=ComplaintStatus.PENDING_OFFICER
        )

        serializer = OfficerReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        message = serializer.validated_data.get('message', '')

        with transaction.atomic():
            if action_type == 'approve':
                case = Case.objects.create(
                    title=complaint.title,
                    description=complaint.description,
                    incident_date=complaint.incident_date,
                    incident_location=complaint.incident_location,
                    status=CaseStatus.OPEN
                )

                complaint.case = case
                complaint.status = ComplaintStatus.APPROVED
                complaint.reviewed_by_officer = request.user
                complaint.officer_message = message
                complaint.save()

                return Response({
                    'status': 'success',
                    'data': ComplaintSerializer(complaint).data,
                    'message': f'Complaint approved and case #{case.id} created'
                })

            else:
                complaint.status = ComplaintStatus.RETURNED_TO_CADET
                complaint.officer_message = message
                complaint.reviewed_by_officer = request.user
                complaint.save()

                return Response({
                    'status': 'success',
                    'data': ComplaintSerializer(complaint).data,
                    'message': 'Complaint returned to cadet for re-review'
                })


