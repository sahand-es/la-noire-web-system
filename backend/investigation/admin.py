from django.contrib import admin
from .models import (
    EvidenceLink,
    DetectiveReport,
    Notification,
    Suspect,
    SuspectCaseLink,
    Interrogation,
    Trial,
)


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


@admin.register(SuspectCaseLink)
class SuspectCaseLinkAdmin(admin.ModelAdmin):
    pass


@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    pass


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    pass
