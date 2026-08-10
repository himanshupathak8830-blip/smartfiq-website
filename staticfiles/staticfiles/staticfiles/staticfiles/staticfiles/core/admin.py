from django.contrib import admin
from django.utils.html import format_html
from .models import Lead, LeadNote, Appointment, TeamMember, Visitor, SecurityLog, SiteSetting

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'phone', 'budget', 'status_badge', 'lead_score', 'created_at')
    list_filter = ('status', 'priority', 'source', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company', 'message')

    def status_badge(self, obj):
        colors = {
            'new': '#00658d',
            'contacted': '#f59e0b',
            'qualified': '#10b981',
            'closed': '#6b7280'
        }
        color = colors.get(obj.status.lower(), '#3b82f6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">{}</span>',
            color, obj.status.upper()
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

@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'ip_address', 'location', 'country_type_badge', 'type_badge', 'device', 'browser', 'current_page', 'page_views', 'last_active')
    list_filter = ('visitor_type', 'country_type', 'device', 'browser', 'is_bot', 'last_active')
    search_fields = ('session_id', 'ip_address', 'location', 'current_page', 'email')
    ordering = ('-last_active',)

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

@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'username', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'updated_at')
