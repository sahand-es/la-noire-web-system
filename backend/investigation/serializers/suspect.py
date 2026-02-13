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


class GuiltScoreSerializer(serializers.Serializer):
    guilt_score = serializers.IntegerField(min_value=1, max_value=10, help_text='Probability of guilt 1-10')


class CaptainOpinionSerializer(serializers.Serializer):
    opinion = serializers.CharField(allow_blank=False, help_text='Final opinion with statements, documents, and scores')


class ChiefApprovalSerializer(serializers.Serializer):
    approved = serializers.BooleanField(help_text='True to approve, False to reject captain\'s opinion')
