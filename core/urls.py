from django.urls import path, include

app_name = 'core'

urlpatterns = [
    path('', include('cases.urls')),
    path('investigation/', include('investigation.urls')),
    path('', include('rewards.urls')),
]
