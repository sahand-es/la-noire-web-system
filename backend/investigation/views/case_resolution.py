from django.utils import timezone
import hashlib
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
    ReportedSuspect,
    Suspect,
    SuspectCaseLink,
)
from investigation.serializers.case_resolution import (
    EvidenceLinkCreateSerializer,
    EvidenceLinkSerializer,
    DetectiveReportSerializer,
    SergeantReviewSerializer,
    DetectiveReportCreateSerializer,
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


def _digits_only(value):
    if value is None:
        return ''
    return ''.join(ch for ch in str(value) if ch.isdigit())


def _normalize_national_id(raw_value):
    digits = _digits_only(raw_value)
    if len(digits) == 10:
        return digits
    return None


def _split_full_name(full_name):
    parts = (full_name or '').strip().split()
    if not parts:
        return 'Unknown', 'Suspect'
    if len(parts) == 1:
        return parts[0], 'Suspect'
    return parts[0], ' '.join(parts[1:])


def _generate_unique_national_id(seed):
    base = int(hashlib.sha256(seed.encode('utf-8')).hexdigest(), 16) % (10 ** 10)
    for _ in range(10 ** 4):
        candidate = f"{base:010d}"
        if not Suspect.objects.filter(national_id=candidate).exists():
            return candidate
        base = (base + 1) % (10 ** 10)
    return f"{timezone.now().strftime('%H%M%S%f')[:10]}"


def _build_suspect_from_evidence(case, report, reported_suspect):
    model_class = reported_suspect.content_type.model_class()
    obj = None
    if model_class:
        try:
            obj = model_class.objects.get(pk=reported_suspect.object_id)
        except model_class.DoesNotExist:
            obj = None

    first_name = 'Unknown'
    last_name = 'Suspect'
    phone_number = ''
    national_id = None

    if obj is not None and hasattr(obj, 'suspected_owner') and obj.suspected_owner:
        owner = obj.suspected_owner
        first_name = owner.first_name or first_name
        last_name = owner.last_name or last_name
        phone_number = owner.phone_number or ''
        national_id = _normalize_national_id(owner.national_id)
    elif obj is not None and hasattr(obj, 'owner_full_name') and obj.owner_full_name:
        first_name, last_name = _split_full_name(obj.owner_full_name)

    if obj is not None and hasattr(obj, 'witness_name') and obj.witness_name:
        first_name, last_name = _split_full_name(obj.witness_name)
        if hasattr(obj, 'witness_contact') and obj.witness_contact:
            phone_number = obj.witness_contact

    if obj is not None and hasattr(obj, 'document_attributes'):
        attrs = obj.document_attributes or {}
        for key in ['national_id', 'id_number', 'ID_Number', 'nationalCode', 'national_code']:
            candidate = _normalize_national_id(attrs.get(key))
            if candidate:
                national_id = candidate
                break

    if not national_id:
        seed = f"{case.id}:{report.id}:{reported_suspect.content_type_id}:{reported_suspect.object_id}"
        national_id = _generate_unique_national_id(seed)

    suspect_defaults = {
        'first_name': first_name,
        'last_name': last_name,
        'phone_number': phone_number,
    }
    suspect, _ = Suspect.objects.get_or_create(
        national_id=national_id,
        defaults=suspect_defaults,
    )

    _, link_created = SuspectCaseLink.objects.get_or_create(
        suspect=suspect,
        case=case,
        defaults={
            'identification_method': f'Detective report #{report.id}',
            'notes': (
                f'Added from reported suspect evidence '
                f'{reported_suspect.content_type.model} #{reported_suspect.object_id}'
            ),
        },
    )
    return link_created


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
        ser = DetectiveReportCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        if case.assigned_detective != request.user:
            return Response(
                {'status': 'error', 'message': 'Only the assigned detective can submit reports.'},
                status=status.HTTP_403_FORBIDDEN
            )
        report = DetectiveReport.objects.create(
            case=case,
            detective=request.user,
            status=DetectiveReportStatus.PENDING_SERGEANT,
            detective_message=data.get('message', '')
        )

        # persist reported suspects (evidence references)
        suspects = data.get('suspects') or []
        for s in suspects:
            ct_id = s.get('content_type_id')
            obj_id = s.get('object_id')
            if not _evidence_object_belongs_to_case(ct_id, obj_id, case):
                # rollback created report and return error
                report.delete()
                return Response({'status': 'error', 'message': 'Reported suspect evidence must belong to this case.'}, status=status.HTTP_400_BAD_REQUEST)
            ReportedSuspect.objects.create(report=report, content_type_id=ct_id, object_id=obj_id)

        # notify sergeants (all users in Sergeant role)
        try:
            from accounts.models import Role
            ser_role = Role.objects.filter(name='Sergeant').first()
            if ser_role:
                ser_users = ser_role.accounts_users.filter(is_active=True)
                for u in ser_users:
                    Notification.objects.create(
                        case=case,
                        recipient=u,
                        content_type=ContentType.objects.get_for_model(DetectiveReport),
                        object_id=report.id,
                        message=f"Detective submitted report for Case {case.case_number or case.id}",
                    )
        except Exception:
            # non-fatal if notification creation fails
            pass
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

        linked_count = 0
        if action_type == 'approve':
            reported = report.reported_suspects.select_related('content_type').all()
            for rs in reported:
                if _build_suspect_from_evidence(report.case, report, rs):
                    linked_count += 1

        success_message = (
            'Approved; arrest may begin.'
            if action_type == 'approve'
            else 'Disagreement recorded; case remains open.'
        )
        if action_type == 'approve' and linked_count:
            success_message = f'{success_message} {linked_count} suspect(s) added to case.'

        return Response({
            'status': 'success',
            'data': DetectiveReportSerializer(report).data,
            'message': success_message
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
