from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Post

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'status_badge', 'cover_preview', 'reading_time', 'published_at', 'view_count')
    list_filter = ('status', 'category', 'published_at')
    search_fields = ('title', 'excerpt', 'body', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ()
    fieldsets = (
        ('Article Overview', {
            'fields': ('title', 'slug', 'category', 'status', 'excerpt')
        }),
        ('Media & Links', {
            'fields': ('cover_image_url', 'youtube_url')
        }),
        ('Content Body', {
            'fields': ('body',)
        }),
        ('SEO & Metadata', {
            'fields': ('meta_title', 'meta_description', 'keywords', 'reading_time')
        })
    )

    def status_badge(self, obj):
        color = '#10b981' if obj.status == 'published' else '#f59e0b'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'

    def cover_preview(self, obj):
        if obj.cover_image_url:
            return format_html('<img src="{}" style="height: 35px; width: 60px; object-fit: cover; border-radius: 6px;" />', obj.cover_image_url)
        return 'No Image'
    cover_preview.short_description = 'Cover'
