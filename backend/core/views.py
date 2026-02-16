from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count

from cases.models import Case, CaseStatus
from core.models import UserProfile


@api_view(['GET'])
@permission_classes([AllowAny])
def public_statistics(request):
    """
    Public statistics endpoint for homepage display.
    Does not require authentication.
    
    Returns:
        - solved_cases: Total number of solved cases
        - active_cases: Total number of open and under investigation cases
        - total_employees: Total number of registered users
        - total_cases: Total number of cases in the system
    """
    solved_cases = Case.objects.filter(status=CaseStatus.SOLVED).count()
    active_cases = Case.objects.filter(
        status__in=[CaseStatus.OPEN, CaseStatus.UNDER_INVESTIGATION]
    ).count()
    total_employees = UserProfile.objects.filter(is_active=True).count()
    total_cases = Case.objects.count()
    
    return Response({
        'status': 'success',
        'data': {
            'solved_cases': solved_cases,
            'active_cases': active_cases,
            'total_employees': total_employees,
            'total_cases': total_cases,
        }
    })
