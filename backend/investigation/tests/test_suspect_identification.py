"""
Test Suspect Identification and Interrogation (PROJECT-en.md 298-303).

After arrest:
- Sergeant and detective each determine suspect's probability of guilt from 1 to 10.
- Scores go to the captain; they determine the final opinion with statements, documents, and scores.
- In critical crimes, the police chief must also approve or reject the captain's opinion.
"""
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


class SuspectIdentificationFlowTestCase(TestCase):
    """Tests for guilt scores (detective/sergeant), captain opinion, chief approval (critical)."""

    def setUp(self):
        self.client = APIClient()
        self.role_detective = Role.objects.get_or_create(name='Detective', defaults={'is_active': True})[0]
        self.role_sergeant = Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        self.role_captain = Role.objects.get_or_create(name='Captain', defaults={'is_active': True})[0]
        self.role_chief = Role.objects.get_or_create(name='Police Chief', defaults={'is_active': True})[0]

        self.detective = make_user('det_sus')
        self.detective.roles.add(self.role_detective)
        self.sergeant = make_user('sgt_sus')
        self.sergeant.roles.add(self.role_sergeant)
        self.captain = make_user('cap_sus')
        self.captain.roles.add(self.role_captain)
        self.chief = make_user('chief_sus')
        self.chief.roles.add(self.role_chief)

        self.case = Case.objects.create(
            title='Case for suspect',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            priority=CasePriority.LEVEL3,
        )
        self.suspect = Suspect.objects.create(
            first_name='John',
            last_name='Doe',
            national_id='1234567890',
            status=SuspectStatus.DETAINED,
        )
        self.link = SuspectCaseLink.objects.create(
            suspect=self.suspect,
            case=self.case,
        )

    def _url(self, path_suffix=''):
        base = f'/core/investigation/cases/{self.case.id}/suspect-links/{self.link.id}'
        return f'{base}/{path_suffix}' if path_suffix else base

    def test_detective_sets_guilt_score_1_to_10(self):
        """Detective determines suspect's probability of guilt from 1 to 10."""
        self.client.force_authenticate(user=self.detective)
        resp = self.client.post(self._url('detective-assessment/'), {'guilt_score': 8}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['data']['detective_guilt_score'], 8)
        self.link.refresh_from_db()
        self.assertEqual(self.link.detective_guilt_score, 8)
        self.assertIsNotNone(self.link.detective_assessment_date)

    def test_sergeant_sets_guilt_score_1_to_10(self):
        """Sergeant determines suspect's probability of guilt from 1 to 10."""
        self.client.force_authenticate(user=self.sergeant)
        resp = self.client.post(self._url('sergeant-assessment/'), {'guilt_score': 7}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['data']['sergeant_guilt_score'], 7)
        self.link.refresh_from_db()
        self.assertEqual(self.link.sergeant_guilt_score, 7)

    def test_scores_go_to_captain_final_opinion(self):
        """After both scores, captain determines final opinion with statements, documents, and scores."""
        self.link.detective_guilt_score = 8
        self.link.detective_assessment_date = timezone.now()
        self.link.sergeant_guilt_score = 7
        self.link.sergeant_assessment_date = timezone.now()
        self.link.save()

        self.client.force_authenticate(user=self.captain)
        resp = self.client.post(
            self._url('captain-opinion/'),
            {'opinion': 'Based on detective (8) and sergeant (7) scores and documents, suspect is likely guilty.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.link.refresh_from_db()
        self.assertIn('likely guilty', self.link.captain_opinion)
        self.assertEqual(self.link.captain_id, self.captain.id)
        self.assertIsNotNone(self.link.captain_opinion_at)

    def test_captain_opinion_requires_both_scores(self):
        """Captain can set opinion only when both detective and sergeant scores exist."""
        self.client.force_authenticate(user=self.captain)
        resp = self.client.post(
            self._url('captain-opinion/'),
            {'opinion': 'My opinion.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Both detective and sergeant', resp.data.get('message', ''))

    def test_critical_case_chief_must_approve_or_reject(self):
        """In critical crimes, police chief must approve or reject captain's opinion."""
        self.case.priority = CasePriority.CRITICAL
        self.case.save()
        self.link.detective_guilt_score = 9
        self.link.detective_assessment_date = timezone.now()
        self.link.sergeant_guilt_score = 8
        self.link.sergeant_assessment_date = timezone.now()
        self.link.captain_opinion = 'Final opinion: guilty.'
        self.link.captain = self.captain
        self.link.captain_opinion_at = timezone.now()
        self.link.save()

        self.client.force_authenticate(user=self.chief)
        resp = self.client.post(self._url('chief-approval/'), {'approved': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.link.refresh_from_db()
        self.assertTrue(self.link.chief_approved)
        self.assertEqual(self.link.chief_id, self.chief.id)
        self.assertIsNotNone(self.link.chief_approval_at)

    def test_critical_case_chief_can_reject(self):
        """Chief can reject captain's opinion on critical case."""
        self.case.priority = CasePriority.CRITICAL
        self.case.save()
        self.link.detective_guilt_score = 9
        self.link.sergeant_guilt_score = 8
        self.link.detective_assessment_date = timezone.now()
        self.link.sergeant_assessment_date = timezone.now()
        self.link.captain_opinion = 'Guilty.'
        self.link.captain = self.captain
        self.link.captain_opinion_at = timezone.now()
        self.link.save()

        self.client.force_authenticate(user=self.chief)
        resp = self.client.post(self._url('chief-approval/'), {'approved': False}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.link.refresh_from_db()
        self.assertFalse(self.link.chief_approved)

    def test_chief_approval_only_for_critical(self):
        """Chief approval endpoint is only for critical crimes."""
        self.assertNotEqual(self.case.priority, CasePriority.CRITICAL)
        self.link.captain_opinion = 'Opinion'
        self.link.captain = self.captain
        self.link.captain_opinion_at = timezone.now()
        self.link.save()

        self.client.force_authenticate(user=self.chief)
        resp = self.client.post(self._url('chief-approval/'), {'approved': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only required for critical', resp.data.get('message', ''))

    def test_chief_approval_requires_captain_opinion(self):
        """Chief cannot approve until captain has set opinion."""
        self.case.priority = CasePriority.CRITICAL
        self.case.save()
        self.link.detective_guilt_score = 8
        self.link.sergeant_guilt_score = 7
        self.link.detective_assessment_date = timezone.now()
        self.link.sergeant_assessment_date = timezone.now()
        self.link.save()

        self.client.force_authenticate(user=self.chief)
        resp = self.client.post(self._url('chief-approval/'), {'approved': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Captain must set opinion', resp.data.get('message', ''))

    def test_list_suspect_links_includes_scores_and_opinion(self):
        """List suspect links for case shows guilt scores and captain/chief data."""
        self.link.detective_guilt_score = 6
        self.link.sergeant_guilt_score = 7
        self.link.save()
        self.client.force_authenticate(user=self.detective)
        resp = self.client.get(f'/core/investigation/cases/{self.case.id}/suspect-links/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        if isinstance(data, dict) and 'results' in data:
            data = data['results']
        self.assertGreaterEqual(len(data), 1)
        item = next(d for d in data if d['id'] == self.link.id)
        self.assertEqual(item['detective_guilt_score'], 6)
        self.assertEqual(item['sergeant_guilt_score'], 7)
        self.assertIn('average_guilt_score', item)
        self.assertTrue(item['has_both_assessments'])
