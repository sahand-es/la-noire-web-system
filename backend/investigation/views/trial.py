from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from cases.models import Case
from cases.models import (
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
)
from investigation.models import Trial, TrialStatus, TrialVerdict, SuspectCaseLink
from investigation.serializers.trial import TrialSerializer, RecordVerdictSerializer, CreateTrialSerializer
from accounts.permissions import IsJudge, IsSergeantOrCaptainOrChiefOrAdmin


def _evidence_summaries(case):
    """Collect all evidence on case for judge view (PROJECT: entire case with evidence and documents)."""
    summaries = []
    for qs, etype in [
        (WitnessTestimony.objects.filter(case=case), 'witness_testimony'),
        (BiologicalEvidence.objects.filter(case=case), 'biological'),
        (VehicleEvidence.objects.filter(case=case), 'vehicle'),
        (DocumentEvidence.objects.filter(case=case), 'document'),
        (OtherEvidence.objects.filter(case=case), 'other'),
    ]:
        for obj in qs[:100]:  # limit per type
            summaries.append({
                'type': etype,
                'id': obj.id,
                'title': getattr(obj, 'title', '') or str(obj),
                'description': getattr(obj, 'description', ''),
            })
    return summaries


def _involved_individuals(case):
    """Suspects and their details linked to this case (complete details of all involved individuals)."""
    individuals = []
    for link in SuspectCaseLink.objects.filter(case=case).select_related('suspect'):
        s = link.suspect
        individuals.append({
            'id': s.id,
            'full_name': s.full_name,
            'national_id': s.national_id,
            'role': 'suspect',
            'guilt_scores': {
                'detective': link.detective_guilt_score,
                'sergeant': link.sergeant_guilt_score,
            } if (link.detective_guilt_score is not None or link.sergeant_guilt_score is not None) else None,
        })
    return individuals


class TrialViewSet(viewsets.ViewSet):
    """
    Trial for a case: judge sees entire case with evidence and individuals, then records verdict/punishment.
    One trial per case (OneToOne). URL: /api/v1/cases/<case_pk>/investigation/trial/
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            return [IsSergeantOrCaptainOrChiefOrAdmin()]
        return [IsJudge()]

    def create(self, request, case_pk=None):
        """Sergeant/Captain/Chief schedules a trial for a case."""
        case = get_object_or_404(Case, pk=case_pk)
        if hasattr(case, 'trial') and case.trial:
            return Response(
                {'status': 'error', 'message': 'This case already has a trial.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ser = CreateTrialSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        judge_id = ser.validated_data['judge_id']
        scheduled_date = ser.validated_data['scheduled_date']
        from django.contrib.auth import get_user_model
        User = get_user_model()
        judge = get_object_or_404(User, pk=judge_id)
        if not judge.has_role('Judge'):
            return Response(
                {'status': 'error', 'message': 'Selected user must have the Judge role.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        trial = Trial.objects.create(
            case=case,
            judge=judge,
            scheduled_date=scheduled_date,
            status=TrialStatus.SCHEDULED,
        )
        return Response(
            {
                'status': 'success',
                'data': TrialSerializer(trial).data,
                'message': f'Trial scheduled for {case.case_number}.',
            },
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, case_pk=None):
        """Judge sees full case: trial, case details, evidence, involved individuals (PROJECT 304-305)."""
        case = get_object_or_404(Case, pk=case_pk)
        trial = get_object_or_404(Trial, case=case)
        evidence = _evidence_summaries(case)
        individuals = _involved_individuals(case)
        payload = {
            'trial': TrialSerializer(trial).data,
            'case_number': case.case_number,
            'title': case.title,
            'description': case.description,
            'incident_date': case.incident_date,
            'incident_location': case.incident_location,
            'status': case.status,
            'priority': case.priority,
            'evidence': evidence,
            'involved_individuals': individuals,
        }
        return Response({
            'status': 'success',
            'data': payload,
        })

    @action(detail=False, methods=['post'], url_path='record-verdict')
    def record_verdict(self, request, case_pk=None):
        """Judge records final verdict (innocent/guilty) and punishment (PROJECT 305)."""
        case = get_object_or_404(Case, pk=case_pk)
        trial = get_object_or_404(Trial, case=case)
        ser = RecordVerdictSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        trial.verdict = ser.validated_data['verdict']
        trial.punishment = ser.validated_data.get('punishment', '') or ''
        trial.judge_notes = ser.validated_data.get('judge_notes', '') or ''
        trial.verdict_date = timezone.now()
        trial.status = TrialStatus.COMPLETED
        trial.save()
        return Response({
            'status': 'success',
            'data': TrialSerializer(trial).data,
            'message': f'Verdict {trial.verdict} recorded.',
        })
