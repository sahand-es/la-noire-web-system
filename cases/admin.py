from django.contrib import admin

from .models import (
    Case,
    Complaint,
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
    EvidenceLink,
    DetectiveReport,
    Notification,
)


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    pass


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    pass


@admin.register(WitnessTestimony)
class WitnessTestimonyAdmin(admin.ModelAdmin):
    pass


@admin.register(BiologicalEvidence)
class BiologicalEvidenceAdmin(admin.ModelAdmin):
    pass


@admin.register(VehicleEvidence)
class VehicleEvidenceAdmin(admin.ModelAdmin):
    pass


@admin.register(DocumentEvidence)
class DocumentEvidenceAdmin(admin.ModelAdmin):
    pass


@admin.register(OtherEvidence)
class OtherEvidenceAdmin(admin.ModelAdmin):
    pass


@admin.register(EvidenceLink)
class EvidenceLinkAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'from_object_id', 'to_object_id', 'created_by', 'created_at']
    list_filter = ['case', 'created_at']


@admin.register(DetectiveReport)
class DetectiveReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'detective', 'status', 'sergeant', 'submitted_at']
    list_filter = ['status', 'submitted_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'recipient', 'read_at', 'created_at']
    list_filter = ['read_at', 'created_at']
