
from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone

from core.models import BaseModel


class BailFine(BaseModel):
    """
    Bail/fine record for a suspect. Sergeant sets amount; for level 3 crimes
    sergeant must approve before the suspect can be released after payment.
    """
    suspect = models.OneToOneField(
        'Suspect',
        on_delete=models.CASCADE,
        related_name='bail_fine',
        verbose_name="Suspect",
    )
    bail_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Bail Amount",
    )
    bail_paid = models.BooleanField(default=False, verbose_name="Bail Paid")
    bail_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Bail Payment Date",
    )
    bail_payment_reference = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Bail Payment Reference",
        help_text="Payment gateway transaction reference",
    )
    fine_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Fine Amount",
    )
    fine_paid = models.BooleanField(default=False, verbose_name="Fine Paid")
    fine_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fine Payment Date",
    )
    fine_payment_reference = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Fine Payment Reference",
        help_text="Payment gateway transaction reference",
    )
    # For level 3: sergeant must approve before suspect can be released upon payment
    sergeant_approval = models.BooleanField(
        default=False,
        verbose_name="Sergeant Approval",
        help_text="Required for level 3 crimes before release upon payment",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bail_fine_approvals',
        verbose_name="Approved By",
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Approval Date",
    )
    amount_set_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bail_fine_amounts_set',
        verbose_name="Amount Set By",
    )

    class Meta:
        verbose_name = "Bail / Fine"
        verbose_name_plural = "Bail / Fine"

    def __str__(self):
        return f"Bail/Fine for {self.suspect}"

    def clean(self):
        if self.bail_paid and not self.bail_amount:
            raise ValidationError({'bail_amount': 'Bail amount required when bail is paid.'})
        if self.fine_paid and not self.fine_amount:
            raise ValidationError({'fine_amount': 'Fine amount required when fine is paid.'})

    def record_bail_payment(self, amount, payment_reference=''):
        if not self.bail_amount:
            raise ValidationError('No bail amount set.')
        if amount < self.bail_amount:
            raise ValidationError(f'Payment amount must be at least {self.bail_amount}')
        self.bail_paid = True
        self.bail_payment_date = timezone.now()
        self.bail_payment_reference = payment_reference or self.bail_payment_reference
        self.save()
        self.suspect._check_bail_fine_release()

    def record_fine_payment(self, amount, payment_reference=''):
        if not self.fine_amount:
            raise ValidationError('No fine amount set.')
        if amount < self.fine_amount:
            raise ValidationError(f'Payment amount must be at least {self.fine_amount}')
        self.fine_paid = True
        self.fine_payment_date = timezone.now()
        self.fine_payment_reference = payment_reference or self.fine_payment_reference
        self.save()
        self.suspect._check_bail_fine_release()
