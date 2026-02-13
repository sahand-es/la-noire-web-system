"""
Test case creation through crime scene registration (PROJECT-en.md 261-266).

- Police (except cadet) registers case with time/hour and witness phones/IDs.
- One superior must approve (Police Chief does not need approval).
- Initially no complainant; complainants may be added over time.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Case, CaseStatus
from accounts.models import Role

User = get_user_model()


def make_user(username, **kwargs):
    h = abs(hash(username)) % (10**12)
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


class CrimeSceneRegistrationFlowTestCase(TestCase):
    """Tests for crime scene -> case creation and approval."""

    def setUp(self):
        self.client = APIClient()
        self.base_url = '/core/cases/'

        self.role_officer = Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0]
        self.role_sergeant = Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        self.role_chief = Role.objects.get_or_create(name='Police Chief', defaults={'is_active': True})[0]
        self.role_cadet = Role.objects.get_or_create(name='Cadet', defaults={'is_active': True})[0]

        self.officer = make_user('officer_crime')
        self.officer.roles.add(self.role_officer)

        self.sergeant = make_user('sergeant_crime')
        self.sergeant.roles.add(self.role_sergeant)

        self.chief = make_user('chief_crime')
        self.chief.roles.add(self.role_chief)

        self.cadet = make_user('cadet_crime')
        self.cadet.roles.add(self.role_cadet)

    def _case_payload(self, **overrides):
        payload = {
            'title': 'Robbery at 5th and Main',
            'description': 'Witness reported armed robbery.',
            'incident_date': timezone.now().isoformat(),
            'incident_location': '5th and Main St',
            'witness_phones': [],
            'witness_national_ids': [],
        }
        payload.update(overrides)
        return payload

    def test_officer_creates_case_then_sergeant_approves(self):
        """Officer registers case -> OPEN; sergeant approves -> UNDER_INVESTIGATION."""
        self.client.force_authenticate(user=self.officer)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', create_resp.data)
        self.assertEqual(create_resp.data['data']['status'], CaseStatus.OPEN)
        case_id = create_resp.data['data']['id']
        self.assertIsNotNone(create_resp.data['data'].get('incident_date'))

        self.client.force_authenticate(user=self.sergeant)
        approve_resp = self.client.post(
            f'{self.base_url}{case_id}/approvals/',
            {'action': 'approve', 'message': 'Approved for investigation'},
            format='json',
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(approve_resp.data['data']['status'], CaseStatus.UNDER_INVESTIGATION)

    def test_police_chief_creates_case_no_approval_needed(self):
        """Police Chief registers -> case is UNDER_INVESTIGATION immediately."""
        self.client.force_authenticate(user=self.chief)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data['data']['status'], CaseStatus.UNDER_INVESTIGATION)
        case_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.sergeant)
        approve_resp = self.client.post(
            f'{self.base_url}{case_id}/approvals/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not pending approval', approve_resp.data.get('message', ''))

    def test_witness_phones_and_national_ids_recorded(self):
        """Witness phone numbers and national IDs are stored for follow-up."""
        self.client.force_authenticate(user=self.officer)
        payload = self._case_payload(
            witness_phones=['09123456789', '09987654321'],
            witness_national_ids=['1234567890', '0987654321'],
        )
        create_resp = self.client.post(self.base_url, payload, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        case_id = create_resp.data['data']['id']
        case = Case.objects.get(pk=case_id)
        self.assertIn('09123456789', case.notes)
        self.assertIn('1234567890', case.notes)

    def test_incident_date_recorded(self):
        """Police records the time/hour (incident_date) in the case."""
        incident = timezone.now()
        self.client.force_authenticate(user=self.officer)
        payload = self._case_payload(incident_date=incident.isoformat())
        create_resp = self.client.post(self.base_url, payload, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(create_resp.data['data']['incident_date'])
        case_id = create_resp.data['data']['id']
        case = Case.objects.get(pk=case_id)
        self.assertIsNotNone(case.incident_date)

    def test_case_has_no_complainant_initially(self):
        """Initially there is no complainant; complaints list is empty."""
        self.client.force_authenticate(user=self.officer)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        case_id = create_resp.data['data']['id']
        case = Case.objects.get(pk=case_id)
        self.assertEqual(case.complaints.count(), 0)

    def test_cadet_cannot_create_case(self):
        """Only police ranks except cadet can register crime scene."""
        self.client.force_authenticate(user=self.cadet)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_approve_only_when_open(self):
        """Approval endpoint returns 400 when case is not OPEN."""
        self.client.force_authenticate(user=self.chief)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        case_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.sergeant)
        approve_resp = self.client.post(
            f'{self.base_url}{case_id}/approvals/',
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_officer_creates_sergeant_rejects_case_closed(self):
        """Superior can reject -> case CLOSED."""
        self.client.force_authenticate(user=self.officer)
        create_resp = self.client.post(self.base_url, self._case_payload(), format='json')
        case_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.sergeant)
        reject_resp = self.client.post(
            f'{self.base_url}{case_id}/approvals/',
            {'action': 'reject', 'message': 'Insufficient evidence'},
            format='json',
        )
        self.assertEqual(reject_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(reject_resp.data['data']['status'], CaseStatus.CLOSED)
