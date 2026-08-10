from django.contrib import admin
from django.utils.html import format_html
from .models import CaseStudy

@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_title', 'client_name', 'image_preview', 'created_at')
    search_fields = ('project_title', 'client_name', 'problem', 'solution', 'results')
    prepopulated_fields = {'slug': ('project_title',)}
    fieldsets = (
        ('Case Study Overview', {
            'fields': ('project_title', 'slug', 'client_name', 'featured_image')
        }),
        ('Case Study Narrative', {
            'fields': ('problem', 'solution', 'results')
        })
    )

    def image_preview(self, obj):
        if obj.featured_image:
            return format_html('<img src="{}" style="height: 35px; width: 60px; object-fit: cover; border-radius: 6px;" />', obj.featured_image)
        return 'No Image'
    image_preview.short_description = 'Featured Image'
