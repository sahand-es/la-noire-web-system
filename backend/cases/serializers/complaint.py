from django.contrib.auth import get_user_model
from rest_framework import serializers

from cases.models import Complaint, Case
from cases.models.complaint import ComplaintStatus
from cases.models.case import CaseStatus

User = get_user_model()



class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'title',
            'description',
            'incident_date',
            'incident_location'
        ]

    def create(self, validated_data):
        # Create case first
        case = Case.objects.create(
            title=validated_data['title'],
            description=validated_data['description'],
            incident_date=validated_data['incident_date'],
            incident_location=validated_data['incident_location'],
            status=CaseStatus.OPEN
        )
        
        # Link case to complaint
        validated_data['complainant'] = self.context['request'].user
        validated_data['status'] = ComplaintStatus.PENDING_CADET
        validated_data['case'] = case
        return super().create(validated_data)


class ComplaintSerializer(serializers.ModelSerializer):
    complainant_name = serializers.CharField(source='complainant.get_full_name', read_only=True)
    cadet_name = serializers.CharField(source='reviewed_by_cadet.get_full_name', read_only=True)
    officer_name = serializers.CharField(source='reviewed_by_officer.get_full_name', read_only=True)
    is_voided = serializers.BooleanField(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id',
            'complainant',
            'complainant_name',
            'case',
            'status',
            'title',
            'description',
            'incident_date',
            'incident_location',
            'rejection_count',
            'cadet_message',
            'officer_message',
            'reviewed_by_cadet',
            'cadet_name',
            'reviewed_by_officer',
            'officer_name',
            'is_voided',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'complainant',
            'case',
            'status',
            'rejection_count',
            'reviewed_by_cadet',
            'reviewed_by_officer',
            'created_at',
            'updated_at'
        ]


class CadetReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['action'] == 'reject' and not data.get('message'):
            raise serializers.ValidationError({
                'message': 'Message is required when rejecting a complaint'
            })
        return data


class OfficerReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['action'] == 'reject' and not data.get('message'):
            raise serializers.ValidationError({
                'message': 'Message is required when rejecting a complaint'
            })
        return data


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'title',
            'description',
            'incident_date',
            'incident_location'
        ]

    def validate(self, data):
        complaint = self.instance
        if complaint.status != ComplaintStatus.RETURNED_TO_COMPLAINANT:
            raise serializers.ValidationError(
                'Can only update complaints that have been returned for correction'
            )
        return data

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.status = ComplaintStatus.PENDING_CADET
        instance.save(update_fields=['status'])
        return instance