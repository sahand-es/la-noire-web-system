"""
Test Case Resolution 

- Detective Board: documents/evidence on case; detective can connect related documents with a red line (evidence links).
- Detective reports main suspects to sergeant and waits for approval.
- Sergeant reviews: if agreement -> approval message, arrest begins; if disagreement -> disagreement message, case remains open.
- New documents/evidence during resolution -> notification must reach the assigned detective.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status

from cases.models import Case, CaseStatus, WitnessTestimony, OtherEvidence
from investigation.models import EvidenceLink, DetectiveReport, DetectiveReportStatus, Notification
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


class CaseResolutionFlowTestCase(TestCase):
    """Tests for detective board, evidence links, detective report, sergeant review, notifications."""

    def setUp(self):
        self.client = APIClient()
        self.role_detective = Role.objects.get_or_create(name='Detective', defaults={'is_active': True})[0]
        self.role_sergeant = Role.objects.get_or_create(name='Sergeant', defaults={'is_active': True})[0]
        self.role_officer = Role.objects.get_or_create(name='Police Officer', defaults={'is_active': True})[0]

        self.detective = make_user('detective_res')
        self.detective.roles.add(self.role_detective)
        self.sergeant = make_user('sergeant_res')
        self.sergeant.roles.add(self.role_sergeant)
        self.officer = make_user('officer_res')
        self.officer.roles.add(self.role_officer)

        self.case = Case.objects.create(
            title='Case for resolution',
            description='Desc',
            incident_date=timezone.now(),
            incident_location='Here',
            status=CaseStatus.UNDER_INVESTIGATION,
            assigned_detective=self.detective,
        )

    def _case_url(self, path=''):
        base = f'/core/cases/{self.case.id}'
        return f'{base}/{path}' if path else base

    def test_detective_creates_evidence_link_red_line(self):
        """Detective can connect related documents/evidence with a red line (evidence link)."""
        wt = WitnessTestimony.objects.create(
            case=self.case,
            title='Wit',
            description='D',
            location='L',
            witness_name='W',
            testimony_date=timezone.now(),
            testimony_text='T',
            evidence_type='WITNESS',
            status='COLLECTED',
            collected_date=timezone.now(),
            collected_by=self.officer,
        )
        other = OtherEvidence.objects.create(
            case=self.case,
            title='Item',
            description='D',
            location='L',
            item_name='I',
            item_category='C',
            physical_description='P',
            condition='G',
            evidence_type='OTHER',
            status='COLLECTED',
            collected_date=timezone.now(),
            collected_by=self.officer,
        )
        ct_w = ContentType.objects.get_for_model(WitnessTestimony)
        ct_o = ContentType.objects.get_for_model(OtherEvidence)
        self.client.force_authenticate(user=self.detective)
        payload = {
            'from_content_type_id': ct_w.id,
            'from_object_id': wt.id,
            'to_content_type_id': ct_o.id,
            'to_object_id': other.id,
        }
        resp = self.client.post(self._case_url('evidence-links/'), payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', resp.data)
        self.assertEqual(EvidenceLink.objects.filter(case=self.case).count(), 1)
        link = EvidenceLink.objects.get(case=self.case)
        self.assertEqual(link.from_object_id, wt.id)
        self.assertEqual(link.to_object_id, other.id)
        self.assertEqual(link.created_by, self.detective)

    def test_evidence_link_must_belong_to_case(self):
        """Evidence link from/to must be evidence on this case."""
        other_case = Case.objects.create(
            title='Other',
            description='D',
            incident_date=timezone.now(),
            incident_location='There',
            status=CaseStatus.UNDER_INVESTIGATION,
        )
        other_ev = OtherEvidence.objects.create(
            case=other_case,
            title='X',
            description='D',
            location='L',
            item_name='X',
            item_category='C',
            physical_description='P',
            condition='G',
            evidence_type='OTHER',
            status='COLLECTED',
            collected_date=timezone.now(),
            collected_by=self.officer,
        )
        local_ev = OtherEvidence.objects.create(
            case=self.case,
            title='Y',
            description='D',
            location='L',
            item_name='Y',
            item_category='C',
            physical_description='P',
            condition='G',
            evidence_type='OTHER',
            status='COLLECTED',
            collected_date=timezone.now(),
            collected_by=self.officer,
        )
        ct = ContentType.objects.get_for_model(OtherEvidence)
        self.client.force_authenticate(user=self.detective)
        resp = self.client.post(self._case_url('evidence-links/'), {
            'from_content_type_id': ct.id,
            'from_object_id': other_ev.id,
            'to_content_type_id': ct.id,
            'to_object_id': local_ev.id,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('From evidence must belong', resp.data.get('message', ''))

    def test_detective_submits_report_waits_for_approval(self):
        """Detective reports to sergeant; report is PENDING_SERGEANT until sergeant reviews."""
        self.client.force_authenticate(user=self.detective)
        resp = self.client.post(self._case_url('detective-reports/'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.data.get('data', resp.data)
        self.assertEqual(data['status'], DetectiveReportStatus.PENDING_SERGEANT)
        self.assertEqual(data['detective'], self.detective.id)
        report_id = data['id']
        self.assertEqual(DetectiveReport.objects.filter(case=self.case).count(), 1)
        report = DetectiveReport.objects.get(pk=report_id)
        self.assertIsNone(report.sergeant_id)
        self.assertIsNone(report.reviewed_at)

    def test_sergeant_approves_report_arrest_begins(self):
        """Sergeant approves -> approval message, arrest may begin."""
        report = DetectiveReport.objects.create(
            case=self.case,
            detective=self.detective,
            status=DetectiveReportStatus.PENDING_SERGEANT,
        )
        self.client.force_authenticate(user=self.sergeant)
        resp = self.client.post(
            self._case_url(f'detective-reports/{report.id}/sergeant-reviews/'),
            {'action': 'approve', 'message': 'Proceed with arrest.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('Approved', resp.data.get('message', ''))
        report.refresh_from_db()
        self.assertEqual(report.status, DetectiveReportStatus.APPROVED)
        self.assertEqual(report.sergeant_id, self.sergeant.id)
        self.assertIsNotNone(report.reviewed_at)

    def test_sergeant_disagrees_case_remains_open(self):
        """Sergeant disagrees -> disagreement message, case remains open."""
        report = DetectiveReport.objects.create(
            case=self.case,
            detective=self.detective,
            status=DetectiveReportStatus.PENDING_SERGEANT,
        )
        self.client.force_authenticate(user=self.sergeant)
        resp = self.client.post(
            self._case_url(f'detective-reports/{report.id}/sergeant-reviews/'),
            {'action': 'disagree', 'message': 'Reasoning does not match suspect records.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('Disagreement', resp.data.get('message', ''))
        self.assertIn('remains open', resp.data.get('message', ''))
        report.refresh_from_db()
        self.assertEqual(report.status, DetectiveReportStatus.DISAGREEMENT)

    def test_only_assigned_detective_can_submit_report(self):
        """Only the assigned detective can submit a report for the case."""
        self.case.assigned_detective = self.detective
        self.case.save()
        other_detective = make_user('detective_other')
        other_detective.roles.add(self.role_detective)
        self.client.force_authenticate(user=other_detective)
        resp = self.client.post(self._case_url('detective-reports/'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only the assigned detective', resp.data.get('message', ''))

    def test_new_evidence_notifies_assigned_detective(self):
        """When new evidence is added during case resolution, a notification reaches the detective."""
        self.client.force_authenticate(user=self.officer)
        payload = {
            'title': 'New doc',
            'description': 'Added during resolution.',
            'location': 'Scene',
            'item_name': 'Doc',
            'item_category': 'Document',
            'physical_description': 'P',
            'condition': 'Good',
        }
        resp = self.client.post(self._case_url('other-evidence/'), payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Notification.objects.filter(case=self.case, recipient=self.detective).count(),
            1,
            'Assigned detective must receive a notification for new evidence.',
        )
        notif = Notification.objects.get(case=self.case, recipient=self.detective)
        self.assertIn('New evidence', notif.message)
