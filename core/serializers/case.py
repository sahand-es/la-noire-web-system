from django.utils import timezone
from rest_framework import serializers

from core.models import Case, UserProfile


class CaseCreateFromSceneSerializer(serializers.ModelSerializer):
    witness_national_ids = serializers.ListField(
        child=serializers.CharField(max_length=10),
        required=False,
        allow_empty=True
    )
    witness_phones = serializers.ListField(
        child=serializers.CharField(max_length=15),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = Case
        fields = [
            'title', 'description', 'incident_date', 'incident_location',
            'priority', 'witness_national_ids', 'witness_phones', 'notes'
        ]

    def validate_incident_date(self, value):
        from django.utils import timezone as django_timezone
        if value > django_timezone.now():
            raise serializers.ValidationError("Incident date cannot be in the future")
        return value

    def create(self, validated_data):
        witness_national_ids = validated_data.pop('witness_national_ids', [])
        witness_phones = validated_data.pop('witness_phones', [])

        validated_data['status'] = 'OPEN'
        case = super().create(validated_data)

        if witness_national_ids or witness_phones:
            case.notes += f"\n\nWitness National IDs: {', '.join(witness_national_ids)}"
            case.notes += f"\nWitness Phones: {', '.join(witness_phones)}"
            case.save()

        return case


class CaseListSerializer(serializers.ModelSerializer):
    detective_name = serializers.CharField(
        source='assigned_detective.get_full_name',
        read_only=True,
        allow_null=True
    )
    days_open = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'status', 'priority',
            'incident_date', 'incident_location', 'assigned_detective',
            'detective_name', 'days_open', 'is_active', 'created_at'
        ]


from .complaint import ComplaintSerializer

class CaseDetailSerializer(serializers.ModelSerializer):
    detective_name = serializers.CharField(
        source='assigned_detective.get_full_name',
        read_only=True,
        allow_null=True
    )
    team_member_names = serializers.SerializerMethodField()
    days_open = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    complaints = ComplaintSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description', 'status', 'priority',
            'incident_date', 'incident_location', 'assigned_detective',
            'detective_name', 'team_members', 'team_member_names',
            'reward_amount', 'is_paid', 'payment_date',
            'solved_date', 'closed_date', 'notes',
            'days_open', 'is_active', 'complaints', 'created_at', 'updated_at'
        ]

    def get_team_member_names(self, obj):
        return [member.get_full_name() for member in obj.team_members.all()]


class CaseApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    message = serializers.CharField(required=False, allow_blank=True)


class CaseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            'title', 'description', 'status', 'priority',
            'incident_date', 'incident_location', 'assigned_detective',
            'team_members', 'notes'
        ]


class CaseAssignDetectiveSerializer(serializers.Serializer):
    detective_id = serializers.IntegerField()

    def validate_detective_id(self, value):
        try:
            detective = UserProfile.objects.get(pk=value)
            if not detective.has_role('Detective'):
                raise serializers.ValidationError("User must be a detective")
            return value
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError("Detective not found")


class CaseStatisticsSerializer(serializers.Serializer):
    total_cases = serializers.IntegerField()
    solved_cases = serializers.IntegerField()
    active_cases = serializers.IntegerField()
    open_cases = serializers.IntegerField()
    under_investigation_cases = serializers.IntegerField()
    closed_cases = serializers.IntegerField()
    archived_cases = serializers.IntegerField()
    cases_by_priority = serializers.DictField()
    cases_by_status = serializers.DictField()