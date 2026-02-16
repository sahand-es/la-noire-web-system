from django.urls import path, include
from core.views import public_statistics

app_name = 'core'

urlpatterns = [
    path('public/statistics/', public_statistics, name='public-statistics'),
    path('', include('cases.urls')),
    path('investigation/', include('investigation.urls')),
    path('', include('rewards.urls')),
]
