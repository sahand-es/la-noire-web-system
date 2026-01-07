from django.contrib import admin
from .models import (
    Role,
    UserProfile,
    Case,
    Complaint,
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
    Suspect,
    Interrogation,
    Trial,
    Reward,
    Document,
    Payment,
    Bail,
)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    pass


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    pass


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


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    pass


@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    pass


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    pass


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    pass


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    pass


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    pass


@admin.register(Bail)
class BailAdmin(admin.ModelAdmin):
    pass

