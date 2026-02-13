from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.crypto import get_random_string
from .base import BaseModel
from .user import UserProfile


class RewardStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PENDING_DETECTIVE = 'PENDING_DETECTIVE', 'Pending Detective Review'
    APPROVED = 'APPROVED', 'Approved'
    READY_FOR_PAYMENT = 'READY_FOR_PAYMENT', 'Ready for Payment'
    PAID = 'PAID', 'Paid'
    REJECTED = 'REJECTED', 'Rejected'
    CANCELLED = 'CANCELLED', 'Cancelled'


class RewardType(models.TextChoices):
    CASE_SOLVING = 'CASE_SOLVING', 'Case Solving'
    INFORMATION_PROVIDED = 'INFORMATION_PROVIDED', 'Information Provided'
    WITNESS_TESTIMONY = 'WITNESS_TESTIMONY', 'Witness Testimony'
    TEAM_BONUS = 'TEAM_BONUS', 'Team Bonus'
    SPECIAL_ACHIEVEMENT = 'SPECIAL_ACHIEVEMENT', 'Special Achievement'
    OVERTIME = 'OVERTIME', 'Overtime'
    OTHER = 'OTHER', 'Other'


class Reward(BaseModel):
    """
    Reward model for tracking payments to detectives, officers, and civilians.
    Civilians receive a unique code to claim their reward at police stations.
    """

    # Unique reward code for civilians to claim payment
    reward_code = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Unique Reward Code"
    )

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='rewards',
        null=True,
        blank=True,
        verbose_name="Related Case"
    )

    recipient = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='rewards_received',
        verbose_name="Recipient"
    )

    reward_type = models.CharField(
        max_length=30,
        choices=RewardType.choices,
        default=RewardType.CASE_SOLVING,
        verbose_name="Reward Type"
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Amount"
    )

    status = models.CharField(
        max_length=20,
        choices=RewardStatus.choices,
        default=RewardStatus.PENDING,
        verbose_name="Status"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )

    # Information submission details (for civilians)
    information_submitted = models.TextField(
        blank=True,
        verbose_name="Information Submitted",
        help_text="Details of information provided by civilian"
    )

    is_civilian_reward = models.BooleanField(
        default=False,
        verbose_name="Is Civilian Reward",
        help_text="True if reward is for a civilian informant"
    )

    # Officer initial review (valid -> send to detective; invalid -> reject)
    officer_reviewed_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards_officer_reviewed',
        verbose_name="Officer Reviewed By"
    )
    officer_reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Officer Reviewed At"
    )

    # Detective approval (approve -> user gets unique code; reject)
    approved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards_approved',
        verbose_name="Approved By"
    )

    approved_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approval Date"
    )

    # Payment tracking
    payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Payment Date"
    )

    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Payment Reference"
    )

    claimed_at_station = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Claimed at Station",
        help_text="Police station where civilian claimed reward"
    )

    claimed_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Claim Date"
    )

    verified_by_national_id = models.BooleanField(
        default=False,
        verbose_name="Verified by National ID",
        help_text="True if recipient verified identity with national ID"
    )

    # Rejection
    rejection_reason = models.TextField(
        blank=True,
        verbose_name="Rejection Reason"
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal Notes"
    )

    class Meta:
        verbose_name = "Reward"
        verbose_name_plural = "Rewards"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['case']),
            models.Index(fields=['reward_code']),
            models.Index(fields=['is_civilian_reward']),
        ]

    def __str__(self):
        return f"Reward {self.reward_code} - {self.recipient} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.reward_code:
            self.reward_code = self.generate_reward_code()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_reward_code():
        """Generate unique reward code in format: RWD-YYYYMMDD-XXXXX"""
        from django.utils import timezone
        date_str = timezone.now().strftime('%Y%m%d')
        random_str = get_random_string(5, allowed_chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        code = f"RWD-{date_str}-{random_str}"

        # Ensure uniqueness
        while Reward.objects.filter(reward_code=code).exists():
            random_str = get_random_string(5, allowed_chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            code = f"RWD-{date_str}-{random_str}"

        return code

    def clean(self):
        if self.status == RewardStatus.REJECTED and not self.rejection_reason:
            raise ValidationError({
                'rejection_reason': 'Rejection reason is required when status is rejected.'
            })

        if self.status == RewardStatus.PAID and not self.payment_date:
            raise ValidationError({
                'payment_date': 'Payment date is required when status is paid.'
            })

        if self.status in [RewardStatus.APPROVED, RewardStatus.READY_FOR_PAYMENT, RewardStatus.PAID]:
            if not self.approved_by:
                raise ValidationError({
                    'approved_by': 'Approver is required for approved/paid rewards.'
                })

        if self.is_civilian_reward and self.status == RewardStatus.PAID:
            if not self.verified_by_national_id:
                raise ValidationError({
                    'verified_by_national_id': 'National ID verification required for civilian reward payment.'
                })

    @property
    def is_paid(self):
        return self.status == RewardStatus.PAID

    @property
    def is_pending(self):
        return self.status == RewardStatus.PENDING

    @property
    def is_ready_for_claim(self):
        return self.status == RewardStatus.READY_FOR_PAYMENT and self.is_civilian_reward

    def approve(self, approver):
        """Approve reward for payment"""
        from django.utils import timezone

        if self.is_civilian_reward:
            self.status = RewardStatus.READY_FOR_PAYMENT
        else:
            self.status = RewardStatus.APPROVED

        self.approved_by = approver
        self.approved_date = timezone.now()
        self.save()

    def claim_by_civilian(self, station_name, verified=True):
        """
        Record civilian claiming reward at police station.
        Requires national ID verification as per PDF requirements.
        """
        from django.utils import timezone

        if not self.is_civilian_reward:
            raise ValidationError('Only civilian rewards can be claimed at stations.')

        if self.status != RewardStatus.READY_FOR_PAYMENT:
            raise ValidationError('Reward must be in READY_FOR_PAYMENT status.')

        if not verified:
            raise ValidationError('National ID verification is required.')

        self.claimed_at_station = station_name
        self.claimed_date = timezone.now()
        self.verified_by_national_id = verified
        self.status = RewardStatus.PAID
        self.payment_date = timezone.now()
        self.save()

    def mark_as_paid(self, payment_reference='', station_name=''):
        """Mark non-civilian reward as paid (direct payment to officers/detectives)"""
        from django.utils import timezone

        if self.is_civilian_reward:
            raise ValidationError('Use claim_by_civilian() method for civilian rewards.')

        if self.status not in [RewardStatus.APPROVED, RewardStatus.READY_FOR_PAYMENT]:
            raise ValidationError('Only approved rewards can be marked as paid.')

        self.status = RewardStatus.PAID
        self.payment_date = timezone.now()
        self.payment_reference = payment_reference
        if station_name:
            self.claimed_at_station = station_name
        self.save()

    def reject(self, reason):
        """Reject reward with reason"""
        self.status = RewardStatus.REJECTED
        self.rejection_reason = reason
        self.save()

    def cancel(self):
        """Cancel reward (only if not paid)"""
        if self.status == RewardStatus.PAID:
            raise ValidationError('Cannot cancel a paid reward.')

        self.status = RewardStatus.CANCELLED
        self.save()

    def get_claim_info(self):
        """Get information for civilian to claim reward"""
        if not self.is_civilian_reward:
            return None

        return {
            'reward_code': self.reward_code,
            'amount': str(self.amount),
            'status': self.get_status_display(),
            'can_claim': self.is_ready_for_claim,
            'recipient_name': self.recipient.get_full_name(),
            'recipient_national_id': self.recipient.national_id,
        }


class TeamReward(BaseModel):
    """
    Team reward for case resolution, distributed among team members.
    """

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='team_rewards',
        verbose_name="Related Case"
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Total Amount"
    )

    status = models.CharField(
        max_length=20,
        choices=RewardStatus.choices,
        default=RewardStatus.PENDING,
        verbose_name="Status"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Description"
    )

    approved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_rewards_approved',
        verbose_name="Approved By"
    )

    approved_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approval Date"
    )

    distribution_completed = models.BooleanField(
        default=False,
        verbose_name="Distribution Completed"
    )

    class Meta:
        verbose_name = "Team Reward"
        verbose_name_plural = "Team Rewards"
        ordering = ['-created_at']

    def __str__(self):
        return f"Team Reward for Case {self.case.case_number} - {self.total_amount}"

    def distribute_to_team(self):
        """
        Distribute team reward equally among all team members.
        Creates individual Reward records for each member.
        """
        if self.status != RewardStatus.APPROVED:
            raise ValidationError('Only approved team rewards can be distributed.')

        if self.distribution_completed:
            raise ValidationError('Team reward has already been distributed.')

        # Collect all team members
        team_members = list(self.case.team_members.all())
        if self.case.assigned_detective:
            team_members.append(self.case.assigned_detective)

        if not team_members:
            raise ValidationError('No team members to distribute reward to.')

        # Calculate per-member amount
        per_member_amount = self.total_amount / len(team_members)

        # Create individual rewards
        for member in team_members:
            Reward.objects.create(
                case=self.case,
                recipient=member,
                reward_type=RewardType.TEAM_BONUS,
                amount=per_member_amount,
                status=RewardStatus.APPROVED,
                description=f"Team reward distribution from case {self.case.case_number}",
                approved_by=self.approved_by,
                approved_date=self.approved_date,
                is_civilian_reward=False
            )

        self.distribution_completed = True
        self.status = RewardStatus.PAID
        self.save()
