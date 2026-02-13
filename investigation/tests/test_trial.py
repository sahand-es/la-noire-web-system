"""
E2E test for Trial 

The suspect must go to court. The judge must see the entire case along with evidence
and documents and complete details of all involved individuals. Then the final verdict
(innocent/guilty) and punishment are recorded.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Case, CaseStatus, OtherEvidence
from investigation.models import Trial, TrialStatus, TrialVerdict, Suspect, SuspectStatus, SuspectCaseLink
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


class TrialE2ETestCase(TestCase):
    """E2E: Judge sees full case (evidence + individuals), then records verdict and punishment."""

    def setUp(self):
        self.client = APIClient()
        self.role_judge = Role.objects.get_or_create(name='Judge', defaults={'is_active': True})[0]
        self.judge = make_user('judge_trial')
        self.judge.roles.add(self.role_judge)

        self.case = Case.objects.create(
            title='Case for trial',
            description='Robbery at store.',
            incident_date=timezone.now(),
            incident_location='Main St',
            status=CaseStatus.UNDER_INVESTIGATION,
        )
        self.suspect = Suspect.objects.create(
            first_name='Jane',
            last_name='Doe',
            national_id='9876543210',
            status=SuspectStatus.DETAINED,
        )
        SuspectCaseLink.objects.create(suspect=self.suspect, case=self.case)
        OtherEvidence.objects.create(
            case=self.case,
            title='Weapon',
            description='Knife found at scene.',
            location='Scene',
            item_name='Knife',
            item_category='Weapon',
            physical_description='Steel',
            condition='Used',
            evidence_type='OTHER',
            status='COLLECTED',
            collected_date=timezone.now(),
            collected_by=self.judge,
        )
        self.trial = Trial.objects.create(
            case=self.case,
            judge=self.judge,
            scheduled_date=timezone.now(),
            status=TrialStatus.SCHEDULED,
        )

    def _trial_url(self, path=''):
        base = f'/core/investigation/cases/{self.case.id}/trial/'
        return f'{base}{path}' if path else base

    def test_judge_sees_entire_case_evidence_and_individuals(self):
        """Judge must see the entire case along with evidence and complete details of all involved individuals."""
        self.client.force_authenticate(user=self.judge)
        resp = self.client.get(self._trial_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get('data', resp.data)
        self.assertIn('trial', data)
        self.assertEqual(data['trial']['id'], self.trial.id)
        self.assertEqual(data['case_number'], self.case.case_number)
        self.assertEqual(data['title'], self.case.title)
        self.assertIn('evidence', data)
        self.assertGreater(len(data['evidence']), 0, 'Judge must see evidence/documents')
        evidence_titles = [e['title'] for e in data['evidence']]
        self.assertIn('Weapon', evidence_titles)
        self.assertIn('involved_individuals', data)
        self.assertGreater(len(data['involved_individuals']), 0, 'Judge must see involved individuals')
        individual = data['involved_individuals'][0]
        self.assertEqual(individual['full_name'], 'Jane Doe')
        self.assertEqual(individual['national_id'], '9876543210')
        self.assertEqual(individual['role'], 'suspect')

    def test_judge_records_verdict_guilty_and_punishment(self):
        """Judge records final verdict (guilty) and punishment (PROJECT 305)."""
        self.client.force_authenticate(user=self.judge)
        resp = self.client.post(
            self._trial_url('record-verdict/'),
            {'verdict': TrialVerdict.GUILTY, 'punishment': '5 years imprisonment.', 'judge_notes': 'Convicted.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('Verdict GUILTY recorded', resp.data.get('message', ''))
        self.trial.refresh_from_db()
        self.assertEqual(self.trial.verdict, TrialVerdict.GUILTY)
        self.assertEqual(self.trial.punishment, '5 years imprisonment.')
        self.assertEqual(self.trial.status, TrialStatus.COMPLETED)
        self.assertIsNotNone(self.trial.verdict_date)

    def test_judge_records_verdict_innocent(self):
        """Judge can record verdict innocent (no punishment required)."""
        self.client.force_authenticate(user=self.judge)
        resp = self.client.post(
            self._trial_url('record-verdict/'),
            {'verdict': TrialVerdict.INNOCENT, 'judge_notes': 'Insufficient evidence.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.trial.refresh_from_db()
        self.assertEqual(self.trial.verdict, TrialVerdict.INNOCENT)
        self.assertEqual(self.trial.status, TrialStatus.COMPLETED)

    def test_non_judge_cannot_view_trial_or_record_verdict(self):
        """Only judge can see full case and record verdict."""
        officer = make_user('officer_trial')
        officer.roles.add(Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0])
        self.client.force_authenticate(user=officer)
        resp = self.client.get(self._trial_url())
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        resp = self.client.post(
            self._trial_url('record-verdict/'),
            {'verdict': TrialVerdict.GUILTY},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
