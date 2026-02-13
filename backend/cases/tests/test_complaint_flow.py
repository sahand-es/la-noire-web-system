"""
Test case creation through complaint registration (PROJECT-en.md 248-260).

Flow: complainant submits -> cadet review -> (reject with message -> complainant
corrects -> back to cadet) or (approve -> officer review -> approve -> case created);
officer reject -> return to cadet; 3 cadet rejections -> voided.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Complaint, ComplaintStatus, Case
from accounts.models import Role

User = get_user_model()


def _list_data(response):
    """Extract list of items from list response (handles pagination and plain list)."""
    data = response.data
    if isinstance(data, list):
        return data
    return data.get('results', data.get('data', []))


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


class ComplaintRegistrationFlowTestCase(TestCase):
    """End-to-end tests for complaint -> cadet -> officer -> case creation."""

    def setUp(self):
        self.client = APIClient()
        self.base_url = '/api/v1/complaints/'

        self.role_cadet = Role.objects.get_or_create(name='Cadet', defaults={'is_active': True})[0]
        self.role_officer = Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0]

        self.complainant = make_user('complainant')
        self.complainant.roles.add(Role.objects.get_or_create(name='Base user', defaults={'is_active': True})[0])

        self.cadet = make_user('cadet')
        self.cadet.roles.add(self.role_cadet)

        self.officer = make_user('officer')
        self.officer.roles.add(self.role_officer)

    def _complaint_payload(self, **overrides):
        payload = {
            'title': 'Theft at store',
            'description': 'Someone stole my bag.',
            'incident_date': timezone.now().isoformat(),
            'incident_location': '123 Main St',
        }
        payload.update(overrides)
        return payload

    def test_complainant_submits_then_cadet_approves_then_officer_approves_creates_case(self):
        """Full happy path: submit -> cadet approve -> officer approve -> case created."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data['data']['status'], ComplaintStatus.PENDING_CADET)
        complaint_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.cadet)
        cadet_resp = self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'approve', 'message': 'Looks good'},
            format='json',
        )
        self.assertEqual(cadet_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(cadet_resp.data['data']['status'], ComplaintStatus.PENDING_OFFICER)

        self.client.force_authenticate(user=self.officer)
        officer_resp = self.client.post(
            f'{self.base_url}{complaint_id}/officer-reviews/',
            {'action': 'approve', 'message': 'Case approved'},
            format='json',
        )
        self.assertEqual(officer_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(officer_resp.data['data']['status'], ComplaintStatus.APPROVED)
        self.assertIsNotNone(officer_resp.data['data']['case'])
        self.assertTrue(Case.objects.filter(id=officer_resp.data['data']['case']).exists())

    def test_cadet_rejects_returns_to_complainant_with_message(self):
        """Cadet reject -> RETURNED_TO_COMPLAINANT and message required."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        complaint_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.cadet)
        reject_no_message = self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'reject'},
            format='json',
        )
        self.assertEqual(reject_no_message.status_code, status.HTTP_400_BAD_REQUEST)

        reject_with_message = self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'reject', 'message': 'Please add the exact time of the incident.'},
            format='json',
        )
        self.assertEqual(reject_with_message.status_code, status.HTTP_200_OK)
        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertEqual(complaint.status, ComplaintStatus.RETURNED_TO_COMPLAINANT)
        self.assertEqual(complaint.rejection_count, 1)
        self.assertEqual(complaint.cadet_message, 'Please add the exact time of the incident.')

    def test_complainant_resubmit_returns_to_cadet_queue(self):
        """After cadet reject, complainant updates -> status PENDING_CADET so cadet sees it again."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.cadet)
        self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'reject', 'message': 'Add more details'},
            format='json',
        )

        self.client.force_authenticate(user=self.complainant)
        update_resp = self.client.patch(
            f'{self.base_url}{complaint_id}/',
            {'description': 'Someone stole my bag at 3pm. I have a receipt.'},
            format='json',
        )
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertEqual(complaint.status, ComplaintStatus.PENDING_CADET)

        self.client.force_authenticate(user=self.cadet)
        list_resp = self.client.get(self.base_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        data = _list_data(list_resp)
        ids = [c['id'] for c in data]
        self.assertIn(complaint_id, ids)

    def test_officer_reject_returns_to_cadet_not_complainant(self):
        """Officer reject -> RETURNED_TO_CADET; cadet sees it again."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.cadet)
        self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'approve', 'message': ''},
            format='json',
        )

        self.client.force_authenticate(user=self.officer)
        officer_reject = self.client.post(
            f'{self.base_url}{complaint_id}/officer-reviews/',
            {'action': 'reject', 'message': 'Need cadet to verify ID again.'},
            format='json',
        )
        self.assertEqual(officer_reject.status_code, status.HTTP_200_OK)
        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertEqual(complaint.status, ComplaintStatus.RETURNED_TO_CADET)
        self.assertEqual(complaint.officer_message, 'Need cadet to verify ID again.')

        self.client.force_authenticate(user=self.cadet)
        list_resp = self.client.get(self.base_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        data = _list_data(list_resp)
        self.assertTrue(any(c['id'] == complaint_id for c in data))

    def test_three_cadet_rejections_voids_complaint(self):
        """3 rejections by cadet -> status VOIDED, no longer goes to officer."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']

        self.client.force_authenticate(user=self.cadet)
        for i in range(3):
            resp = self.client.post(
                f'{self.base_url}{complaint_id}/cadet-reviews/',
                {'action': 'reject', 'message': f'Rejection reason {i+1}'},
                format='json',
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            if i < 2:
                complaint = Complaint.objects.get(pk=complaint_id)
                self.assertEqual(complaint.status, ComplaintStatus.RETURNED_TO_COMPLAINANT)
                self.client.force_authenticate(user=self.complainant)
                self.client.patch(
                    f'{self.base_url}{complaint_id}/',
                    {'description': f'Updated attempt {i+2}'},
                    format='json',
                )
                self.client.force_authenticate(user=self.cadet)

        complaint = Complaint.objects.get(pk=complaint_id)
        self.assertEqual(complaint.status, ComplaintStatus.VOIDED)
        self.assertEqual(complaint.rejection_count, 3)

        self.client.force_authenticate(user=self.officer)
        list_resp = self.client.get(self.base_url)
        data = _list_data(list_resp)
        officer_ids = [c['id'] for c in data]
        self.assertNotIn(complaint_id, officer_ids)

    def test_complainant_can_list_own_complaints(self):
        """Complainant can list and only sees their own complaints."""
        self.client.force_authenticate(user=self.complainant)
        self.client.post(self.base_url, self._complaint_payload(), format='json')
        list_resp = self.client.get(self.base_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        data = _list_data(list_resp)
        self.assertGreaterEqual(len(data), 1)
        for c in data:
            self.assertEqual(c['complainant'], self.complainant.id)

    def test_complainant_can_only_update_when_returned(self):
        """Complainant can update only when status is RETURNED_TO_COMPLAINANT."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']

        update_while_pending = self.client.patch(
            f'{self.base_url}{complaint_id}/',
            {'description': 'Changed'},
            format='json',
        )
        self.assertEqual(update_while_pending.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cadet_cannot_do_officer_review(self):
        """Cadet gets 403 on officer-reviews."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']
        self.client.force_authenticate(user=self.cadet)
        self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'approve', 'message': ''},
            format='json',
        )

        self.client.force_authenticate(user=self.cadet)
        officer_resp = self.client.post(
            f'{self.base_url}{complaint_id}/officer-reviews/',
            {'action': 'approve', 'message': ''},
            format='json',
        )
        self.assertEqual(officer_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_reject_requires_message(self):
        """Officer reject without message returns 400."""
        self.client.force_authenticate(user=self.complainant)
        create_resp = self.client.post(self.base_url, self._complaint_payload(), format='json')
        complaint_id = create_resp.data['data']['id']
        self.client.force_authenticate(user=self.cadet)
        self.client.post(
            f'{self.base_url}{complaint_id}/cadet-reviews/',
            {'action': 'approve', 'message': ''},
            format='json',
        )

        self.client.force_authenticate(user=self.officer)
        resp = self.client.post(
            f'{self.base_url}{complaint_id}/officer-reviews/',
            {'action': 'reject'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
