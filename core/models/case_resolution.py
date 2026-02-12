from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .base import BaseModel
from .case import Case
from .user import UserProfile


class EvidenceLink(BaseModel):
    """
    Links two evidence items on the detective board (red line).
    Uses ContentType to reference any evidence type.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='evidence_links',
        verbose_name="Case"
    )
    from_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='evidence_links_from'
    )
    from_object_id = models.PositiveIntegerField()
    from_evidence = GenericForeignKey('from_content_type', 'from_object_id')
    to_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='evidence_links_to'
    )
    to_object_id = models.PositiveIntegerField()
    to_evidence = GenericForeignKey('to_content_type', 'to_object_id')
    created_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_evidence_links',
        verbose_name="Created By"
    )

    class Meta:
        verbose_name = "Evidence Link"
        verbose_name_plural = "Evidence Links"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case']),
            models.Index(fields=['from_content_type', 'from_object_id']),
            models.Index(fields=['to_content_type', 'to_object_id']),
        ]

    def __str__(self):
        return f"Link on case {self.case_id}: {self.from_object_id} -> {self.to_object_id}"


class DetectiveReportStatus(models.TextChoices):
    PENDING_SERGEANT = 'PENDING_SERGEANT', 'Pending Sergeant Review'
    APPROVED = 'APPROVED', 'Approved'
    DISAGREEMENT = 'DISAGREEMENT', 'Disagreement'


class DetectiveReport(BaseModel):
    """
    Detective submits main suspects to sergeant; sergeant approves or disagrees.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='detective_reports',
        verbose_name="Case"
    )
    detective = models.ForeignKey(
        UserProfile,
        on_delete=models.PROTECT,
        related_name='submitted_detective_reports',
        verbose_name="Detective"
    )
    status = models.CharField(
        max_length=20,
        choices=DetectiveReportStatus.choices,
        default=DetectiveReportStatus.PENDING_SERGEANT,
        verbose_name="Status"
    )
    sergeant = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_detective_reports',
        verbose_name="Sergeant"
    )
    sergeant_message = models.TextField(
        blank=True,
        verbose_name="Sergeant Message"
    )
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Submitted At"
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Reviewed At"
    )

    class Meta:
        verbose_name = "Detective Report"
        verbose_name_plural = "Detective Reports"
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['case']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Report for {self.case.case_number} by {self.detective} - {self.status}"


class Notification(BaseModel):
    """
    Notifies detective when new evidence/documents are added to their case.
    """
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Case"
    )
    recipient = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Recipient"
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='+'
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    message = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Message"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Read At"
    )

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient']),
            models.Index(fields=['case']),
            models.Index(fields=['read_at']),
        ]

    def __str__(self):
        return f"Notification for {self.recipient} - Case {self.case_id}"
