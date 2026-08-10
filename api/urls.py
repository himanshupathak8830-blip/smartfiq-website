from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('health/db', views.health_db, name='health_db'),
    path('leads', views.lead_create, name='lead_create'),
    path('agency-team', views.agency_team, name='agency_team'),
    path('team', views.agency_team, name='team'),
    path('services', views.public_services, name='services'),
    path('blogs', views.public_blogs, name='blogs'),
]
