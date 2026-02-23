"""
Investigation app URLs (global scope).
Mount at: core/investigation/
- Notifications (user's notifications)
- Intensive Pursuit (PROJECT Suspect Status)
Case-scoped routes (evidence-links, detective-reports, suspect-links, trial) are in case_urls.py, mounted at core/cases/<case_pk>/investigation/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.case_resolution import NotificationViewSet
from .views.intensive_pursuit import IntensivePursuitViewSet

from .views.content_types import ContentTypeViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'intensive-pursuit', IntensivePursuitViewSet, basename='intensive-pursuit')
router.register(r'content-types', ContentTypeViewSet, basename='content-types')

app_name = 'investigation'

urlpatterns = [
    path('', include(router.urls)),
]
