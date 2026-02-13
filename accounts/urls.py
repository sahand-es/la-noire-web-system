from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileView,
    ChangePasswordView,
    RoleViewSet,
    UserViewSet,
)

app_name = 'accounts'

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/registrations/', UserRegistrationView.as_view(), name='register'),
    path('auth/sessions/', UserLoginView.as_view(), name='login'),
    path('auth/sessions/current/', UserLogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('auth/password/', ChangePasswordView.as_view(), name='change-password'),
    path('', include(router.urls)),
]
