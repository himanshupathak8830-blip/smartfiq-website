from django.contrib import admin
from django.utils.html import format_html
from .models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'icon_preview', 'pricing_info', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active')
    search_fields = ('title', 'description')
    prepopulated_fields = {'slug': ('title',)}
    fieldsets = (
        ('Service Details', {
            'fields': ('title', 'slug', 'description', 'icon', 'pricing_info', 'display_order', 'is_active')
        }),
        ('Features & Deliverables', {
            'fields': ('features',)
        })
    )

    def icon_preview(self, obj):
        return format_html('<span class="material-symbols-outlined" style="font-size: 20px; color: #00658d;">{}</span> {}', obj.icon or 'settings', obj.icon or 'settings')
    icon_preview.short_description = 'Icon'
