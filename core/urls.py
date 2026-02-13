from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.reward import RewardViewSet

router = DefaultRouter()
router.register(r'rewards', RewardViewSet, basename='reward')

app_name = 'core'

urlpatterns = [
    path('', include('cases.urls')),
    path('', include('investigation.urls')),
    path('', include(router.urls)),
]
