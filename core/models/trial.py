from django.db import models
from django.conf import settings
from .base import BaseModel
from .case import Case


class TrialStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    POSTPONED = 'POSTPONED', 'Postponed'


class TrialVerdict(models.TextChoices):
    GUILTY = 'GUILTY', 'Guilty'
    INNOCENT = 'INNOCENT', 'Innocent'


class Trial(BaseModel):
    case = models.OneToOneField(
        Case,
        on_delete=models.CASCADE,
        related_name='trial',
        verbose_name="Case"
    )
    
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='presided_trials',
        verbose_name="Judge"
    )
    
    status = models.CharField(
        max_length=20,
        choices=TrialStatus.choices,
        default=TrialStatus.SCHEDULED,
        verbose_name="Trial Status"
    )
    
    scheduled_date = models.DateTimeField(
        verbose_name="Scheduled Date"
    )
    
    verdict = models.CharField(
        max_length=10,
        choices=TrialVerdict.choices,
        null=True,
        blank=True,
        verbose_name="Verdict"
    )
    
    punishment = models.TextField(
        blank=True,
        verbose_name="Punishment"
    )
    
    verdict_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Verdict Date"
    )
    
    judge_notes = models.TextField(
        blank=True,
        verbose_name="Judge Notes"
    )
    
    class Meta:
        verbose_name = "Trial"
        verbose_name_plural = "Trials"
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"Trial - {self.case.case_number}"

    @property
    def is_completed(self):
        return self.status == TrialStatus.COMPLETED and self.verdict is not None
