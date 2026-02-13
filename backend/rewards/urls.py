from rest_framework.routers import DefaultRouter
from .views.reward import RewardViewSet

router = DefaultRouter()
router.register(r'rewards', RewardViewSet, basename='reward')

app_name = 'rewards'

urlpatterns = [
    *router.urls,
]
