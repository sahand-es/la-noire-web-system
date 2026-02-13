"""
Tests for Bail and Fine Payment (PROJECT-en.md 324-326).

- Suspects of level 2 and 3 crimes can be released by paying bail/fine.
- Level 3 requires sergeant approval before release upon payment.
- Amount is determined by the sergeant.
- System connected to payment gateway (payment_reference stored).
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from cases.models import Case, CaseStatus, CasePriority
from investigation.models import (
    Suspect,
    SuspectStatus,
    SuspectCaseLink,
    BailFine,
)
from accounts.models import Role

User = get_user_model()


def make_user(username, **kwargs):
    h = abs(hash(username)) % 10**12
    defaults = dict(
        username=username,
        email=f'{username}@test.com',
        phone_number=f'09{h:013d}'[:15],
        national_id=f'{h:010d}'[:10],
        first_name='First',
        last_name='Last',
        password='TestPass123!',
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_detained_suspect(case, national_id='1111111111'):
    """Create suspect linked to case, status DETAINED (required for bail/fine release)."""
    suspect = Suspect.objects.create(
        first_name='Jane',
        last_name='Doe',
        national_id=national_id,
        status=SuspectStatus.DETAINED,
        detention_start_date=timezone.now(),
        detention_location='Station A',
    )
    SuspectCaseLink.objects.create(suspect=suspect, case=case)
    return suspect


class BailFineLevel2TestCase(TestCase):
    """Level 2 crimes: can be released by paying bail/fine without sergeant approval (PROJECT 325)."""

    def setUp(self):
        self.sergeant = make_user('sgt_bf')
        self.sergeant.roles.add(
            Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        )
        self.case = Case.objects.create(
            title='Level 2 case',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.LEVEL2,
        )
        self.suspect = make_detained_suspect(self.case, '2222222222')

    def test_sergeant_sets_bail_amount_level2(self):
        """Amount is determined by the sergeant (PROJECT 325)."""
        bf = BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('5000000'),
            amount_set_by=self.sergeant,
        )
        self.assertEqual(bf.bail_amount, Decimal('5000000'))
        self.assertEqual(bf.amount_set_by_id, self.sergeant.id)

    def test_level2_pay_bail_releases_suspect(self):
        """Level 2 suspect can be released by paying bail (no sergeant approval required)."""
        BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('3000000'),
            amount_set_by=self.sergeant,
        )
        self.suspect.pay_bail(Decimal('3000000'), payment_reference='gateway-txn-001')
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, SuspectStatus.RELEASED)
        self.assertIsNotNone(self.suspect.detention_end_date)

    def test_level2_pay_fine_releases_suspect(self):
        """Level 2 suspect can be released by paying fine."""
        BailFine.objects.create(
            suspect=self.suspect,
            fine_amount=Decimal('2000000'),
            amount_set_by=self.sergeant,
        )
        self.suspect.pay_fine(Decimal('2000000'), payment_reference='gateway-txn-002')
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, SuspectStatus.RELEASED)

    def test_payment_reference_stored_gateway_connection(self):
        """System connected to payment gateway: payment reference stored (PROJECT 326)."""
        BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('1000000'),
            amount_set_by=self.sergeant,
        )
        ref = 'pgw-abc123-def456'
        self.suspect.pay_bail(Decimal('1000000'), payment_reference=ref)
        self.suspect.bail_fine.refresh_from_db()
        self.assertEqual(self.suspect.bail_fine.bail_payment_reference, ref)


class BailFineLevel3TestCase(TestCase):
    """Level 3 crimes: sergeant approval required before release upon payment (PROJECT 325)."""

    def setUp(self):
        self.sergeant = make_user('sgt_bf3')
        self.sergeant.roles.add(
            Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        )
        self.case = Case.objects.create(
            title='Level 3 case',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.LEVEL3,
        )
        self.suspect = make_detained_suspect(self.case, '3333333333')

    def test_level3_without_sergeant_approval_payment_does_not_release(self):
        """Level 3: without sergeant approval, paying bail does not release (PROJECT 325)."""
        BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('1000000'),
            amount_set_by=self.sergeant,
            sergeant_approval=False,
        )
        self.suspect.pay_bail(Decimal('1000000'), payment_reference='txn-003')
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, SuspectStatus.DETAINED)

    def test_level3_with_sergeant_approval_payment_releases(self):
        """Level 3: with sergeant approval, paying bail releases suspect (PROJECT 325)."""
        BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('1500000'),
            amount_set_by=self.sergeant,
            sergeant_approval=True,
            approved_by=self.sergeant,
            approved_at=timezone.now(),
        )
        self.suspect.pay_bail(Decimal('1500000'), payment_reference='txn-004')
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, SuspectStatus.RELEASED)

    def test_level3_sergeant_sets_amount_and_approves(self):
        """Sergeant determines amount and for level 3 must approve before release."""
        bf = BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('500000'),
            fine_amount=Decimal('300000'),
            amount_set_by=self.sergeant,
        )
        self.assertFalse(bf.sergeant_approval)
        bf.sergeant_approval = True
        bf.approved_by = self.sergeant
        bf.approved_at = timezone.now()
        bf.save()
        self.suspect.pay_bail(Decimal('500000'), payment_reference='txn-005')
        self.suspect.refresh_from_db()
        self.assertEqual(self.suspect.status, SuspectStatus.RELEASED)


class BailFineValidationTestCase(TestCase):
    """Validation and edge cases."""

    def setUp(self):
        self.sergeant = make_user('sgt_bfv')
        self.sergeant.roles.add(
            Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        )
        self.case = Case.objects.create(
            title='Case',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.LEVEL2,
        )
        self.suspect = make_detained_suspect(self.case, '4444444444')

    def test_pay_bail_without_bail_fine_raises(self):
        """Pay bail when no bail/fine set for suspect raises ValidationError."""
        with self.assertRaises(ValidationError) as ctx:
            self.suspect.pay_bail(Decimal('1000'))
        self.assertIn('No bail/fine set', str(ctx.exception))

    def test_pay_bail_less_than_amount_raises(self):
        """Payment amount must be at least the set bail amount."""
        BailFine.objects.create(
            suspect=self.suspect,
            bail_amount=Decimal('10000'),
            amount_set_by=self.sergeant,
        )
        with self.assertRaises(ValidationError) as ctx:
            self.suspect.pay_bail(Decimal('5000'))
        self.assertIn('at least', str(ctx.exception))

    def test_pay_fine_less_than_amount_raises(self):
        """Payment amount must be at least the set fine amount."""
        BailFine.objects.create(
            suspect=self.suspect,
            fine_amount=Decimal('20000'),
            amount_set_by=self.sergeant,
        )
        with self.assertRaises(ValidationError):
            self.suspect.pay_fine(Decimal('10000'))

    def test_only_level2_or_level3_eligible(self):
        """Suspect linked only to LEVEL1 case is not released by paying (level 2/3 only)."""
        case_l1 = Case.objects.create(
            title='Level 1',
            description='D',
            incident_date=timezone.now(),
            incident_location='X',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.LEVEL1,
        )
        suspect_l1 = make_detained_suspect(case_l1, '5555555555')
        BailFine.objects.create(
            suspect=suspect_l1,
            bail_amount=Decimal('1000'),
            amount_set_by=self.sergeant,
        )
        suspect_l1.pay_bail(Decimal('1000'), payment_reference='txn-99')
        suspect_l1.refresh_from_db()
        self.assertEqual(suspect_l1.status, SuspectStatus.DETAINED)
        self.assertEqual(suspect_l1.highest_crime_level, 1)
