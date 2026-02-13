from rest_framework import serializers

from investigation.models import Trial, TrialVerdict


class TrialSerializer(serializers.ModelSerializer):
    judge_name = serializers.CharField(source='judge.get_full_name', read_only=True, allow_null=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = Trial
        fields = [
            'id', 'case', 'case_number', 'judge', 'judge_name', 'status',
            'scheduled_date', 'verdict', 'punishment', 'verdict_date',
            'judge_notes', 'is_completed', 'created_at', 'updated_at',
        ]
        read_only_fields = ['case', 'judge', 'verdict_date']


class RecordVerdictSerializer(serializers.Serializer):
    verdict = serializers.ChoiceField(choices=TrialVerdict.choices)
    punishment = serializers.CharField(required=False, allow_blank=True)
    judge_notes = serializers.CharField(required=False, allow_blank=True)


class EvidenceSummarySerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.IntegerField()
    title = serializers.CharField()
    description = serializers.CharField()


class InvolvedIndividualSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    national_id = serializers.CharField()
    role = serializers.CharField()
    guilt_scores = serializers.DictField(allow_null=True)


class TrialCaseDetailSerializer(serializers.Serializer):
    """Full case view for judge: case + evidence + involved individuals (PROJECT 304-305)."""
    trial = TrialSerializer(read_only=True)
    case_number = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    incident_date = serializers.DateTimeField()
    incident_location = serializers.CharField()
    status = serializers.CharField()
    priority = serializers.CharField()
    evidence = EvidenceSummarySerializer(many=True)
    involved_individuals = InvolvedIndividualSerializer(many=True)
