from django.contrib import admin
from django.utils.html import format_html
from services.google_sheets import GoogleSheetsService
from .models import CaseStudy

@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_title', 'client_name', 'category', 'status', 'image_preview', 'created_at')
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('project_title', 'client_name', 'description', 'problem', 'solution', 'results', 'content')
    prepopulated_fields = {'slug': ('project_title',)}
    readonly_fields = ('created_at', 'updated_at')
    actions = ('publish_case_studies', 'unpublish_case_studies')
    fieldsets = (
        ('Case Study Overview', {
            'fields': ('project_title', 'slug', 'client_name', 'category', 'description', 'status', 'featured_image')
        }),
        ('Case Study Narrative', {
            'fields': ('problem', 'solution', 'results', 'content')
        }),
        ('SEO', {
            'fields': ('seo_title', 'seo_description')
        })
    )

    def image_preview(self, obj):
        if obj.featured_image:
            return format_html('<img src="{}" style="height: 35px; width: 60px; object-fit: cover; border-radius: 6px;" />', obj.featured_image)
        return 'No Image'
    image_preview.short_description = 'Featured Image'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        GoogleSheetsService.sync_case_study(obj)

    @admin.action(description='Publish selected case studies')
    def publish_case_studies(self, request, queryset):
        for item in queryset:
            item.status = CaseStudy.Status.PUBLISHED
            item.save()
            GoogleSheetsService.sync_case_study(item)

    @admin.action(description='Unpublish selected case studies')
    def unpublish_case_studies(self, request, queryset):
        for item in queryset:
            item.status = CaseStudy.Status.DRAFT
            item.save()
            GoogleSheetsService.sync_case_study(item)
