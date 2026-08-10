from django.urls import path
from . import views

app_name = 'case_studies'

urlpatterns = [
    path('', views.list_case_studies, name='list'),
    path('<slug:slug>', views.detail_case_study, name='detail'),
]
