from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('health/db', views.health_db, name='health_db'),
    path('auth/login', views.auth_login, name='auth_login'),
    path('auth/me', views.auth_me, name='auth_me'),
    
    path('leads', views.leads_api, name='leads_api'),
    path('leads/', views.leads_api),
    path('leads/<int:lead_id>', views.leads_api, name='leads_detail_api'),
    path('leads/update', views.lead_update, name='lead_update'),
    path('leads/notes', views.lead_notes, name='lead_notes'),
    
    path('stats', views.stats_api, name='stats_api'),
    path('stats/', views.stats_api),
    
    path('visitors', views.visitors_api, name='visitors_api'),
    path('visitors/', views.visitors_api),
    
    path('track', views.track_api, name='track_api'),
    path('track/', views.track_api),
    
    path('agency-team', views.agency_team, name='agency_team'),
    path('agency-team/', views.agency_team),
    path('team', views.agency_team, name='team'),
    path('team/', views.agency_team),
    
    path('services', views.public_services, name='services'),
    path('services/', views.public_services),
    
    path('blogs', views.public_blogs, name='blogs'),
    path('blogs/', views.public_blogs),
    
    path('case-studies', views.case_studies_api, name='case_studies_api'),
    path('case-studies/', views.case_studies_api),
    
    path('portfolio', views.portfolio_api, name='portfolio_api'),
    path('portfolio/', views.portfolio_api),
    
    path('appointments', views.appointments_api, name='appointments_api'),
    path('appointments/', views.appointments_api),
    
    path('security-logs', views.security_logs_api, name='security_logs_api'),
    path('security-logs/', views.security_logs_api),
    
    path('settings', views.settings_api, name='settings_api'),
    path('settings/', views.settings_api),
    path('cms', views.settings_api, name='cms_api'),
    path('cms/', views.settings_api),
]
