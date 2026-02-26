from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings

from core.models import BaseModel


class EvidenceLink(BaseModel):
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='evidence_links',
        verbose_name="Case"
    )
    from_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='investigation_evidence_links_from'
    )
    from_object_id = models.PositiveIntegerField()
    from_evidence = GenericForeignKey('from_content_type', 'from_object_id')
    to_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='investigation_evidence_links_to'
    )
    to_object_id = models.PositiveIntegerField()
    to_evidence = GenericForeignKey('to_content_type', 'to_object_id')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='detective_reports',
        verbose_name="Case"
    )
    detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
        settings.AUTH_USER_MODEL,
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
    detective_message = models.TextField(
        blank=True,
        verbose_name="Detective Message",
        help_text="Detective reasoning or notes submitted with the report",
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


class ReportedSuspect(BaseModel):
    """Evidence-based suspects reported in a DetectiveReport.

    This model links a DetectiveReport to an evidence object (generic FK)
    that the detective marks as a suspect during resolution. It avoids
    forcing creation of a `Suspect` object at report time.
    """
    report = models.ForeignKey(
        DetectiveReport,
        on_delete=models.CASCADE,
        related_name='reported_suspects',
        verbose_name='Detective Report'
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='reported_suspects'
    )
    object_id = models.PositiveIntegerField()

    class Meta:
        verbose_name = "Reported Suspect"
        verbose_name_plural = "Reported Suspects"
        ordering = ['-created_at']

    def __str__(self):
        return f"Reported suspect for report {self.report_id}: {self.content_type.model} #{self.object_id}"


class Notification(BaseModel):
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Case"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
