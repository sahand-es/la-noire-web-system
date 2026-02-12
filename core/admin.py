from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

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
    EvidenceLink,
    DetectiveReport,
    Notification,
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
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    list_display = ['username', 'email', 'phone_number', 'national_id', 'get_full_name', 'is_verified', 'is_active']
    list_filter = ['is_verified', 'is_active', 'roles', 'created_at']
    search_fields = ['username', 'email', 'phone_number', 'national_id', 'first_name', 'last_name']
    filter_horizontal = ['roles', 'groups', 'user_permissions']

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('phone_number', 'national_id', 'roles', 'is_verified')}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Required Info', {
            'fields': ('email', 'phone_number', 'national_id', 'first_name', 'last_name')
        }),
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

