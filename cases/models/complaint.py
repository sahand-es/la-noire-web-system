from django.db import models
from django.conf import settings

from core.models import BaseModel


class ComplaintStatus(models.TextChoices):
    PENDING_CADET = 'PENDING_CADET', 'Pending Cadet Review'
    RETURNED_TO_COMPLAINANT = 'RETURNED_TO_COMPLAINANT', 'Returned to Complainant'
    PENDING_OFFICER = 'PENDING_OFFICER', 'Pending Officer Review'
    RETURNED_TO_CADET = 'RETURNED_TO_CADET', 'Returned to Cadet'
    APPROVED = 'APPROVED', 'Approved'
    VOIDED = 'VOIDED', 'Voided'


class Complaint(BaseModel):
    complainant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complaints'
    )
    case = models.ForeignKey(
        'Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='complaints'
    )
    status = models.CharField(
        max_length=30,
        choices=ComplaintStatus.choices,
        default=ComplaintStatus.PENDING_CADET
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    incident_date = models.DateTimeField()
    incident_location = models.CharField(max_length=255)
    rejection_count = models.PositiveSmallIntegerField(default=0)
    cadet_message = models.TextField(blank=True)
    officer_message = models.TextField(blank=True)
    reviewed_by_cadet = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cadet_reviewed_complaints'
    )
    reviewed_by_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='officer_reviewed_complaints'
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['complainant']),
        ]

    def __str__(self):
        return f"Complaint #{self.id} - {self.title}"

    @property
    def is_voided(self):
        return self.status == ComplaintStatus.VOIDED or self.rejection_count >= 3
