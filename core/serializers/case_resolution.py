from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from core.models import EvidenceLink, DetectiveReport, DetectiveReportStatus, Notification
from core.models import Case, UserProfile


class EvidenceLinkCreateSerializer(serializers.Serializer):
    from_content_type_id = serializers.IntegerField()
    from_object_id = serializers.IntegerField()
    to_content_type_id = serializers.IntegerField()
    to_object_id = serializers.IntegerField()

    def validate_from_content_type_id(self, value):
        try:
            ContentType.objects.get(pk=value)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError('Invalid content type.')
        return value

    def validate_to_content_type_id(self, value):
        try:
            ContentType.objects.get(pk=value)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError('Invalid content type.')
        return value


class EvidenceLinkSerializer(serializers.ModelSerializer):
    from_content_type_name = serializers.CharField(source='from_content_type.model', read_only=True)
    to_content_type_name = serializers.CharField(source='to_content_type.model', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = EvidenceLink
        fields = [
            'id', 'case', 'from_content_type', 'from_object_id', 'from_content_type_name',
            'to_content_type', 'to_object_id', 'to_content_type_name',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by']


class DetectiveReportSerializer(serializers.ModelSerializer):
    detective_name = serializers.CharField(source='detective.get_full_name', read_only=True)
    sergeant_name = serializers.CharField(source='sergeant.get_full_name', read_only=True, allow_null=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)

    class Meta:
        model = DetectiveReport
        fields = [
            'id', 'case', 'case_number', 'detective', 'detective_name', 'status',
            'sergeant', 'sergeant_name', 'sergeant_message', 'submitted_at',
            'reviewed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['detective', 'submitted_at', 'sergeant', 'reviewed_at']


class DetectiveReportCreateSerializer(serializers.Serializer):
    pass


class SergeantReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'disagree'])
    message = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'case', 'case_number', 'recipient', 'content_type', 'object_id',
            'message', 'read_at', 'created_at',
        ]
        read_only_fields = ['recipient', 'read_at']
