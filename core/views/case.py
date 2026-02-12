from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from core.models import Case, CaseStatus, UserProfile
from core.serializers.case import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateFromSceneSerializer,
    CaseUpdateSerializer,
    CaseApprovalSerializer,
    CaseAssignDetectiveSerializer,
    CaseStatisticsSerializer
)
from core.permissions import (
    IsPoliceRankExceptCadet,
    IsPoliceChief,
    IsDetective,
    IsSergeant,
    IsCaptain,
    IsOfficer,
    IsCadetOrOfficer,
    IsDetectiveOrSergeantOrChief,
    IsSergeantOrCaptainOrChief
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
        if self.action == 'create':
            return [IsPoliceRankExceptCadet()]
        if self.action == 'list':
            return [IsCadetOrOfficer()]
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
                Q(assigned_detective=user) | Q(team_members=user)
            ).distinct()
        elif user.has_role('Cadet'):
            queryset = queryset.filter(status=CaseStatus.OPEN)
        elif user.has_any_role(['Police Officer', 'Sergeant', 'Captain', 'Police Chief']):
            pass
        else:
            queryset = queryset.none()

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
            case.status = CaseStatus.OPEN

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
