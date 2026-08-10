from django.contrib import admin
from .models import CaseStudy

@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_title', 'client_name', 'created_at')
    prepopulated_fields = {'slug': ('project_title',)}
