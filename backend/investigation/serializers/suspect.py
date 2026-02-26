from rest_framework import serializers
from django.utils import timezone

from investigation.models import SuspectCaseLink, Suspect


class IntensivePursuitSerializer(serializers.ModelSerializer):
    """Suspect on Intensive Pursuit page: photo and details, ranking, reward (PROJECT 307-316)."""
    full_name = serializers.CharField(read_only=True)
    ranking = serializers.SerializerMethodField()
    reward_rials = serializers.SerializerMethodField()
    days_under_pursuit = serializers.IntegerField(read_only=True)

    class Meta:
        model = Suspect
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'national_id',
            'photo', 'date_of_birth', 'phone_number', 'address',
            'status', 'pursuit_start_date', 'days_under_pursuit',
            'ranking', 'reward_rials', 'created_at',
        ]

    def get_ranking(self, obj):
        return obj.get_pursuit_priority()

    def get_reward_rials(self, obj):
        return obj.get_reward_rials()


class SuspectCaseLinkSerializer(serializers.ModelSerializer):
    suspect_name = serializers.CharField(source='suspect.full_name', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    average_guilt_score = serializers.FloatField(read_only=True)
    has_both_assessments = serializers.BooleanField(read_only=True)
    captain_name = serializers.CharField(source='captain.get_full_name', read_only=True, allow_null=True)
    chief_name = serializers.CharField(source='chief.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = SuspectCaseLink
        fields = [
            'id', 'suspect', 'suspect_name', 'case', 'case_number',
            'detective_guilt_score', 'sergeant_guilt_score',
            'detective_assessment_date', 'sergeant_assessment_date',
            'average_guilt_score', 'has_both_assessments',
            'captain_opinion', 'captain', 'captain_name', 'captain_opinion_at',
            'chief_approved', 'chief', 'chief_name', 'chief_approval_at',
            'role_in_crime', 'identification_method', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['detective_assessment_date', 'sergeant_assessment_date', 'captain_opinion_at', 'chief_approval_at']


class SuspectCaseLinkCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    national_id = serializers.CharField(max_length=10)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    phone_number = serializers.CharField(max_length=11, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    criminal_history = serializers.CharField(required=False, allow_blank=True)
    suspect_notes = serializers.CharField(required=False, allow_blank=True)
    role_in_crime = serializers.CharField(max_length=200, required=False, allow_blank=True)
    identification_method = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_national_id(self, value):
        digits = ''.join(ch for ch in str(value) if ch.isdigit())
        if len(digits) != 10:
            raise serializers.ValidationError('National ID must be exactly 10 digits.')
        return digits

    def create(self, validated_data):
        case = self.context['case']

        suspect_defaults = {
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'date_of_birth': validated_data.get('date_of_birth'),
            'phone_number': validated_data.get('phone_number', ''),
            'address': validated_data.get('address', ''),
            'criminal_history': validated_data.get('criminal_history', ''),
            'notes': validated_data.get('suspect_notes', ''),
        }

        suspect, _ = Suspect.objects.get_or_create(
            national_id=validated_data['national_id'],
            defaults=suspect_defaults,
        )

        link, _ = SuspectCaseLink.objects.get_or_create(
            case=case,
            suspect=suspect,
            defaults={
                'role_in_crime': validated_data.get('role_in_crime', ''),
                'identification_method': validated_data.get('identification_method', ''),
                'notes': validated_data.get('notes', ''),
            },
        )
        return link


class GuiltScoreSerializer(serializers.Serializer):
    guilt_score = serializers.IntegerField(min_value=1, max_value=10, help_text='Probability of guilt 1-10')


class CaptainOpinionSerializer(serializers.Serializer):
    opinion = serializers.CharField(allow_blank=False, help_text='Final opinion with statements, documents, and scores')


class ChiefApprovalSerializer(serializers.Serializer):
    approved = serializers.BooleanField(help_text='True to approve, False to reject captain\'s opinion')
