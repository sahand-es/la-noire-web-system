from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from cases.models import Case, CaseStatus
from investigation.models import SuspectCaseLink, DetectiveReport
from core.models import UserProfile
from cases.serializers.case import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateFromSceneSerializer,
    CaseUpdateSerializer,
    CaseApprovalSerializer,
    CaseAssignDetectiveSerializer,
    CaseStatisticsSerializer
)
from cases.serializers.evidence import (
    WitnessTestimonySerializer,
    BiologicalEvidenceSerializer,
    VehicleEvidenceSerializer,
    DocumentEvidenceSerializer,
    OtherEvidenceSerializer,
)
from accounts.permissions import (
    IsPoliceRankExceptCadet,
    IsPoliceChief,
    IsDetective,
    IsSergeant,
    IsCaptain,
    IsOfficer,
    IsCadetOrOfficer,
    IsDetectiveOrSergeantOrChief,
    IsSergeantOrCaptainOrChief,
    IsSergeantOrCaptainOrChiefOrAdmin,
)


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.select_related(
        'assigned_detective'
    ).prefetch_related(
        'team_members',
        'complaints'
    ).all()

    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateFromSceneSerializer
        if self.action in ['update', 'partial_update']:
            return CaseUpdateSerializer
        if self.action == 'retrieve':
            return CaseDetailSerializer
        return CaseListSerializer

    def get_permissions(self):
        if self.action == 'suspect_names':
            return [AllowAny()]
        if self.action == 'create':
            return [IsPoliceRankExceptCadet()]
        if self.action in ['detectives', 'judges']:
            return [IsSergeantOrCaptainOrChiefOrAdmin()]
        if self.action == 'all_names':
            return [IsAuthenticated()]
        if self.action == 'list':
            return [IsAuthenticated()]  # Judge can list (filtered); Cadet/Officer etc. too
        if self.action == 'retrieve':
            return [IsCadetOrOfficer()]
        if self.action in ['update', 'partial_update']:
            return [IsDetectiveOrSergeantOrChief()]
        if self.action == 'approve':
            return [IsPoliceRankExceptCadet()]
        if self.action == 'assign_detective':
            return [IsSergeantOrCaptainOrChief()]
        if self.action == 'statistics':
            return [IsCadetOrOfficer()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset

        if user.has_role('Detective'):
            queryset = queryset.filter(
                Q(assigned_detective=user)
                | Q(team_members=user)
                | Q(status__in=[CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION])
            ).distinct()
        elif user.has_role('Cadet'):
            queryset = queryset.filter(status=CaseStatus.OPEN)
        elif user.has_any_role(['Police Officer', 'Sergeant', 'Captain', 'Police Chief']):
            pass
        elif user.is_superuser or user.has_role('System Administrator'):
            pass
        elif user.has_role('Judge'):
            queryset = queryset.filter(trial__isnull=False)  # only cases with trials
        else:
            queryset = queryset.none()

        without_trial = self.request.query_params.get('without_trial')
        if without_trial:
            queryset = queryset.filter(trial__isnull=True)

        has_trial = self.request.query_params.get('has_trial')
        if has_trial:
            queryset = queryset.filter(trial__isnull=False)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        return queryset

    def create(self, request, *args, **kwargs):
        if request.user.has_role('Police Chief'):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            case = serializer.save()
            case.status = CaseStatus.UNDER_INVESTIGATION
            case.save()

            return Response(
                {
                    'status': 'success',
                    'data': CaseDetailSerializer(case).data,
                    'message': f'Case {case.case_number} created successfully'
                },
                status=status.HTTP_201_CREATED
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        case.status = CaseStatus.OPEN

        return Response(
            {
                'status': 'success',
                'data': CaseDetailSerializer(case).data,
                'message': f'Case {case.case_number} created. Pending approval.'
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='approvals')
    def approve(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)

        if case.status != CaseStatus.OPEN:
            return Response(
                {
                    'status': 'error',
                    'message': 'Case is not pending approval'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.has_role('Police Chief'):
            return Response(
                {
                    'status': 'error',
                    'message': 'Police Chief cases do not require approval'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CaseApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        message = serializer.validated_data.get('message', '')

        with transaction.atomic():
            if action_type == 'approve':
                case.status = CaseStatus.UNDER_INVESTIGATION
                if message:
                    case.notes += f"\n\nApproval note: {message}"
                case.save()

                return Response({
                    'status': 'success',
                    'data': CaseDetailSerializer(case).data,
                    'message': 'Case approved successfully'
                })

            else:
                case.status = CaseStatus.CLOSED
                if message:
                    case.notes += f"\n\nRejection note: {message}"
                case.save()

                return Response({
                    'status': 'success',
                    'data': CaseDetailSerializer(case).data,
                    'message': 'Case rejected'
                })

    @action(detail=True, methods=['put'], url_path='assigned-detective')
    def assign_detective(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)

        serializer = CaseAssignDetectiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        detective_id = serializer.validated_data['detective_id']
        detective = get_object_or_404(UserProfile, pk=detective_id)

        if not detective.has_role('Detective'):
            return Response(
                {
                    'status': 'error',
                    'message': 'User must be a detective'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        case.assigned_detective = detective
        if case.status == CaseStatus.OPEN:
            case.status = CaseStatus.UNDER_INVESTIGATION
        case.save()

        return Response({
            'status': 'success',
            'data': CaseDetailSerializer(case).data,
            'message': f'Detective {detective.get_full_name()} assigned to case'
        })

    @action(detail=False, methods=['get'], url_path='detectives')
    def detectives(self, request):
        detectives = UserProfile.objects.filter(
            roles__name='Detective',
            roles__is_active=True,
            is_active=True,
        ).distinct().order_by('first_name', 'last_name', 'username')

        data = [
            {
                'id': item.id,
                'full_name': item.get_full_name(),
                'username': item.username,
                'national_id': item.national_id,
            }
            for item in detectives
        ]

        return Response({'status': 'success', 'data': data})

    @action(detail=False, methods=['get'], url_path='judges')
    def judges(self, request):
        judges = UserProfile.objects.filter(
            roles__name='Judge',
            roles__is_active=True,
            is_active=True,
        ).distinct().order_by('first_name', 'last_name', 'username')

        data = [
            {
                'id': item.id,
                'full_name': item.get_full_name(),
                'username': item.username,
                'national_id': item.national_id,
            }
            for item in judges
        ]

        return Response({'status': 'success', 'data': data})

    @action(detail=True, methods=['post'], url_path='team-members')
    def add_team_member(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)
        member_id = request.data.get('member_id')

        if not member_id:
            return Response(
                {
                    'status': 'error',
                    'message': 'member_id is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        member = get_object_or_404(UserProfile, pk=member_id)
        case.team_members.add(member)

        return Response({
            'status': 'success',
            'data': CaseDetailSerializer(case).data,
            'message': f'Team member {member.get_full_name()} added'
        })

    @action(detail=True, methods=['delete'], url_path='team-members/(?P<member_id>[^/.]+)')
    def remove_team_member(self, request, pk=None, member_id=None):
        case = get_object_or_404(Case, pk=pk)
        member = get_object_or_404(UserProfile, pk=member_id)
        case.team_members.remove(member)

        return Response({
            'status': 'success',
            'data': CaseDetailSerializer(case).data,
            'message': f'Team member {member.get_full_name()} removed'
        })

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        total_cases = Case.objects.count()
        solved_cases = Case.objects.filter(status=CaseStatus.SOLVED).count()
        active_cases = Case.objects.filter(
            status__in=[CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION]
        ).count()
        open_cases = Case.objects.filter(status=CaseStatus.OPEN).count()
        under_investigation_cases = Case.objects.filter(
            status=CaseStatus.UNDER_INVESTIGATION
        ).count()
        closed_cases = Case.objects.filter(status=CaseStatus.CLOSED).count()
        archived_cases = Case.objects.filter(status=CaseStatus.ARCHIVED).count()

        cases_by_priority = Case.objects.values('priority').annotate(
            count=Count('id')
        ).order_by('priority')

        cases_by_status = Case.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')

        data = {
            'total_cases': total_cases,
            'solved_cases': solved_cases,
            'active_cases': active_cases,
            'open_cases': open_cases,
            'under_investigation_cases': under_investigation_cases,
            'closed_cases': closed_cases,
            'archived_cases': archived_cases,
            'cases_by_priority': {item['priority']: item['count'] for item in cases_by_priority},
            'cases_by_status': {item['status']: item['count'] for item in cases_by_status}
        }

        serializer = CaseStatisticsSerializer(data)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='all-names')
    def all_names(self, request):
        rows = Case.objects.order_by('-created_at').values('id', 'case_number', 'title')
        return Response({'status': 'success', 'data': list(rows)})

    @action(detail=True, methods=['get'], url_path='suspects/names')
    def suspect_names(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)
        links = SuspectCaseLink.objects.filter(case=case).select_related('suspect').order_by(
            'suspect__first_name', 'suspect__last_name', 'suspect_id'
        )
        data = [
            {
                'id': link.suspect_id,
                'full_name': link.suspect.full_name,
            }
            for link in links
        ]
        return Response({'status': 'success', 'data': data})

    @action(detail=False, methods=['get'], url_path='my-cases')
    def my_cases(self, request):
        user = request.user
        queryset = self.get_queryset()

        if user.has_role('Detective'):
            queryset = queryset.filter(
                Q(assigned_detective=user) | Q(team_members=user)
            ).distinct()
        else:
            queryset = queryset.none()

        serializer = CaseListSerializer(queryset, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data
        })

    @action(detail=True, methods=['get'], url_path='report')
    def report(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)

        can_view = request.user.is_superuser or request.user.has_any_role([
            'Judge', 'Captain', 'Police Chief', 'Sergeant', 'Detective'
        ])
        if not can_view:
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to view case reports.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        complaints = case.complaints.select_related('complainant').all()
        complainants = [
            {
                'id': complaint.id,
                'title': complaint.title,
                'description': complaint.description,
                'complainant': complaint.complainant.get_full_name(),
                'complainant_name': complaint.complainant.get_full_name(),
                'status': complaint.status,
                'incident_date': complaint.incident_date,
                'incident_location': complaint.incident_location,
                'created_at': complaint.created_at,
            }
            for complaint in complaints
        ]

        testimonies = WitnessTestimonySerializer(
            case.witnesstestimony_set.select_related('collected_by').all(),
            many=True,
        ).data

        evidence = []
        evidence.extend(BiologicalEvidenceSerializer(
            case.biologicalevidence_set.select_related('collected_by').all(),
            many=True,
        ).data)
        evidence.extend(VehicleEvidenceSerializer(
            case.vehicleevidence_set.select_related('collected_by').all(),
            many=True,
        ).data)
        evidence.extend(DocumentEvidenceSerializer(
            case.documentevidence_set.select_related('collected_by').all(),
            many=True,
        ).data)
        evidence.extend(OtherEvidenceSerializer(
            case.otherevidence_set.select_related('collected_by').all(),
            many=True,
        ).data)

        suspect_links = SuspectCaseLink.objects.filter(case=case).select_related('suspect')
        suspects = [
            {
                'id': link.suspect.id,
                'first_name': link.suspect.first_name,
                'last_name': link.suspect.last_name,
                'full_name': link.suspect.full_name,
                'national_id': link.suspect.national_id,
                'status': link.suspect.status,
                'is_wanted': link.suspect.is_wanted,
            }
            for link in suspect_links
        ]

        detective_reports = [
            {
                'id': item.id,
                'status': item.status,
                'detective_message': item.detective_message,
                'sergeant_message': item.sergeant_message,
                'submitted_at': item.submitted_at,
                'reviewed_at': item.reviewed_at,
                'detective_name': item.detective.get_full_name() if item.detective else '-',
                'sergeant_name': item.sergeant.get_full_name() if item.sergeant else '-',
            }
            for item in DetectiveReport.objects.filter(case=case)
            .select_related('detective', 'sergeant')
            .order_by('-submitted_at')
        ]

        def _staff_payload(user):
            role_name = user.roles.filter(is_active=True).values_list('name', flat=True).first() or '-'
            return {
                'id': user.id,
                'full_name': user.get_full_name(),
                'username': user.username,
                'role': role_name,
            }

        staff = []
        if case.assigned_detective:
            staff.append(_staff_payload(case.assigned_detective))
        staff.extend(_staff_payload(member) for member in case.team_members.all())

        return Response({
            'status': 'success',
            'data': {
                'case': CaseDetailSerializer(case).data,
                'complainants': complainants,
                'testimonies': testimonies,
                'evidence': evidence,
                'suspects': suspects,
                'staff': staff,
                'detective_reports': detective_reports,
            }
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsSergeant])  # Ensuring only Sergeant can approve
    def approve_and_release(self, request, pk=None):
        case = get_object_or_404(Case, pk=pk)
        
        # Check if the case is LEVEL2 or LEVEL3
        if case.case_priority not in ['LEVEL2', 'LEVEL3']:
            return Response({"error": "Bail and fine release is not available for this case."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if Sergeant's approval is granted
        if not case.sergeant_approval:
            return Response({"error": "Sergeant approval is required for release."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Process the payment (this is where payment gateway logic is triggered)
        payment_successful = self.process_payment(case.bail_amount or case.fine_amount)
        
        if payment_successful:
            # Update the case status to "RELEASED"
            case.status = 'RELEASED'
            case.save()
            return Response({"success": "Suspect released after payment."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Payment failed."}, status=status.HTTP_400_BAD_REQUEST)

    def process_payment(self, amount):
        # Implement your payment gateway integration here (e.g., Stripe)
        # For this example, we simulate payment success
        return True  # Simulating a successful payment