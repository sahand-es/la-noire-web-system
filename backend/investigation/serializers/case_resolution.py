from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from investigation.models import EvidenceLink, DetectiveReport, DetectiveReportStatus, Notification
from cases.models import Case


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
    reported_suspects = serializers.SerializerMethodField()
    detective_message = serializers.CharField(read_only=True)

    class Meta:
        model = DetectiveReport
        fields = [
            'id', 'case', 'case_number', 'detective', 'detective_name', 'status',
            'sergeant', 'sergeant_name', 'sergeant_message', 'submitted_at',
            'reviewed_at', 'detective_message', 'created_at', 'updated_at', 'reported_suspects',
        ]
        read_only_fields = ['detective', 'submitted_at', 'sergeant', 'reviewed_at']

    def get_reported_suspects(self, obj):
        rows = []
        for rs in getattr(obj, 'reported_suspects').all():
            rows.append({
                'id': rs.id,
                'content_type': rs.content_type.model,
                'content_type_id': rs.content_type_id,
                'object_id': rs.object_id,
            })
        return rows


class DetectiveReportCreateSerializer(serializers.Serializer):
    """Create payload for detective report.

    Accepts `suspects`: list of {content_type_id, object_id} and optional `message`.
    """
    suspects = serializers.ListField(
        child=serializers.DictField(child=serializers.IntegerField()),
        required=False,
    )
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        suspects = data.get('suspects') or []
        for item in suspects:
            if 'content_type_id' not in item or 'object_id' not in item:
                raise serializers.ValidationError({'suspects': 'Each suspect must include content_type_id and object_id.'})
        return data


class SergeantReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'disagree'])
    message = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    type = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'case', 'case_number', 'recipient', 'content_type', 'object_id',
            'type', 'message', 'read_at', 'created_at',
        ]
        read_only_fields = ['recipient', 'read_at']

    def get_type(self, obj):
        if obj.content_type_id:
            return getattr(obj.content_type, 'model', None) or str(obj.content_type_id)
        return None
