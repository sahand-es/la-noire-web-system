"""
Case-scoped investigation URLs.
Mount at: cases/<int:case_pk>/investigation/
Covers: Detective Board (evidence-links), detective reports, suspect-links, trial (PROJECT Case Resolution, Suspect Identification, Trial).
"""
from django.urls import path, include
from .views.case_resolution import EvidenceLinkViewSet, DetectiveReportViewSet
from .views.suspect import SuspectCaseLinkViewSet
from .views.trial import TrialViewSet

app_name = 'investigation_case'

urlpatterns = [
    path('evidence-links/', EvidenceLinkViewSet.as_view({'get': 'list', 'post': 'create'}), name='evidence-links'),
    path('evidence-links/<int:pk>/', EvidenceLinkViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='evidence-link-detail'),
    path('detective-reports/', DetectiveReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='detective-reports'),
    path('detective-reports/<int:pk>/', DetectiveReportViewSet.as_view({'get': 'retrieve'}), name='detective-report-detail'),
    path('detective-reports/<int:pk>/sergeant-reviews/', DetectiveReportViewSet.as_view({'post': 'sergeant_review'}), name='detective-report-sergeant-reviews'),
    path('suspect-links/', SuspectCaseLinkViewSet.as_view({'get': 'list', 'post': 'create'}), name='suspect-links'),
    path('suspect-links/<int:pk>/', SuspectCaseLinkViewSet.as_view({'get': 'retrieve'}), name='suspect-link-detail'),
    path('suspect-links/<int:pk>/detective-assessment/', SuspectCaseLinkViewSet.as_view({'post': 'detective_assessment'}), name='suspect-link-detective-assessment'),
    path('suspect-links/<int:pk>/sergeant-assessment/', SuspectCaseLinkViewSet.as_view({'post': 'sergeant_assessment'}), name='suspect-link-sergeant-assessment'),
    path('suspect-links/<int:pk>/captain-opinion/', SuspectCaseLinkViewSet.as_view({'post': 'captain_opinion'}), name='suspect-link-captain-opinion'),
    path('suspect-links/<int:pk>/chief-approval/', SuspectCaseLinkViewSet.as_view({'post': 'chief_approval'}), name='suspect-link-chief-approval'),
    path('suspect-links/<int:pk>/mark-as-wanted/', SuspectCaseLinkViewSet.as_view({'post': 'mark_as_wanted'}), name='suspect-link-mark-as-wanted'),
    path('suspect-links/<int:pk>/mark-as-captured/', SuspectCaseLinkViewSet.as_view({'post': 'mark_as_captured'}), name='suspect-link-mark-as-captured'),
    path('trial/', TrialViewSet.as_view({'get': 'retrieve', 'post': 'create'}), name='trial'),
    path('trial/record-verdict/', TrialViewSet.as_view({'post': 'record_verdict'}), name='trial-record-verdict'),
]
