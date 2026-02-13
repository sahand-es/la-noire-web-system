"""
Test Evidence Registration (PROJECT-en.md 268-287).

- Evidence in two categories: Witness Testimonies vs Found Evidence (Biological, Vehicle, Document, Other).
- All evidence: title, description, registration date, recorder.
- Witness: transcripts; optional images/videos/audio.
- Biological: title, description, images; follow-up result initially empty; coroner approval.
- Vehicle: model, license plate, color; license plate and serial (VIN) cannot both be set.
- Identification documents: key-value pairs, unlimited or none (e.g. only name).
- Other: title-description record.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import (
    Case,
    CaseStatus,
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
)
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


def make_case(created_by=None):
    """Create a case in UNDER_INVESTIGATION for evidence tests."""
    case = Case.objects.create(
        title='Test Case for Evidence',
        description='Description',
        incident_date=timezone.now(),
        incident_location='Somewhere',
        status=CaseStatus.UNDER_INVESTIGATION,
    )
    return case


class EvidenceRegistrationTestCase(TestCase):
    """Evidence registration: title, description, registration date, recorder."""

    def setUp(self):
        self.client = APIClient()
        self.role_officer = Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0]
        self.officer = make_user('officer_ev')
        self.officer.roles.add(self.role_officer)
        self.case = make_case()
        self.case_url = f'/api/v1/cases/{self.case.id}'

    def test_all_evidence_has_title_description_registration_date_recorder(self):
        """All evidence includes title, description; has registration date and recorder (PROJECT 269-272)."""
        self.client.force_authenticate(user=self.officer)
        testimony_date = timezone.now().isoformat()
        payload = {
            'title': 'Witness statement',
            'description': 'What the witness reported.',
            'location': 'Station A',
            'witness_name': 'John Doe',
            'testimony_date': testimony_date,
            'testimony_text': 'I saw a blue car.',
        }
        resp = self.client.post(f'{self.case_url}/witness-testimonies/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        data = resp.data.get('data', resp.data)
        self.assertIn('title', data)
        self.assertEqual(data['title'], 'Witness statement')
        self.assertIn('description', data)
        self.assertEqual(data['description'], 'What the witness reported.')
        self.assertIn('collected_date', data)
        self.assertTrue(data['collected_date'], 'Must have registration/collection date')
        self.assertIn('collected_by', data)
        self.assertEqual(data['collected_by'], self.officer.id)
        self.assertIn('collected_by_name', data)

    def test_witness_testimony_registration(self):
        """Witness testimonies: transcripts; optional images/videos/audio (PROJECT 274-275)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Local resident testimony',
            'description': 'Transcript of interview.',
            'location': 'HQ',
            'witness_name': 'Jane',
            'testimony_date': timezone.now().isoformat(),
            'testimony_text': 'Full transcript here.',
        }
        resp = self.client.post(f'{self.case_url}/witness-testimonies/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WitnessTestimony.objects.filter(case=self.case).count(), 1)
        wt = WitnessTestimony.objects.get(case=self.case)
        self.assertEqual(wt.title, 'Local resident testimony')
        self.assertEqual(wt.description, 'Transcript of interview.')
        self.assertIsNotNone(wt.collected_date)
        self.assertEqual(wt.collected_by_id, self.officer.id)

    def test_biological_evidence_title_description_follow_up_initially_empty(self):
        """Biological evidence: title, description; follow-up result initially empty (PROJECT 277-278)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Blood sample',
            'description': 'Blood stain from scene.',
            'location': 'Crime scene',
            'sample_type': 'Blood',
            'sample_quantity': '5ml',
            'storage_location': 'Lab fridge A',
        }
        resp = self.client.post(f'{self.case_url}/biological-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        bio = BiologicalEvidence.objects.get(case=self.case)
        self.assertEqual(bio.title, 'Blood sample')
        self.assertEqual(bio.description, 'Blood stain from scene.')
        self.assertIsNotNone(bio.collected_date)
        self.assertEqual(bio.collected_by_id, self.officer.id)
        self.assertEqual(bio.lab_results, '', 'Follow-up result must be initially empty')

    def test_biological_evidence_coroner_approval_and_follow_up_filled_later(self):
        """Biological evidence: coroner approves; follow-up result may be filled later (PROJECT 278)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Fingerprint',
            'description': 'Latent print.',
            'location': 'Door',
            'sample_type': 'Fingerprint',
            'sample_quantity': '1',
            'storage_location': 'Lab',
        }
        resp = self.client.post(f'{self.case_url}/biological-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        bio_id = resp.data.get('data', resp.data)['id']
        role_coroner = Role.objects.get_or_create(name='Coroner', defaults={'is_active': True})[0]
        coroner = make_user('coroner_ev')
        coroner.roles.add(role_coroner)
        self.client.force_authenticate(user=coroner)
        approval_resp = self.client.post(
            f'{self.case_url}/biological-evidence/{bio_id}/coroner-approvals/',
            {'approved': True, 'follow_up_result': 'Match found in database.'},
            format='json',
        )
        self.assertEqual(approval_resp.status_code, status.HTTP_200_OK)
        bio = BiologicalEvidence.objects.get(pk=bio_id)
        self.assertTrue(bio.coroner_approved)
        self.assertEqual(bio.lab_results, 'Match found in database.')

    def test_vehicle_evidence_model_license_plate_color(self):
        """Vehicle: model, license plate, color (PROJECT 280-281)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Suspect vehicle',
            'description': 'Red sedan at scene.',
            'location': 'Parking lot',
            'vehicle_type': 'Car',
            'make': 'Toyota',
            'model': 'Camry',
            'color': 'Red',
            'license_plate': '12-A-345-B',
        }
        resp = self.client.post(f'{self.case_url}/vehicle-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        veh = VehicleEvidence.objects.get(case=self.case)
        self.assertEqual(veh.model, 'Camry')
        self.assertEqual(veh.license_plate, '12-A-345-B')
        self.assertEqual(veh.color, 'Red')
        self.assertIsNotNone(veh.collected_date)
        self.assertEqual(veh.collected_by_id, self.officer.id)

    def test_vehicle_evidence_license_plate_and_serial_cannot_both_be_set(self):
        """License plate and serial number cannot both have values (PROJECT 281)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Vehicle',
            'description': 'Desc',
            'location': 'Street',
            'vehicle_type': 'Car',
            'model': 'X',
            'color': 'Black',
            'license_plate': 'ABC123',
            'vin_number': 'VIN999',
        }
        resp = self.client.post(f'{self.case_url}/vehicle-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot both', str(resp.data).lower() or str(resp.data.get('message', '')).lower())

    def test_vehicle_evidence_serial_when_no_license_plate(self):
        """If no license plate, serial number (VIN) can be entered."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Unplated vehicle',
            'description': 'No plate.',
            'location': 'Garage',
            'vehicle_type': 'Motorcycle',
            'model': 'YZF',
            'color': 'Blue',
            'vin_number': 'VIN123456',
        }
        resp = self.client.post(f'{self.case_url}/vehicle-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        veh = VehicleEvidence.objects.get(case=self.case)
        self.assertEqual(veh.vin_number, 'VIN123456')
        self.assertFalse(veh.license_plate or False)

    def test_identification_document_key_value_pairs_can_be_empty(self):
        """Document info as key-value pairs; may not exist (e.g. only name) (PROJECT 283-284)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'ID card',
            'description': 'Found at scene.',
            'location': 'Desk',
            'document_type': 'National ID',
            'owner_full_name': 'Ali Reza',
            'document_attributes': {},
            'is_identification_document': True,
        }
        resp = self.client.post(f'{self.case_url}/document-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        doc = DocumentEvidence.objects.get(case=self.case)
        self.assertEqual(doc.owner_full_name, 'Ali Reza')
        self.assertEqual(doc.document_attributes, {})

    def test_identification_document_key_value_pairs_unlimited(self):
        """Document attributes: unlimited key-value pairs (PROJECT 284)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Passport',
            'description': 'Passport found.',
            'location': 'Bag',
            'document_type': 'Passport',
            'owner_full_name': 'Sara',
            'document_attributes': {'Passport_No': 'P123', 'Issue_Date': '2020-01-01', 'Expiry': '2030-01-01'},
            'is_identification_document': True,
        }
        resp = self.client.post(f'{self.case_url}/document-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        doc = DocumentEvidence.objects.get(case=self.case)
        self.assertEqual(doc.document_attributes['Passport_No'], 'P123')
        self.assertEqual(doc.document_attributes['Issue_Date'], '2020-01-01')
        self.assertEqual(len(doc.document_attributes), 3)

    def test_other_evidence_title_description_record(self):
        """Other items: stored as title-description record (PROJECT 286-287)."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'Knife',
            'description': 'Kitchen knife found near victim.',
            'location': 'Kitchen',
            'item_name': 'Knife',
            'item_category': 'Weapon',
            'physical_description': 'Steel blade.',
            'condition': 'Used',
        }
        resp = self.client.post(f'{self.case_url}/other-evidence/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        other = OtherEvidence.objects.get(case=self.case)
        self.assertEqual(other.title, 'Knife')
        self.assertEqual(other.description, 'Kitchen knife found near victim.')
        self.assertIsNotNone(other.collected_date)
        self.assertEqual(other.collected_by_id, self.officer.id)

    def test_evidence_divided_into_two_categories(self):
        """Evidence is divided into two categories: Witness vs Found (Biological, Vehicle, Document, Other) (PROJECT 269)."""
        self.client.force_authenticate(user=self.officer)
        # Category 1: Witness testimony
        r1 = self.client.post(f'{self.case_url}/witness-testimonies/', {
            'title': 'Wit', 'description': 'D', 'location': 'L',
            'witness_name': 'W', 'testimony_date': timezone.now().isoformat(), 'testimony_text': 'T',
        }, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertIn('evidence_type', r1.data.get('data', r1.data))
        # Category 2: Found evidence (other)
        r2 = self.client.post(f'{self.case_url}/other-evidence/', {
            'title': 'Item', 'description': 'D', 'location': 'L',
            'item_name': 'I', 'item_category': 'C', 'physical_description': 'P', 'condition': 'G',
        }, format='json')
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WitnessTestimony.objects.filter(case=self.case).count(), 1)
        self.assertEqual(OtherEvidence.objects.filter(case=self.case).count(), 1)
