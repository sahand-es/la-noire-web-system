from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType

from cases.models import Case
from investigation.models import (
    EvidenceLink,
    DetectiveReport,
    DetectiveReportStatus,
    Notification,
)
from investigation.serializers.case_resolution import (
    EvidenceLinkCreateSerializer,
    EvidenceLinkSerializer,
    DetectiveReportSerializer,
    SergeantReviewSerializer,
    NotificationSerializer,
)
from accounts.permissions import IsDetective, IsSergeant, IsDetectiveOrSergeantOrChief

# Evidence model names that can be linked on the Detective Board (must have case_id)
EVIDENCE_MODEL_NAMES = {
    'witnesstestimony', 'biologicalevidence', 'vehicleevidence',
    'documentevidence', 'otherevidence',
}


def _evidence_object_belongs_to_case(content_type_id, object_id, case):
    """Return True if the object exists and is evidence belonging to this case."""
    try:
        ct = ContentType.objects.get(pk=content_type_id)
    except ContentType.DoesNotExist:
        return False
    if ct.model not in EVIDENCE_MODEL_NAMES:
        return False
    model_class = ct.model_class()
    if not model_class or not hasattr(model_class, 'case_id'):
        return False
    try:
        obj = model_class.objects.get(pk=object_id)
    except (model_class.DoesNotExist, ValueError):
        return False
    return getattr(obj, 'case_id', None) == case.pk


class EvidenceLinkViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceLinkSerializer
    permission_classes = [IsDetectiveOrSergeantOrChief]

    def get_queryset(self):
        return EvidenceLink.objects.filter(
            case_id=self.kwargs['case_pk']
        ).select_related('from_content_type', 'to_content_type', 'created_by').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return EvidenceLinkCreateSerializer
        return EvidenceLinkSerializer

    def create(self, request, *args, **kwargs):
        case = get_object_or_404(Case, pk=self.kwargs['case_pk'])
        ser = EvidenceLinkCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if not _evidence_object_belongs_to_case(data['from_content_type_id'], data['from_object_id'], case):
            return Response(
                {'status': 'error', 'message': 'From evidence must belong to this case.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not _evidence_object_belongs_to_case(data['to_content_type_id'], data['to_object_id'], case):
            return Response(
                {'status': 'error', 'message': 'To evidence must belong to this case.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        link = EvidenceLink.objects.create(
            case=case,
            from_content_type_id=data['from_content_type_id'],
            from_object_id=data['from_object_id'],
            to_content_type_id=data['to_content_type_id'],
            to_object_id=data['to_object_id'],
            created_by=request.user,
        )
        return Response(
            {'status': 'success', 'data': EvidenceLinkSerializer(link).data},
            status=status.HTTP_201_CREATED
        )


class DetectiveReportViewSet(viewsets.ModelViewSet):
    serializer_class = DetectiveReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        case = get_object_or_404(Case, pk=self.kwargs['case_pk'])
        user = self.request.user
        qs = DetectiveReport.objects.filter(case=case).select_related(
            'case', 'detective', 'sergeant'
        ).order_by('-submitted_at')
        if user.has_role('Detective'):
            qs = qs.filter(detective=user)
        elif user.has_role('Sergeant'):
            qs = qs.filter(case__in=Case.objects.filter(assigned_detective__isnull=False))
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsDetective()]
        if self.action == 'sergeant_review':
            return [IsSergeant()]
        return [IsDetectiveOrSergeantOrChief()]

    def create(self, request, *args, **kwargs):
        case = get_object_or_404(Case, pk=self.kwargs['case_pk'])
        if case.assigned_detective != request.user:
            return Response(
                {'status': 'error', 'message': 'Only the assigned detective can submit reports.'},
                status=status.HTTP_403_FORBIDDEN
            )
        report = DetectiveReport.objects.create(
            case=case,
            detective=request.user,
            status=DetectiveReportStatus.PENDING_SERGEANT,
        )
        return Response(
            {'status': 'success', 'data': DetectiveReportSerializer(report).data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='sergeant-reviews')
    def sergeant_review(self, request, case_pk=None, pk=None):
        report = get_object_or_404(
            DetectiveReport,
            case_id=case_pk,
            pk=pk,
            status=DetectiveReportStatus.PENDING_SERGEANT
        )
        if not request.user.has_role('Sergeant'):
            return Response(
                {'status': 'error', 'message': 'Only sergeant can review.'},
                status=status.HTTP_403_FORBIDDEN
            )
        ser = SergeantReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_type = ser.validated_data['action']
        message = ser.validated_data.get('message', '')
        report.sergeant = request.user
        report.sergeant_message = message
        report.reviewed_at = timezone.now()
        report.status = (
            DetectiveReportStatus.APPROVED if action_type == 'approve' else DetectiveReportStatus.DISAGREEMENT
        )
        report.save()
        return Response({
            'status': 'success',
            'data': DetectiveReportSerializer(report).data,
            'message': 'Approved; arrest may begin.' if action_type == 'approve' else 'Disagreement recorded; case remains open.'
        })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('case', 'content_type').order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='reads')
    def mark_read(self, request, pk=None):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at'])
        return Response({
            'status': 'success',
            'data': NotificationSerializer(notification).data,
        })

    @action(detail=False, methods=['post'], url_path='reads')
    def mark_all_read(self, request):
        updated = Notification.objects.filter(
            recipient=request.user,
            read_at__isnull=True
        ).update(read_at=timezone.now())
        return Response({
            'status': 'success',
            'message': f'{updated} notifications marked as read.',
        })
