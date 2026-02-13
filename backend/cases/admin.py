from django.contrib import admin

from .models import (
    Case,
    Complaint,
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
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
