from django.contrib import admin
from .models import Lead, LeadNote, Appointment, TeamMember, Visitor, SecurityLog, SiteSetting

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'phone', 'budget', 'status', 'lead_score', 'created_at')
    list_filter = ('status', 'priority', 'source', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company', 'message')

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
    list_display = ('session_id', 'ip_address', 'location', 'device', 'browser', 'page_views', 'last_active')
    list_filter = ('device', 'browser', 'is_bot')
    search_fields = ('session_id', 'ip_address', 'location')

@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'username', 'ip_address', 'created_at')
    list_filter = ('action', 'created_at')

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'updated_at')
