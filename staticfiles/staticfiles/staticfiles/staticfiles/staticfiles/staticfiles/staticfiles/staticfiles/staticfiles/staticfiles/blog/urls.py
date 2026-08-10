from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.list_posts, name='list'),
    path('<slug:slug>', views.detail_post, name='detail'),
]
