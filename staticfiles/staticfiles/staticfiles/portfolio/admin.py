from django.contrib import admin
from django.utils.html import format_html
from .models import PortfolioItem

@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_name', 'category', 'image_preview', 'display_order', 'is_featured')
    list_editable = ('display_order', 'is_featured')
    search_fields = ('project_name', 'category', 'description')
    prepopulated_fields = {'slug': ('project_name',)}
    fieldsets = (
        ('Project Details', {
            'fields': ('project_name', 'slug', 'category', 'description', 'image_url', 'client_link', 'display_order', 'is_featured')
        }),
    )

    def image_preview(self, obj):
        if obj.image_url:
            return format_html('<img src="{}" style="height: 35px; width: 60px; object-fit: cover; border-radius: 6px;" />', obj.image_url)
        return 'No Image'
    image_preview.short_description = 'Image'
