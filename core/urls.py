from django.urls import path, include

app_name = 'core'

urlpatterns = [
    path('', include('cases.urls')),
    path('', include('investigation.urls')),
    path('', include('rewards.urls')),
]
