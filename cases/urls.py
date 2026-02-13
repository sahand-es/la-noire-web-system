from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.case import CaseViewSet
from .views.complaint import ComplaintViewSet
from .views.evidence import (
    WitnessTestimonyViewSet,
    BiologicalEvidenceViewSet,
    VehicleEvidenceViewSet,
    DocumentEvidenceViewSet,
    OtherEvidenceViewSet,
)
from .views.case_resolution import (
    EvidenceLinkViewSet,
    DetectiveReportViewSet,
    NotificationViewSet,
)

router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'complaints', ComplaintViewSet, basename='complaint')
router.register(r'notifications', NotificationViewSet, basename='notification')

app_name = 'cases'

urlpatterns = [
    path('cases/<int:case_pk>/witness-testimonies/', WitnessTestimonyViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-witness-testimonies'),
    path('cases/<int:case_pk>/witness-testimonies/<int:pk>/', WitnessTestimonyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='case-witness-testimony-detail'),
    path('cases/<int:case_pk>/biological-evidence/', BiologicalEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-biological-evidence'),
    path('cases/<int:case_pk>/biological-evidence/<int:pk>/', BiologicalEvidenceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='case-biological-evidence-detail'),
    path('cases/<int:case_pk>/biological-evidence/<int:pk>/coroner-approvals/', BiologicalEvidenceViewSet.as_view({'post': 'coroner_approvals'}), name='case-biological-evidence-coroner-approvals'),
    path('cases/<int:case_pk>/vehicle-evidence/', VehicleEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-vehicle-evidence'),
    path('cases/<int:case_pk>/vehicle-evidence/<int:pk>/', VehicleEvidenceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='case-vehicle-evidence-detail'),
    path('cases/<int:case_pk>/document-evidence/', DocumentEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-document-evidence'),
    path('cases/<int:case_pk>/document-evidence/<int:pk>/', DocumentEvidenceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='case-document-evidence-detail'),
    path('cases/<int:case_pk>/other-evidence/', OtherEvidenceViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-other-evidence'),
    path('cases/<int:case_pk>/other-evidence/<int:pk>/', OtherEvidenceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='case-other-evidence-detail'),
    path('cases/<int:case_pk>/evidence-links/', EvidenceLinkViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-evidence-links'),
    path('cases/<int:case_pk>/evidence-links/<int:pk>/', EvidenceLinkViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='case-evidence-link-detail'),
    path('cases/<int:case_pk>/detective-reports/', DetectiveReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-detective-reports'),
    path('cases/<int:case_pk>/detective-reports/<int:pk>/', DetectiveReportViewSet.as_view({'get': 'retrieve'}), name='case-detective-report-detail'),
    path('cases/<int:case_pk>/detective-reports/<int:pk>/sergeant-reviews/', DetectiveReportViewSet.as_view({'post': 'sergeant_review'}), name='case-detective-report-sergeant-reviews'),
    path('', include(router.urls)),
]
