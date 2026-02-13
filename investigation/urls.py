from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.case_resolution import EvidenceLinkViewSet, DetectiveReportViewSet, NotificationViewSet
from .views.suspect import SuspectCaseLinkViewSet

# All under /core/investigation/ (see core/urls.py). Case resources: cases/<case_pk>/...
P = 'cases/<int:case_pk>'

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

app_name = 'investigation'

urlpatterns = [
    # Evidence links (detective board "red lines")
    path(f'{P}/evidence-links/', EvidenceLinkViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-evidence-links'),
    path(f'{P}/evidence-links/<int:pk>/', EvidenceLinkViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='case-evidence-link-detail'),
    # Detective reports + sergeant review
    path(f'{P}/detective-reports/', DetectiveReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-detective-reports'),
    path(f'{P}/detective-reports/<int:pk>/', DetectiveReportViewSet.as_view({'get': 'retrieve'}), name='case-detective-report-detail'),
    path(f'{P}/detective-reports/<int:pk>/sergeant-reviews/', DetectiveReportViewSet.as_view({'post': 'sergeant_review'}), name='case-detective-report-sergeant-reviews'),
    # Suspect-case links (guilt scores, captain opinion, chief approval)
    path(f'{P}/suspect-links/', SuspectCaseLinkViewSet.as_view({'get': 'list'}), name='case-suspect-links'),
    path(f'{P}/suspect-links/<int:pk>/', SuspectCaseLinkViewSet.as_view({'get': 'retrieve'}), name='case-suspect-link-detail'),
    path(f'{P}/suspect-links/<int:pk>/detective-assessment/', SuspectCaseLinkViewSet.as_view({'post': 'detective_assessment'}), name='case-suspect-link-detective-assessment'),
    path(f'{P}/suspect-links/<int:pk>/sergeant-assessment/', SuspectCaseLinkViewSet.as_view({'post': 'sergeant_assessment'}), name='case-suspect-link-sergeant-assessment'),
    path(f'{P}/suspect-links/<int:pk>/captain-opinion/', SuspectCaseLinkViewSet.as_view({'post': 'captain_opinion'}), name='case-suspect-link-captain-opinion'),
    path(f'{P}/suspect-links/<int:pk>/chief-approval/', SuspectCaseLinkViewSet.as_view({'post': 'chief_approval'}), name='case-suspect-link-chief-approval'),
    path('', include(router.urls)),
]
