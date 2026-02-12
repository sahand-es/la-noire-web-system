from rest_framework import serializers
from django.conf import settings

from core.models import Reward, RewardStatus, RewardType, Case


class RewardCreateSerializer(serializers.ModelSerializer):
    """Regular user submits information about a case or suspect."""

    class Meta:
        model = Reward
        fields = [
            'case',
            'information_submitted',
            'description',
        ]

    def validate_case(self, value):
        if not value:
            raise serializers.ValidationError('Case is required.')
        return value

    def create(self, validated_data):
        request = self.context['request']
        validated_data['recipient'] = request.user
        validated_data['reward_type'] = RewardType.INFORMATION_PROVIDED
        validated_data['is_civilian_reward'] = True
        validated_data['status'] = RewardStatus.PENDING
        validated_data['amount'] = 0
        return super().create(validated_data)


class RewardListSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True, allow_null=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    recipient_national_id = serializers.CharField(source='recipient.national_id', read_only=True)

    class Meta:
        model = Reward
        fields = [
            'id',
            'reward_code',
            'case',
            'case_number',
            'recipient',
            'recipient_name',
            'recipient_national_id',
            'reward_type',
            'amount',
            'status',
            'information_submitted',
            'is_civilian_reward',
            'created_at',
        ]


class RewardDetailSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True, allow_null=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    recipient_national_id = serializers.CharField(source='recipient.national_id', read_only=True)
    officer_reviewed_by_name = serializers.CharField(
        source='officer_reviewed_by.get_full_name', read_only=True, allow_null=True
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', read_only=True, allow_null=True
    )

    class Meta:
        model = Reward
        fields = [
            'id',
            'reward_code',
            'case',
            'case_number',
            'recipient',
            'recipient_name',
            'recipient_national_id',
            'reward_type',
            'amount',
            'status',
            'description',
            'information_submitted',
            'is_civilian_reward',
            'officer_reviewed_by',
            'officer_reviewed_by_name',
            'officer_reviewed_at',
            'approved_by',
            'approved_by_name',
            'approved_date',
            'rejection_reason',
            'payment_date',
            'payment_reference',
            'claimed_at_station',
            'claimed_date',
            'verified_by_national_id',
            'notes',
            'created_at',
            'updated_at',
        ]


class RewardLookupSerializer(serializers.ModelSerializer):
    """Minimal fields for police lookup by national_id + reward_code."""
    case_number = serializers.CharField(source='case.case_number', read_only=True, allow_null=True)
    recipient_national_id = serializers.CharField(source='recipient.national_id', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready_for_claim = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reward
        fields = [
            'id',
            'reward_code',
            'recipient_national_id',
            'recipient_name',
            'amount',
            'status',
            'status_display',
            'case',
            'case_number',
            'information_submitted',
            'is_ready_for_claim',
            'created_at',
        ]


class OfficerReviewSerializer(serializers.Serializer):
    """Officer: reject (invalid) or send to detective (valid)."""
    action = serializers.ChoiceField(choices=['reject', 'approve'])
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['action'] == 'reject' and not data.get('message'):
            raise serializers.ValidationError({'message': 'Message required when rejecting.'})
        return data


class DetectiveReviewSerializer(serializers.Serializer):
    """Detective: approve (user gets unique code) or reject."""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    message = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0
    )

    def validate(self, data):
        if data['action'] == 'reject' and not data.get('message'):
            raise serializers.ValidationError({'message': 'Message required when rejecting.'})
        return data
