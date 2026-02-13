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

# Reusable action maps for nested case evidence view sets (same CRUD surface each)
LIST_CREATE = {'get': 'list', 'post': 'create'}
DETAIL = {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}


def case_evidence_paths(prefix, viewset, list_name, detail_name=None, extra_actions=None):
    """Build list+detail paths for evidence nested under a case. Optionally add extra action paths."""
    detail_name = detail_name or f'{list_name.rstrip("s")}-detail'  # e.g. case-witness-testimonies -> case-witness-testimony-detail
    base = f'cases/<int:case_pk>/{prefix}'
    paths = [
        path(f'{base}/', viewset.as_view(LIST_CREATE), name=list_name),
        path(f'{base}/<int:pk>/', viewset.as_view(DETAIL), name=detail_name),
    ]
    for action_path, method_action in (extra_actions or []):
        name = f'{detail_name.replace("-detail", "")}-{action_path.rstrip("/")}'
        paths.append(path(f'{base}/<int:pk>/{action_path}', viewset.as_view(method_action), name=name))
    return paths


router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'complaints', ComplaintViewSet, basename='complaint')

app_name = 'cases'

urlpatterns = [
    *case_evidence_paths('witness-testimonies', WitnessTestimonyViewSet, 'case-witness-testimonies', 'case-witness-testimony-detail'),
    *case_evidence_paths(
        'biological-evidence',
        BiologicalEvidenceViewSet,
        'case-biological-evidence',
        'case-biological-evidence-detail',
        extra_actions=[('coroner-approvals/', {'post': 'coroner_approvals'})],
    ),
    *case_evidence_paths('vehicle-evidence', VehicleEvidenceViewSet, 'case-vehicle-evidence', 'case-vehicle-evidence-detail'),
    *case_evidence_paths('document-evidence', DocumentEvidenceViewSet, 'case-document-evidence', 'case-document-evidence-detail'),
    *case_evidence_paths('other-evidence', OtherEvidenceViewSet, 'case-other-evidence', 'case-other-evidence-detail'),
    path('', include(router.urls)),
]
