from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType

from cases.models import (
    Case,
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
)
from investigation.models import Notification
from cases.serializers.evidence import (
    WitnessTestimonyCreateSerializer,
    WitnessTestimonySerializer,
    BiologicalEvidenceCreateSerializer,
    BiologicalEvidenceSerializer,
    CoronerApprovalSerializer,
    VehicleEvidenceCreateSerializer,
    VehicleEvidenceSerializer,
    DocumentEvidenceCreateSerializer,
    DocumentEvidenceSerializer,
    OtherEvidenceCreateSerializer,
    OtherEvidenceSerializer,
)
from core.permissions import IsCadetOrOfficer, IsDetective, IsDetectiveOrSergeantOrChief, IsCoroner


def notify_detective_new_evidence(case, content_object, message=''):
    if not case.assigned_detective:
        return
    Notification.objects.get_or_create(
        case=case,
        recipient=case.assigned_detective,
        content_type=ContentType.objects.get_for_model(content_object),
        object_id=content_object.pk,
        defaults={'message': message or f'New evidence added to case {case.case_number}'}
    )


class CaseEvidenceMixin:
    def get_case(self):
        return get_object_or_404(Case, pk=self.kwargs['case_pk'])

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsCadetOrOfficer()]
        return [IsCadetOrOfficer()]


class WitnessTestimonyViewSet(CaseEvidenceMixin, viewsets.ModelViewSet):
    serializer_class = WitnessTestimonySerializer
    permission_classes = [IsCadetOrOfficer]

    def get_queryset(self):
        return WitnessTestimony.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('collected_by').order_by('-collected_date')

    def get_serializer_class(self):
        if self.action == 'create':
            return WitnessTestimonyCreateSerializer
        return WitnessTestimonySerializer

    def perform_create(self, serializer):
        case = self.get_case()
        instance = serializer.save(case=case)
        notify_detective_new_evidence(case, instance)

    def create(self, request, *args, **kwargs):
        case = self.get_case()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'case': case})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {'status': 'success', 'data': WitnessTestimonySerializer(instance=serializer.instance).data},
            status=status.HTTP_201_CREATED
        )


class BiologicalEvidenceViewSet(CaseEvidenceMixin, viewsets.ModelViewSet):
    serializer_class = BiologicalEvidenceSerializer
    permission_classes = [IsCadetOrOfficer]

    def get_permissions(self):
        if self.action == 'coroner_approvals':
            return [IsCoroner()]
        return [IsCadetOrOfficer()]

    def get_queryset(self):
        return BiologicalEvidence.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('collected_by', 'coroner_approved_by').order_by('-collected_date')

    def get_serializer_class(self):
        if self.action == 'create':
            return BiologicalEvidenceCreateSerializer
        return BiologicalEvidenceSerializer

    def perform_create(self, serializer):
        case = self.get_case()
        instance = serializer.save(case=case)
        notify_detective_new_evidence(case, instance)

    def create(self, request, *args, **kwargs):
        case = self.get_case()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'case': case})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {'status': 'success', 'data': BiologicalEvidenceSerializer(instance=serializer.instance).data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='coroner-approvals')
    def coroner_approvals(self, request, case_pk=None, pk=None):
        evidence = get_object_or_404(BiologicalEvidence, case_id=case_pk, pk=pk)
        if not request.user.has_role('Coroner'):
            return Response(
                {'status': 'error', 'message': 'Only coroner can approve biological evidence.'},
                status=status.HTTP_403_FORBIDDEN
            )
        ser = CoronerApprovalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        evidence.coroner_approved = ser.validated_data['approved']
        evidence.coroner_approved_by = request.user
        evidence.coroner_approved_at = timezone.now()
        if ser.validated_data.get('follow_up_result') is not None:
            evidence.lab_results = ser.validated_data['follow_up_result']
        evidence.save()
        return Response({
            'status': 'success',
            'data': BiologicalEvidenceSerializer(evidence).data,
        })


class VehicleEvidenceViewSet(CaseEvidenceMixin, viewsets.ModelViewSet):
    serializer_class = VehicleEvidenceSerializer
    permission_classes = [IsCadetOrOfficer]

    def get_queryset(self):
        return VehicleEvidence.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('collected_by').order_by('-collected_date')

    def get_serializer_class(self):
        if self.action == 'create':
            return VehicleEvidenceCreateSerializer
        return VehicleEvidenceSerializer

    def perform_create(self, serializer):
        case = self.get_case()
        instance = serializer.save(case=case)
        notify_detective_new_evidence(case, instance)

    def create(self, request, *args, **kwargs):
        case = self.get_case()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'case': case})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {'status': 'success', 'data': VehicleEvidenceSerializer(instance=serializer.instance).data},
            status=status.HTTP_201_CREATED
        )


class DocumentEvidenceViewSet(CaseEvidenceMixin, viewsets.ModelViewSet):
    serializer_class = DocumentEvidenceSerializer
    permission_classes = [IsCadetOrOfficer]

    def get_queryset(self):
        return DocumentEvidence.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('collected_by').order_by('-collected_date')

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentEvidenceCreateSerializer
        return DocumentEvidenceSerializer

    def perform_create(self, serializer):
        case = self.get_case()
        instance = serializer.save(case=case)
        notify_detective_new_evidence(case, instance)

    def create(self, request, *args, **kwargs):
        case = self.get_case()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'case': case})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {'status': 'success', 'data': DocumentEvidenceSerializer(instance=serializer.instance).data},
            status=status.HTTP_201_CREATED
        )


class OtherEvidenceViewSet(CaseEvidenceMixin, viewsets.ModelViewSet):
    serializer_class = OtherEvidenceSerializer
    permission_classes = [IsCadetOrOfficer]

    def get_queryset(self):
        return OtherEvidence.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('collected_by').order_by('-collected_date')

    def get_serializer_class(self):
        if self.action == 'create':
            return OtherEvidenceCreateSerializer
        return OtherEvidenceSerializer

    def perform_create(self, serializer):
        case = self.get_case()
        instance = serializer.save(case=case)
        notify_detective_new_evidence(case, instance)

    def create(self, request, *args, **kwargs):
        case = self.get_case()
        serializer = self.get_serializer(data=request.data, context={'request': request, 'case': case})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {'status': 'success', 'data': OtherEvidenceSerializer(instance=serializer.instance).data},
            status=status.HTTP_201_CREATED
        )
