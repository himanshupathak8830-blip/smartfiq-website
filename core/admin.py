from django.contrib import admin
from django.utils.html import format_html
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
import threading, requests

from .models import Lead, LeadNote, Appointment, TeamMember, Visitor, SecurityLog, SiteSetting

from core.google_sheets import GoogleSheetsService

# --- USER POST-SAVE SIGNAL: SYNC USER TO GOOGLE SHEET WITH HASHED PASSWORDS ---
@receiver(post_save, sender=User)
def sync_user_to_google_sheet_signal(sender, instance, created, **kwargs):
    try:
        GoogleSheetsService.send_user(instance)
    except Exception as e:
        print("Google Sheet User Signal Warning:", e)

class ReadOnlyForTestUserMixin:
    def has_add_permission(self, request):
        if request.user and (request.user.username == 'testuser' or not request.user.is_superuser):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if request.user and (request.user.username == 'testuser' or not request.user.is_superuser):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if request.user and (request.user.username == 'testuser' or not request.user.is_superuser):
            return False
        return super().has_delete_permission(request, obj)

# --- LEAD ADMIN ---
@admin.register(Lead)
class LeadAdmin(ReadOnlyForTestUserMixin, admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'phone', 'budget', 'source', 'status_badge', 'lead_score', 'created_at')
    list_filter = ('status', 'priority', 'source', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company', 'message')
    ordering = ('-created_at',)

    def status_badge(self, obj):
        colors = {
            'new': '#00658d',
            'contacted': '#f59e0b',
            'qualified': '#10b981',
            'closed': '#6b7280'
        }
        color = colors.get(str(obj.status).lower(), '#3b82f6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px;">{}</span>',
            color, str(obj.status).upper()
        )
    status_badge.short_description = 'Status'

@admin.register(LeadNote)
class LeadNoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'lead', 'user', 'created_at')

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'client_name', 'service', 'meeting_type', 'appointment_date', 'status')
    list_filter = ('status', 'meeting_type')

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'role', 'revenue', 'leads_count', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active')

# --- VISITOR ADMIN WITH DETAILED MOBILE vs PC BADGES ---
@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'ip_address', 'device_badge', 'location', 'country_type_badge', 'type_badge', 'browser', 'current_page', 'page_views', 'last_active')
    list_filter = ('visitor_type', 'country_type', 'device', 'browser', 'is_bot', 'last_active')
    search_fields = ('session_id', 'ip_address', 'location', 'current_page', 'email')
    ordering = ('-last_active',)

    def device_badge(self, obj):
        device_str = str(obj.device or '')
        if 'Mobile' in device_str or 'iPhone' in device_str or 'Android' in device_str:
            return format_html(
                '<span style="background-color: #ec4899; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">📱 {}</span>',
                device_str or 'Mobile'
            )
        elif 'Tablet' in device_str or 'iPad' in device_str:
            return format_html(
                '<span style="background-color: #8b5cf6; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">📟 {}</span>',
                device_str or 'Tablet'
            )
        return format_html(
            '<span style="background-color: #0284c7; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">💻 {}</span>',
            device_str or 'Desktop PC'
        )
    device_badge.short_description = 'Device (Mobile / PC)'

    def type_badge(self, obj):
        if obj.visitor_type == 'Bot' or obj.is_bot:
            return format_html(
                '<span style="background-color: #ef4444; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">🤖 BOT</span>'
            )
        return format_html(
            '<span style="background-color: #10b981; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">👤 HUMAN</span>'
        )
    type_badge.short_description = 'Visitor Type'

    def country_type_badge(self, obj):
        if obj.country_type == 'International':
            return format_html(
                '<span style="background-color: #f59e0b; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">🌍 {}</span>',
                obj.location
            )
        return format_html(
            '<span style="background-color: #3b82f6; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">🇮🇳 {}</span>',
            obj.location
        )
    country_type_badge.short_description = 'Location & Origin'

# --- SECURITY LOG ADMIN ---
@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'username', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')
    ordering = ('-created_at',)

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'updated_at')
