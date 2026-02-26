"""
E2E tests for Reward flow 

- Regular user registers information about a case or suspect.
- Police officer does initial review: if invalid, rejected; if valid, sent to detective.
- If detective approves, user is notified and given unique code to present at police department.
- All police ranks can see reward amount and related info by entering national ID + unique code.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Case, CaseStatus
from investigation.models import Notification
from rewards.models import Reward, RewardStatus
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


class RewardFlowTestCase(TestCase):
    """E2E: user submit -> officer review -> detective approve -> lookup by national_id + code."""

    def setUp(self):
        self.client = APIClient()
        self.rewards_url = '/api/v1/rewards/'

        self.role_officer = Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0]
        self.role_detective = Role.objects.get_or_create(name='Detective', defaults={'is_active': True})[0]
        self.role_cadet = Role.objects.get_or_create(name='Cadet', defaults={'is_active': True})[0]
        self.role_base = Role.objects.get_or_create(name='Base user', defaults={'is_active': True})[0]

        self.civilian = make_user('civilian_reward')
        self.civilian.roles.add(self.role_base)
        self.officer = make_user('officer_reward')
        self.officer.roles.add(self.role_officer)
        self.detective = make_user('detective_reward')
        self.detective.roles.add(self.role_detective)
        self.cadet = make_user('cadet_reward')
        self.cadet.roles.add(self.role_cadet)

        self.case = Case.objects.create(
            title='Case for reward',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            assigned_detective=self.detective,
        )

    def test_regular_user_registers_information(self):
        """A regular user enters the system and registers information about a case (PROJECT 319)."""
        self.client.force_authenticate(user=self.civilian)
        resp = self.client.post(
            self.rewards_url,
            {
                'case': self.case.id,
                'information_submitted': 'I saw the suspect near the store on Tuesday.',
                'description': 'Tip about robbery case.',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reward.objects.filter(recipient=self.civilian).count(), 1)
        reward = Reward.objects.get(recipient=self.civilian)
        self.assertEqual(reward.status, RewardStatus.PENDING)
        self.assertTrue(reward.is_civilian_reward)
        self.assertIn('Pending police officer review', resp.data.get('message', ''))

    def test_officer_rejects_invalid_submission(self):
        """Police officer does initial review: if invalid, it is rejected (PROJECT 320)."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Nothing useful',
            status=RewardStatus.PENDING,
            is_civilian_reward=True,
            amount=0,
        )
        self.client.force_authenticate(user=self.officer)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/officer-reviews/',
            {'action': 'reject', 'message': 'Information could not be verified.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reward.refresh_from_db()
        self.assertEqual(reward.status, RewardStatus.REJECTED)
        self.assertIn('rejected', resp.data.get('message', '').lower())

    def test_officer_approves_sends_to_detective(self):
        """If valid, sent to the detective responsible for the case (PROJECT 320)."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Useful tip',
            status=RewardStatus.PENDING,
            is_civilian_reward=True,
            amount=0,
        )
        self.client.force_authenticate(user=self.officer)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/officer-reviews/',
            {'action': 'approve', 'message': 'Sent to detective.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reward.refresh_from_db()
        self.assertEqual(reward.status, RewardStatus.PENDING_DETECTIVE)
        self.assertIn('detective', resp.data.get('message', '').lower())

    def test_officer_approve_fails_when_case_has_no_assigned_detective(self):
        """Officer approval must not move tip to detective queue if no detective is assigned."""
        case_without_detective = Case.objects.create(
            title='Case without detective',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Somewhere',
            status=CaseStatus.UNDER_INVESTIGATION,
        )
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=case_without_detective,
            information_submitted='Useful tip',
            status=RewardStatus.PENDING,
            is_civilian_reward=True,
            amount=0,
        )

        self.client.force_authenticate(user=self.officer)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/officer-reviews/',
            {'action': 'approve', 'message': 'Send to detective.'},
            format='json',
        )

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no assigned detective', resp.data.get('message', '').lower())
        reward.refresh_from_db()
        self.assertEqual(reward.status, RewardStatus.PENDING)

    def test_detective_approves_user_gets_unique_code_and_notified(self):
        """If detective approves, user is notified and given unique code to present at police dept (PROJECT 321)."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Key evidence tip',
            status=RewardStatus.PENDING_DETECTIVE,
            is_civilian_reward=True,
            amount=0,
        )
        self.client.force_authenticate(user=self.detective)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/detective-reviews/',
            {'action': 'approve', 'amount': 5000000},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reward.refresh_from_db()
        self.assertEqual(reward.status, RewardStatus.READY_FOR_PAYMENT)
        self.assertTrue(reward.reward_code)
        self.assertIn('reward_code', resp.data)
        self.assertIn('unique code', resp.data.get('message', '').lower())
        self.assertEqual(
            Notification.objects.filter(recipient=self.civilian).count(),
            1,
            'User must be notified when detective approves.',
        )
        notif = Notification.objects.get(recipient=self.civilian)
        self.assertIn(reward.reward_code, notif.message)

    def test_lookup_by_national_id_and_unique_code(self):
        """All police ranks can see reward amount and related info by entering national ID + unique code (PROJECT 322)."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Tip',
            status=RewardStatus.READY_FOR_PAYMENT,
            is_civilian_reward=True,
            amount=10000000,
        )
        self.client.force_authenticate(user=self.officer)
        resp = self.client.get(
            f'{self.rewards_url}lookups/',
            {'national_id': self.civilian.national_id, 'reward_code': reward.reward_code},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('data', resp.data)
        self.assertEqual(float(data['amount']), float(reward.amount))
        self.assertEqual(data['recipient_national_id'], self.civilian.national_id)
        self.assertEqual(data['reward_code'], reward.reward_code)
        self.assertTrue(data['is_ready_for_claim'])

        self.client.force_authenticate(user=self.cadet)
        resp2 = self.client.get(
            f'{self.rewards_url}lookups/',
            {'national_id': self.civilian.national_id, 'reward_code': reward.reward_code},
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK, 'Cadet (police rank) can lookup.')

    def test_lookup_requires_national_id_and_code(self):
        """Lookup returns error when national_id or reward_code missing."""
        self.client.force_authenticate(user=self.officer)
        resp = self.client.get(f'{self.rewards_url}lookups/', {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('national_id', resp.data.get('message', '').lower())

    def test_police_rank_can_claim_ready_reward_payment(self):
        """Police rank can mark READY_FOR_PAYMENT reward as paid when citizen claims at station."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Tip',
            status=RewardStatus.READY_FOR_PAYMENT,
            is_civilian_reward=True,
            amount=7500000,
            approved_by=self.detective,
            approved_date=timezone.now(),
        )

        self.client.force_authenticate(user=self.cadet)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/claim-payment/',
            {'station_name': 'Central Station', 'payment_reference': 'PAY-001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        reward.refresh_from_db()
        self.assertEqual(reward.status, RewardStatus.PAID)
        self.assertEqual(reward.claimed_at_station, 'Central Station')
        self.assertTrue(reward.verified_by_national_id)
        self.assertEqual(reward.payment_reference, 'PAY-001')

    def test_regular_user_cannot_claim_payment(self):
        """Regular user cannot perform station payment claim action."""
        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Tip',
            status=RewardStatus.READY_FOR_PAYMENT,
            is_civilian_reward=True,
            amount=7500000,
            approved_by=self.detective,
            approved_date=timezone.now(),
        )

        self.client.force_authenticate(user=self.civilian)
        resp = self.client.post(
            f'{self.rewards_url}{reward.id}/claim-payment/',
            {'station_name': 'Central Station'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_detective_queue_visible_for_detective_with_officer_role(self):
        """Detective queue should still work even when user also has an officer role."""
        self.detective.roles.add(self.role_officer)

        reward = Reward.objects.create(
            recipient=self.civilian,
            case=self.case,
            information_submitted='Tip for detective queue',
            status=RewardStatus.PENDING_DETECTIVE,
            is_civilian_reward=True,
            amount=0,
        )

        self.client.force_authenticate(user=self.detective)
        resp = self.client.get(
            self.rewards_url,
            {'status': RewardStatus.PENDING_DETECTIVE},
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('data', [])
        ids = [item['id'] for item in data]
        self.assertIn(reward.id, ids)
