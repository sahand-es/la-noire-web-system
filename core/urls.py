from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.user import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileView,
    ChangePasswordView
)
from .views.case import CaseViewSet
from .views.complaint import ComplaintViewSet

router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'complaints', ComplaintViewSet, basename='complaint')

app_name = 'core'

urlpatterns = [
    path('auth/registrations/', UserRegistrationView.as_view(), name='register'),
    path('auth/sessions/', UserLoginView.as_view(), name='login'),
    path('auth/sessions/current/', UserLogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('auth/password/', ChangePasswordView.as_view(), name='change-password'),
    path('', include(router.urls)),
]
