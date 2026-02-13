from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.case_resolution import (
    EvidenceLinkViewSet,
    DetectiveReportViewSet,
    NotificationViewSet,
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

app_name = 'investigation'

urlpatterns = [
    path('cases/<int:case_pk>/evidence-links/', EvidenceLinkViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-evidence-links'),
    path('cases/<int:case_pk>/evidence-links/<int:pk>/', EvidenceLinkViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='case-evidence-link-detail'),
    path('cases/<int:case_pk>/detective-reports/', DetectiveReportViewSet.as_view({'get': 'list', 'post': 'create'}), name='case-detective-reports'),
    path('cases/<int:case_pk>/detective-reports/<int:pk>/', DetectiveReportViewSet.as_view({'get': 'retrieve'}), name='case-detective-report-detail'),
    path('cases/<int:case_pk>/detective-reports/<int:pk>/sergeant-reviews/', DetectiveReportViewSet.as_view({'post': 'sergeant_review'}), name='case-detective-report-sergeant-reviews'),
    path('', include(router.urls)),
]
