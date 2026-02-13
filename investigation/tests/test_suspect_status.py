"""
Test Suspect Status and Intensive Pursuit (PROJECT-en.md 307-316).

- From identification, suspect is under pursuit. If under pursuit > 1 month -> Intensive Pursuit.
- Intensive Pursuit page: photo and details, visible to all users.
- Ranking: max(Lj) · max(Di). Reward: max(Lj) · max(Di) · 20,000,000 Rials.
"""
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Case, CaseStatus, CasePriority
from investigation.models import Suspect, SuspectStatus, SuspectCaseLink
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


class SuspectStatusTestCase(TestCase):
    """Suspect under pursuit; intensive pursuit after 30 days; ranking and reward."""

    def setUp(self):
        self.client = APIClient()
        self.base_user_role = Role.objects.get_or_create(name='Base user', defaults={'is_active': True})[0]
        self.user = make_user('user_status')
        self.user.roles.add(self.base_user_role)

        self.case = Case.objects.create(
            title='Open case',
            description='D',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.CRITICAL,
        )
        self.suspect = Suspect.objects.create(
            first_name='Wanted',
            last_name='Person',
            national_id='1111111111',
            status=SuspectStatus.FUGITIVE,
            is_wanted=True,
            pursuit_start_date=timezone.now() - timedelta(days=35),
        )
        SuspectCaseLink.objects.create(suspect=self.suspect, case=self.case)

    def test_suspect_under_pursuit_has_days_and_ranking(self):
        """Suspect identified as wanted is under pursuit; Lj = days, Di = degree (1-4)."""
        self.assertTrue(self.suspect.is_wanted)
        self.assertGreaterEqual(self.suspect.days_under_pursuit, 30)
        ranking = self.suspect.get_pursuit_priority()
        self.assertGreater(ranking, 0)
        # Di=4 for CRITICAL, Lj=35 -> ranking = 35*4 = 140
        self.assertEqual(ranking, 35 * 4)

    def test_intensive_pursuit_after_one_month(self):
        """If under pursuit for more than one month, suspect is in Intensive Pursuit status."""
        self.assertTrue(self.suspect.is_intensive_pursuit)
        suspect_recent = Suspect.objects.create(
            first_name='Recent',
            last_name='Wanted',
            national_id='2222222222',
            status=SuspectStatus.FUGITIVE,
            is_wanted=True,
            pursuit_start_date=timezone.now() - timedelta(days=10),
        )
        SuspectCaseLink.objects.create(suspect=suspect_recent, case=self.case)
        self.assertFalse(suspect_recent.is_intensive_pursuit)

    def test_reward_formula_rials(self):
        """Reward for information: max(Lj) · max(Di) · 20,000,000 Rials (PROJECT 315-316)."""
        reward = self.suspect.get_reward_rials()
        expected = 35 * 4 * 20_000_000
        self.assertEqual(reward, expected)

    def test_intensive_pursuit_page_all_users_can_see(self):
        """Intensive Pursuit page is visible to all (authenticated) users."""
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/core/investigation/intensive-pursuit/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        if isinstance(data, dict) and 'results' in data:
            data = data['results']
        self.assertGreaterEqual(len(data), 1)
        entry = next(d for d in data if d['national_id'] == '1111111111')
        self.assertEqual(entry['full_name'], 'Wanted Person')
        self.assertIn('ranking', entry)
        self.assertIn('reward_rials', entry)
        self.assertEqual(entry['ranking'], 35 * 4)
        self.assertEqual(entry['reward_rials'], 35 * 4 * 20_000_000)
        self.assertGreaterEqual(entry['days_under_pursuit'], 30)

    def test_intensive_pursuit_ordered_by_ranking_desc(self):
        """Intensive Pursuit page ordered by ranking (max(Lj)·max(Di)) descending."""
        case2 = Case.objects.create(
            title='Other',
            description='D',
            incident_date=timezone.now(),
            incident_location='There',
            status=CaseStatus.OPEN,
            priority=CasePriority.LEVEL3,
        )
        lower_rank = Suspect.objects.create(
            first_name='Lower',
            last_name='Rank',
            national_id='3333333333',
            status=SuspectStatus.FUGITIVE,
            is_wanted=True,
            pursuit_start_date=timezone.now() - timedelta(days=40),
        )
        SuspectCaseLink.objects.create(suspect=lower_rank, case=case2)
        # lower_rank: 40 days * 1 (LEVEL3) = 40. self.suspect: 35 * 4 = 140. So order: 140, 40.
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/core/investigation/intensive-pursuit/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        if isinstance(data, dict) and 'results' in data:
            data = data['results']
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['ranking'], 140)
        self.assertEqual(data[0]['national_id'], '1111111111')
        self.assertEqual(data[1]['ranking'], 40)
