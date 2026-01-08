from django.db import models
from django.core.validators import MinValueValidator
from .base import BaseModel
from .user import UserProfile


class CaseStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'Under Investigation'
    SOLVED = 'SOLVED', 'Solved'
    CLOSED = 'CLOSED', 'Closed'
    ARCHIVED = 'ARCHIVED', 'Archived'


class CasePriority(models.TextChoices):
    LEVEL3 = 'LEVEL3', 'Level3'
    LEVEL2 = 'LEVEL2', 'Level2'
    LEVEL1 = 'LEVEL1', 'Level1'
    CRITICAL = 'CRITICAL', 'Critical'


class Case(BaseModel):
    case_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Case Number"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Case Title"
    )
    description = models.TextField(
        verbose_name="Case Description"
    )
    status = models.CharField(
        max_length=20,
        choices=CaseStatus.choices,
        default=CaseStatus.OPEN,
        verbose_name="Status"
    )
    priority = models.CharField(
        max_length=10,
        choices=CasePriority.choices,
        default=CasePriority.LEVEL3,
        verbose_name="Priority"
    )

    incident_date = models.DateTimeField(
        verbose_name="Incident Date"
    )
    incident_location = models.CharField(
        max_length=500,
        verbose_name="Incident Location"
    )

    assigned_detective = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cases',
        # limit_choices_to={'roles__name': 'detective'},
        verbose_name="Assigned Detective"
    )

    team_members = models.ManyToManyField(
        UserProfile,
        blank=True,
        related_name='team_cases',
        verbose_name="Team Members"
    )

    reward_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Reward Amount"
    )

    is_paid = models.BooleanField(
        default=False,
        verbose_name="Reward Paid"
    )

    payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Payment Date"
    )

    solved_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Solved Date"
    )

    closed_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Closed Date"
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
    )

    class Meta:
        verbose_name = "Case"
        verbose_name_plural = "Cases"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case_number']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.title}"

    @property
    def is_active(self):
        return self.status in [CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION]

    @property
    def days_open(self):
        from django.utils import timezone
        if self.status == CaseStatus.SOLVED and self.solved_date:
            return (self.solved_date - self.created_at).days
        elif self.status == CaseStatus.CLOSED and self.closed_date:
            return (self.closed_date - self.created_at).days
        return (timezone.now() - self.created_at).days

    def save(self, *args, **kwargs):
        if not self.case_number:
            self.case_number = self.generate_case_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_case_number():
        from django.utils import timezone
        import random
        year = timezone.now().year
        random_num = random.randint(1000, 9999)
        count = Case.objects.filter(
            created_at__year=year
        ).count() + 1
        return f"C-{year}-{count:04d}-{random_num}"
