from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('about-smartfiq', views.about, name='about'),
    path('our-story', views.our_story, name='our_story'),
    path('contact', views.contact, name='contact'),
    path('faq', views.faq, name='faq'),
    path('terms', views.terms, name='terms'),
    path('privacy-policy', views.privacy, name='privacy'),
]
