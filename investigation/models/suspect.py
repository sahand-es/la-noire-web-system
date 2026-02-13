from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings

from core.models import BaseModel


class SuspectStatus(models.TextChoices):
    IDENTIFIED = 'IDENTIFIED', 'Identified'
    UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'Under Investigation'
    DETAINED = 'DETAINED', 'Detained'
    RELEASED = 'RELEASED', 'Released'
    CHARGED = 'CHARGED', 'Charged'
    CONVICTED = 'CONVICTED', 'Convicted'
    ACQUITTED = 'ACQUITTED', 'Acquitted'
    FUGITIVE = 'FUGITIVE', 'Fugitive'


class Suspect(BaseModel):
    first_name = models.CharField(max_length=100, verbose_name="First Name")
    last_name = models.CharField(max_length=100, verbose_name="Last Name")
    national_id = models.CharField(
        max_length=10,
        unique=True,
        verbose_name="National ID",
        help_text="10-digit national identification number"
    )
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Date of Birth")
    phone_number = models.CharField(max_length=11, blank=True, verbose_name="Phone Number")
    address = models.TextField(blank=True, verbose_name="Address")
    photo = models.ImageField(
        upload_to='suspects/photos/',
        null=True,
        blank=True,
        verbose_name="Photo"
    )
    cases = models.ManyToManyField(
        'cases.Case',
        through='SuspectCaseLink',
        related_name='suspects',
        verbose_name="Related Cases"
    )
    status = models.CharField(
        max_length=30,
        choices=SuspectStatus.choices,
        default=SuspectStatus.IDENTIFIED,
        verbose_name="Status"
    )
    is_wanted = models.BooleanField(
        default=False,
        verbose_name="Is Wanted",
        help_text="True if suspect is actively wanted"
    )
    pursuit_start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Pursuit Start Date"
    )
    capture_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Capture Date"
    )
    detention_location = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Detention Location"
    )
    detention_start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Detention Start Date"
    )
    detention_end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Detention End Date"
    )
    bail_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Bail Amount"
    )
    bail_paid = models.BooleanField(default=False, verbose_name="Bail Paid")
    bail_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Bail Payment Date"
    )
    fine_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Fine Amount"
    )
    fine_paid = models.BooleanField(default=False, verbose_name="Fine Paid")
    fine_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fine Payment Date"
    )
    criminal_history = models.TextField(blank=True, verbose_name="Criminal History")
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta:
        verbose_name = "Suspect"
        verbose_name_plural = "Suspects"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['national_id']),
            models.Index(fields=['status']),
            models.Index(fields=['is_wanted']),
            models.Index(fields=['last_name', 'first_name']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.national_id}"

    def clean(self):
        if len(self.national_id) != 10:
            raise ValidationError({'national_id': 'National ID must be exactly 10 digits.'})
        if not self.national_id.isdigit():
            raise ValidationError({'national_id': 'National ID must contain only digits.'})
        if self.bail_paid and not self.bail_amount:
            raise ValidationError({'bail_amount': 'Bail amount is required when bail is marked as paid.'})
        if self.fine_paid and not self.fine_amount:
            raise ValidationError({'fine_amount': 'Fine amount is required when fine is marked as paid.'})

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def days_in_detention(self):
        if self.detention_start_date and self.status == SuspectStatus.DETAINED:
            from django.utils import timezone
            return (timezone.now() - self.detention_start_date).days
        return 0

    @property
    def is_detained(self):
        return self.status == SuspectStatus.DETAINED

    # Crime degree Di: 1-4 for level 3 to critical
    _PRIORITY_TO_DEGREE = {'LEVEL3': 1, 'LEVEL2': 2, 'LEVEL1': 3, 'CRITICAL': 4}

    @property
    def highest_crime_level(self):
        case_links = self.case_links.select_related('case').all()
        if not case_links:
            return None
        level_map = {'LEVEL3': 3, 'LEVEL2': 2, 'LEVEL1': 1, 'CRITICAL': 0}
        return min(
            (level_map.get(link.case.priority, 4) for link in case_links),
            default=None
        )

    def _pursuit_max_days_and_degree(self):
        """Return (max_days_Lj, max_degree_Di) for open cases under pursuit. (PROJECT 310-313)."""
        from django.utils import timezone
        case_links = self.case_links.select_related('case').filter(
            case__status__in=['OPEN', 'UNDER_INVESTIGATION']
        )
        if not case_links or not self.pursuit_start_date or not self.is_wanted:
            return 0, 0
        now = timezone.now()
        max_days = (now - self.pursuit_start_date).days
        max_degree = max(
            self._PRIORITY_TO_DEGREE.get(link.case.priority, 0)
            for link in case_links
        )
        return max_days, max_degree

    @property
    def days_under_pursuit(self):
        """Maximum days a crime in an open case has been under pursuit (Lj)."""
        max_days, _ = self._pursuit_max_days_and_degree()
        return max_days

    @property
    def is_intensive_pursuit(self):
        """True if under pursuit for more than one month (PROJECT 308)."""
        return self.is_wanted and self.days_under_pursuit >= 30

    def get_pursuit_priority(self):
        """Ranking: max(Lj) · max(Di) for Intensive Pursuit page (PROJECT Note 1)."""
        max_days, max_degree = self._pursuit_max_days_and_degree()
        return max_days * max_degree

    def get_reward_rials(self):
        """Reward for information (Rials): max(Lj) · max(Di) · 20,000,000 (PROJECT 315-316)."""
        return self.get_pursuit_priority() * 20_000_000

    def mark_as_wanted(self):
        from django.utils import timezone
        self.is_wanted = True
        self.status = SuspectStatus.FUGITIVE
        if not self.pursuit_start_date:
            self.pursuit_start_date = timezone.now()
        self.save()

    def mark_as_captured(self, detention_location=''):
        from django.utils import timezone
        self.is_wanted = False
        self.status = SuspectStatus.DETAINED
        self.capture_date = timezone.now()
        self.detention_start_date = timezone.now()
        self.detention_location = detention_location
        self.save()

    def release_from_detention(self):
        from django.utils import timezone
        if self.status != SuspectStatus.DETAINED:
            raise ValidationError('Only detained suspects can be released.')
        self.status = SuspectStatus.RELEASED
        self.detention_end_date = timezone.now()
        self.save()

    def pay_bail(self, amount, payment_reference=''):
        from django.utils import timezone
        if not self.bail_amount:
            raise ValidationError('No bail amount set.')
        if amount < self.bail_amount:
            raise ValidationError(f'Payment amount must be at least {self.bail_amount}')
        self.bail_paid = True
        self.bail_payment_date = timezone.now()
        self.save()

    def pay_fine(self, amount, payment_reference=''):
        from django.utils import timezone
        if not self.fine_amount:
            raise ValidationError('No fine amount set.')
        if amount < self.fine_amount:
            raise ValidationError(f'Payment amount must be at least {self.fine_amount}')
        self.fine_paid = True
        self.fine_payment_date = timezone.now()
        self.save()


class SuspectCaseLink(BaseModel):
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name='case_links',
        verbose_name="Suspect"
    )
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='suspect_links',
        verbose_name="Case"
    )
    detective_guilt_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Detective Guilt Score",
        help_text="Detective's assessment of guilt probability (1-10)"
    )
    sergeant_guilt_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Sergeant Guilt Score",
        help_text="Sergeant's assessment of guilt probability (1-10)"
    )
    detective_assessment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Detective Assessment Date"
    )
    sergeant_assessment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Sergeant Assessment Date"
    )
    role_in_crime = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Role in Crime",
        help_text="Suspected role in this specific crime"
    )
    identification_method = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Identification Method",
        help_text="How suspect was identified"
    )
    notes = models.TextField(blank=True, verbose_name="Case-Specific Notes")
    # Captain's final opinion (after detective and sergeant scores); required for chief approval on critical cases
    captain_opinion = models.TextField(
        blank=True,
        verbose_name="Captain Final Opinion",
        help_text="Captain's final opinion with statements, documents, and scores"
    )
    captain = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suspect_case_opinions',
        verbose_name="Captain"
    )
    captain_opinion_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Captain Opinion Date"
    )
    # For critical crimes: police chief must approve or reject captain's opinion
    chief_approved = models.BooleanField(
        null=True,
        blank=True,
        verbose_name="Chief Approved",
        help_text="True=approved, False=rejected; null=pending or not required (non-critical)"
    )
    chief = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suspect_case_chief_reviews',
        verbose_name="Police Chief"
    )
    chief_approval_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Chief Approval Date"
    )

    class Meta:
        verbose_name = "Suspect Case Link"
        verbose_name_plural = "Suspect Case Links"
        unique_together = [['suspect', 'case']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.suspect.full_name} - Case {self.case.case_number}"

    @property
    def average_guilt_score(self):
        scores = []
        if self.detective_guilt_score:
            scores.append(self.detective_guilt_score)
        if self.sergeant_guilt_score:
            scores.append(self.sergeant_guilt_score)
        return sum(scores) / len(scores) if scores else None

    @property
    def has_both_assessments(self):
        return self.detective_guilt_score is not None and self.sergeant_guilt_score is not None

    @property
    def is_critical_case(self):
        from cases.models import CasePriority
        return self.case.priority == CasePriority.CRITICAL

    @property
    def requires_chief_approval(self):
        """In critical crimes, police chief must approve or reject captain's opinion."""
        return self.is_critical_case and bool(self.captain_opinion.strip() if self.captain_opinion else False)


class InterrogationStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class Interrogation(BaseModel):
    suspect_case_link = models.ForeignKey(
        SuspectCaseLink,
        on_delete=models.CASCADE,
        related_name='interrogations',
        verbose_name="Suspect Case Link"
    )
    interrogation_number = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        verbose_name="Interrogation Number"
    )
    scheduled_date = models.DateTimeField(verbose_name="Scheduled Date")
    start_time = models.DateTimeField(null=True, blank=True, verbose_name="Start Time")
    end_time = models.DateTimeField(null=True, blank=True, verbose_name="End Time")
    location = models.CharField(max_length=200, verbose_name="Location")
    status = models.CharField(
        max_length=20,
        choices=InterrogationStatus.choices,
        default=InterrogationStatus.SCHEDULED,
        verbose_name="Status"
    )
    detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='interrogations_as_detective',
        verbose_name="Detective"
    )
    sergeant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='interrogations_as_sergeant',
        verbose_name="Sergeant"
    )
    detective_notes = models.TextField(blank=True, verbose_name="Detective Notes")
    detective_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Detective Guilt Rating",
        help_text="1 = least likely guilty, 10 = most likely guilty"
    )
    detective_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Detective Completed At"
    )
    sergeant_notes = models.TextField(blank=True, verbose_name="Sergeant Notes")
    sergeant_guilt_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name="Sergeant Guilt Rating",
        help_text="1 = least likely guilty, 10 = most likely guilty"
    )
    sergeant_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Sergeant Completed At"
    )
    audio_recording = models.FileField(
        upload_to='interrogations/audio/',
        null=True,
        blank=True,
        verbose_name="Audio Recording"
    )
    video_recording = models.FileField(
        upload_to='interrogations/video/',
        null=True,
        blank=True,
        verbose_name="Video Recording"
    )
    transcript = models.TextField(blank=True, verbose_name="Transcript")
    summary = models.TextField(blank=True, verbose_name="Summary")

    class Meta:
        verbose_name = "Interrogation"
        verbose_name_plural = "Interrogations"
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['suspect_case_link', '-scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['detective']),
            models.Index(fields=['sergeant']),
        ]

    def __str__(self):
        return f"Interrogation {self.interrogation_number} - {self.suspect_case_link.suspect.full_name}"

    def save(self, *args, **kwargs):
        if not self.interrogation_number:
            self.interrogation_number = self.generate_interrogation_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_interrogation_number():
        from django.utils import timezone
        date_str = timezone.now().strftime('%Y%m%d')
        last_interrogation = Interrogation.objects.filter(
            interrogation_number__startswith=f'INT-{date_str}'
        ).order_by('-interrogation_number').first()
        if last_interrogation:
            last_num = int(last_interrogation.interrogation_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        return f'INT-{date_str}-{new_num:04d}'

    def clean(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({'end_time': 'End time must be after start time.'})
        if self.status == InterrogationStatus.COMPLETED:
            if not self.detective_guilt_rating or not self.sergeant_guilt_rating:
                raise ValidationError(
                    'Both detective and sergeant must provide guilt ratings to complete interrogation.'
                )

    @property
    def duration_minutes(self):
        if self.start_time and self.end_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return None

    @property
    def is_completed(self):
        return self.status == InterrogationStatus.COMPLETED

    @property
    def average_guilt_rating(self):
        if self.detective_guilt_rating and self.sergeant_guilt_rating:
            return (self.detective_guilt_rating + self.sergeant_guilt_rating) / 2
        return None

    def start_interrogation(self):
        from django.utils import timezone
        if self.status != InterrogationStatus.SCHEDULED:
            raise ValidationError('Only scheduled interrogations can be started.')
        self.status = InterrogationStatus.IN_PROGRESS
        self.start_time = timezone.now()
        self.save()

    def submit_detective_assessment(self, guilt_rating, notes=''):
        from django.utils import timezone
        if not (1 <= guilt_rating <= 10):
            raise ValidationError('Guilt rating must be between 1 and 10.')
        self.detective_guilt_rating = guilt_rating
        self.detective_notes = notes
        self.detective_completed_at = timezone.now()
        self.suspect_case_link.detective_guilt_score = guilt_rating
        self.suspect_case_link.detective_assessment_date = timezone.now()
        self.suspect_case_link.save()
        if self.sergeant_guilt_rating:
            self.complete_interrogation()
        self.save()

    def submit_sergeant_assessment(self, guilt_rating, notes=''):
        from django.utils import timezone
        if not (1 <= guilt_rating <= 10):
            raise ValidationError('Guilt rating must be between 1 and 10.')
        self.sergeant_guilt_rating = guilt_rating
        self.sergeant_notes = notes
        self.sergeant_completed_at = timezone.now()
        self.suspect_case_link.sergeant_guilt_score = guilt_rating
        self.suspect_case_link.sergeant_assessment_date = timezone.now()
        self.suspect_case_link.save()
        if self.detective_guilt_rating:
            self.complete_interrogation()
        self.save()

    def complete_interrogation(self):
        from django.utils import timezone
        if not self.detective_guilt_rating or not self.sergeant_guilt_rating:
            raise ValidationError('Both assessments required to complete interrogation.')
        self.status = InterrogationStatus.COMPLETED
        if not self.end_time:
            self.end_time = timezone.now()
        self.save()

    def cancel_interrogation(self, reason=''):
        self.status = InterrogationStatus.CANCELLED
        if reason:
            self.summary = f"Cancelled: {reason}"
        self.save()
