from django.utils import timezone
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from core.models import (
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
    EvidenceStatus,
    EvidenceType,
    UserProfile,
)


def base_evidence_fields():
    return [
        'id', 'case', 'title', 'evidence_number', 'evidence_type', 'description',
        'collected_by', 'collected_date', 'location', 'status', 'chain_of_custody',
        'notes', 'created_at', 'updated_at',
    ]


class WitnessTestimonyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WitnessTestimony
        fields = [
            'title', 'description', 'location', 'witness_name', 'witness_contact',
            'witness_address', 'testimony_date', 'testimony_text', 'is_credible',
            'credibility_score', 'audio_recording', 'video_recording', 'notes',
        ]

    def validate_testimony_date(self, value):
        if value and value > timezone.now():
            raise serializers.ValidationError('Testimony date cannot be in the future.')
        return value

    def validate_collected_date(self, value):
        if value and value > timezone.now():
            raise serializers.ValidationError('Collection date cannot be in the future.')
        return value

    def create(self, validated_data):
        case = self.context['case']
        user = self.context['request'].user
        validated_data.setdefault('title', validated_data.get('witness_name', '')[:255])
        validated_data['case'] = case
        validated_data['collected_by'] = user
        validated_data['collected_date'] = timezone.now()
        validated_data['evidence_type'] = EvidenceType.WITNESS
        validated_data['status'] = EvidenceStatus.COLLECTED
        return super().create(validated_data)


class WitnessTestimonySerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = WitnessTestimony
        fields = base_evidence_fields() + [
            'witness_name', 'witness_contact', 'witness_address', 'testimony_date',
            'testimony_text', 'is_credible', 'credibility_score', 'audio_recording',
            'video_recording', 'collected_by_name',
        ]
        read_only_fields = ['evidence_number', 'evidence_type', 'collected_by', 'collected_date']


class BiologicalEvidenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiologicalEvidence
        fields = [
            'title', 'description', 'location', 'sample_type', 'sample_quantity',
            'storage_location', 'lab_submitted', 'lab_submission_date', 'lab_results',
            'match_found', 'match_details', 'image', 'notes',
        ]

    def create(self, validated_data):
        case = self.context['case']
        user = self.context['request'].user
        validated_data.setdefault('title', validated_data.get('sample_type', '')[:255])
        validated_data['case'] = case
        validated_data['collected_by'] = user
        validated_data['collected_date'] = timezone.now()
        validated_data['evidence_type'] = EvidenceType.BIOLOGICAL
        validated_data['status'] = EvidenceStatus.COLLECTED
        return super().create(validated_data)


class BiologicalEvidenceSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True, allow_null=True)
    coroner_approved_by_name = serializers.CharField(source='coroner_approved_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = BiologicalEvidence
        fields = base_evidence_fields() + [
            'sample_type', 'sample_quantity', 'storage_location', 'lab_submitted',
            'lab_submission_date', 'lab_results', 'lab_result_date', 'match_found',
            'match_details', 'image', 'coroner_approved', 'coroner_approved_by',
            'coroner_approved_at', 'coroner_approved_by_name', 'collected_by_name',
        ]
        read_only_fields = ['evidence_number', 'evidence_type', 'collected_by', 'collected_date']


class CoronerApprovalSerializer(serializers.Serializer):
    approved = serializers.BooleanField()
    follow_up_result = serializers.CharField(required=False, allow_blank=True)


class VehicleEvidenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleEvidence
        fields = [
            'title', 'description', 'location', 'vehicle_type', 'make', 'model',
            'year', 'color', 'license_plate', 'vin_number', 'owner_name',
            'condition', 'impounded', 'impound_location', 'images', 'notes',
        ]

    def validate(self, data):
        has_plate = bool(data.get('license_plate') and str(data.get('license_plate', '')).strip())
        has_serial = bool(data.get('vin_number') and str(data.get('vin_number', '')).strip())
        if has_plate and has_serial:
            raise serializers.ValidationError(
                'License plate and serial number (VIN) cannot both be set.'
            )
        return data

    def create(self, validated_data):
        case = self.context['case']
        user = self.context['request'].user
        validated_data.setdefault('title', (validated_data.get('model') or validated_data.get('vehicle_type', ''))[:255])
        validated_data['case'] = case
        validated_data['collected_by'] = user
        validated_data['collected_date'] = timezone.now()
        validated_data['evidence_type'] = EvidenceType.VEHICLE
        validated_data['status'] = EvidenceStatus.COLLECTED
        return super().create(validated_data)


class VehicleEvidenceSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = VehicleEvidence
        fields = base_evidence_fields() + [
            'vehicle_type', 'make', 'model', 'year', 'color', 'license_plate',
            'vin_number', 'owner_name', 'condition', 'impounded', 'impound_location',
            'images', 'collected_by_name',
        ]
        read_only_fields = ['evidence_number', 'evidence_type', 'collected_by', 'collected_date']


class DocumentEvidenceCreateSerializer(serializers.ModelSerializer):
    document_attributes = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = DocumentEvidence
        fields = [
            'title', 'description', 'location', 'document_type', 'document_date',
            'owner_full_name', 'document_attributes', 'issuer', 'content_summary',
            'is_original', 'document_file', 'additional_images',
            'is_identification_document', 'notes',
        ]

    def create(self, validated_data):
        case = self.context['case']
        user = self.context['request'].user
        validated_data.setdefault('title', (validated_data.get('document_type') or 'Document')[:255])
        validated_data['case'] = case
        validated_data['collected_by'] = user
        validated_data['collected_date'] = timezone.now()
        validated_data['evidence_type'] = EvidenceType.DOCUMENT
        validated_data['status'] = EvidenceStatus.COLLECTED
        return super().create(validated_data)


class DocumentEvidenceSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = DocumentEvidence
        fields = base_evidence_fields() + [
            'document_type', 'document_date', 'owner_full_name', 'document_attributes',
            'issuer', 'content_summary', 'is_original', 'is_authenticated',
            'authentication_date', 'authenticated_by', 'document_file', 'additional_images',
            'is_identification_document', 'suspected_owner', 'collected_by_name',
        ]
        read_only_fields = ['evidence_number', 'evidence_type', 'collected_by', 'collected_date']


class OtherEvidenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherEvidence
        fields = [
            'title', 'description', 'location', 'item_name', 'item_category',
            'physical_description', 'condition', 'size_dimensions', 'weight',
            'material', 'serial_number', 'image', 'additional_files', 'notes',
        ]

    def create(self, validated_data):
        case = self.context['case']
        user = self.context['request'].user
        validated_data.setdefault('title', (validated_data.get('item_name') or 'Other item')[:255])
        validated_data['case'] = case
        validated_data['collected_by'] = user
        validated_data['collected_date'] = timezone.now()
        validated_data['evidence_type'] = EvidenceType.OTHER
        validated_data['status'] = EvidenceStatus.COLLECTED
        return super().create(validated_data)


class OtherEvidenceSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = OtherEvidence
        fields = base_evidence_fields() + [
            'item_name', 'item_category', 'physical_description', 'condition',
            'size_dimensions', 'weight', 'material', 'serial_number', 'image',
            'additional_files', 'collected_by_name',
        ]
        read_only_fields = ['evidence_number', 'evidence_type', 'collected_by', 'collected_date']
