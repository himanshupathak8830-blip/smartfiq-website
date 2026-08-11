from django.contrib import admin
from django.contrib.admin import AdminSite
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import Group, Permission, User
from django.core.exceptions import PermissionDenied
from django.db.models import Count
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from services.google_sheets import GoogleSheetsService

from .models import Appointment, Lead, LeadNote, SecurityLog, SiteSetting, Subscriber, TeamMember, Visitor


PRIMARY_SUPERUSER = "smartfiq"


def _request_meta(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    ua = user_agent.lower()
    device = "Mobile" if any(x in ua for x in ("iphone", "android", "mobile")) else ("Tablet" if any(x in ua for x in ("ipad", "tablet")) else "Desktop")
    browser = "Edge" if "edg" in ua else "Chrome" if "chrome" in ua else "Safari" if "safari" in ua else "Firefox" if "firefox" in ua else "Unknown"
    os_name = "iOS" if any(x in ua for x in ("iphone", "ipad")) else "Android" if "android" in ua else "macOS" if "mac os" in ua or "macintosh" in ua else "Windows" if "windows" in ua else "Linux" if "linux" in ua else "Unknown"
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    return ip, user_agent, device, browser, os_name


def record_security_event(request, action, obj=None, details="", status="SUCCESS"):
    ip, user_agent, device, browser, os_name = _request_meta(request)
    log = SecurityLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        username=request.user.username if request.user.is_authenticated else "",
        action=action,
        target_type=obj.__class__.__name__ if obj else "",
        target_id=str(getattr(obj, "pk", "")) if obj else "",
        details=details,
        ip_address=ip,
        user_agent=user_agent,
        device=device,
        browser=browser,
        os=os_name,
        status=status,
    )
    GoogleSheetsService.create_security_log(log)
    return log


class SheetSyncAdminMixin:
    security_create_action = None
    security_update_action = None
    security_delete_action = None

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = self.security_update_action if change else self.security_create_action
        if action:
            record_security_event(request, action, obj, f"{'Updated' if change else 'Created'} {obj}")
        sync_method = getattr(self, "sync_to_sheet", None)
        if sync_method:
            sync_method(obj)

    def delete_model(self, request, obj):
        if self.security_delete_action:
            record_security_event(request, self.security_delete_action, obj, f"Deleted {obj}")
        super().delete_model(request, obj)


class SuperuserProtectionMixin:
    def _is_primary_superuser(self, obj):
        return bool(obj and obj.username == PRIMARY_SUPERUSER and obj.is_superuser)

    def has_delete_permission(self, request, obj=None):
        if self._is_primary_superuser(obj) and request.user.username != PRIMARY_SUPERUSER:
            return False
        return super().has_delete_permission(request, obj)

    def delete_model(self, request, obj):
        if self._is_primary_superuser(obj) and request.user.username != PRIMARY_SUPERUSER:
            raise PermissionDenied("The primary Super Admin cannot be removed by another admin.")
        super().delete_model(request, obj)

    def save_model(self, request, obj, form, change):
        if change and obj.username == PRIMARY_SUPERUSER and request.user.username != PRIMARY_SUPERUSER:
            original = User.objects.get(pk=obj.pk)
            obj.is_active = original.is_active
            obj.is_staff = True
            obj.is_superuser = True
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        obj = form.instance
        original_groups = original_permissions = None
        if change and self._is_primary_superuser(obj) and request.user.username != PRIMARY_SUPERUSER:
            original = User.objects.get(pk=obj.pk)
            original_groups = list(original.groups.all())
            original_permissions = list(original.user_permissions.all())

        super().save_related(request, form, formsets, change)

        if original_groups is not None and original_permissions is not None:
            obj.groups.set(original_groups)
            obj.user_permissions.set(original_permissions)
            obj.is_active = True
            obj.is_staff = True
            obj.is_superuser = True
            obj.save(update_fields=["is_active", "is_staff", "is_superuser"])


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(SuperuserProtectionMixin, DjangoUserAdmin):
    list_display = ("username", "full_name", "email", "role_list", "is_active", "is_staff", "is_superuser", "last_login", "date_joined")
    list_filter = ("is_active", "is_staff", "is_superuser", "groups", "date_joined", "last_login")
    search_fields = ("username", "email", "first_name", "last_name")
    actions = ("activate_users", "deactivate_users")

    @admin.display(description="Full name")
    def full_name(self, obj):
        return obj.get_full_name() or "-"

    @admin.display(description="Role/group")
    def role_list(self, obj):
        groups = list(obj.groups.values_list("name", flat=True))
        return ", ".join(groups) or ("SUPER_ADMIN" if obj.is_superuser else "VIEWER")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = SecurityLog.Action.UPDATE_USER if change else SecurityLog.Action.CREATE_USER
        record_security_event(request, action, obj, f"{'Updated' if change else 'Created'} user {obj.username}")
        GoogleSheetsService.sync_user_metadata(obj, created_by=request.user.username)

    def delete_model(self, request, obj):
        record_security_event(request, SecurityLog.Action.DELETE_USER, obj, f"Deleted user {obj.username}")
        super().delete_model(request, obj)

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        for user in queryset:
            if user.username == PRIMARY_SUPERUSER and request.user.username != PRIMARY_SUPERUSER:
                continue
            user.is_active = True
            user.save()

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        for user in queryset:
            if user.username == PRIMARY_SUPERUSER:
                continue
            user.is_active = False
            user.save()


class LeadNoteInline(admin.TabularInline):
    model = LeadNote
    extra = 0


@admin.register(Lead)
class LeadAdmin(SheetSyncAdminMixin, admin.ModelAdmin):
    list_display = ("lead_id", "name", "email", "phone", "budget", "status_badge", "priority", "assigned_to", "created_at")
    list_filter = ("status", "priority", "source", "assigned_to", "country", "created_at")
    search_fields = ("lead_id", "name", "email", "phone", "company", "message")
    readonly_fields = ("lead_id", "created_at", "updated_at")
    list_per_page = 50
    ordering = ("-created_at",)
    inlines = (LeadNoteInline,)
    security_create_action = SecurityLog.Action.CREATE_LEAD
    security_update_action = SecurityLog.Action.UPDATE_LEAD
    security_delete_action = SecurityLog.Action.DELETE_LEAD

    def sync_to_sheet(self, obj):
        GoogleSheetsService.create_lead(obj)

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            Lead.Status.NEW: "#2563eb",
            Lead.Status.CONTACTED: "#f59e0b",
            Lead.Status.QUALIFIED: "#16a34a",
            Lead.Status.CONVERTED: "#059669",
            Lead.Status.LOST: "#6b7280",
        }
        return format_html('<span style="background:{};color:#fff;padding:3px 8px;border-radius:12px;font-weight:700;font-size:11px;">{}</span>', colors.get(obj.status, "#475569"), obj.get_status_display())


@admin.register(Appointment)
class AppointmentAdmin(SheetSyncAdminMixin, admin.ModelAdmin):
    list_display = ("appointment_id", "client_name", "email", "service", "meeting_type", "appointment_date", "status", "assigned_to")
    list_filter = ("status", "meeting_type", "service", "assigned_to", "appointment_date")
    search_fields = ("appointment_id", "client_name", "email", "phone", "service", "notes")
    readonly_fields = ("appointment_id", "created_at", "updated_at")
    list_per_page = 50
    date_hierarchy = "appointment_date"
    security_create_action = SecurityLog.Action.CREATE_APPOINTMENT
    security_update_action = SecurityLog.Action.UPDATE_APPOINTMENT
    security_delete_action = SecurityLog.Action.DELETE_APPOINTMENT

    def sync_to_sheet(self, obj):
        GoogleSheetsService.create_appointment(obj)


@admin.register(Subscriber)
class SubscriberAdmin(SheetSyncAdminMixin, admin.ModelAdmin):
    list_display = ("email", "name", "source", "status", "timestamp")
    list_filter = ("status", "source", "timestamp")
    search_fields = ("email", "name")
    readonly_fields = ("subscriber_id", "timestamp")
    security_create_action = SecurityLog.Action.CREATE_SUBSCRIBER
    security_update_action = SecurityLog.Action.UPDATE_SUBSCRIBER
    security_delete_action = SecurityLog.Action.DELETE_SUBSCRIBER

    def sync_to_sheet(self, obj):
        GoogleSheetsService.create_subscriber(obj)


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "role", "revenue", "leads_count", "display_order", "is_active")
    list_editable = ("display_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "role", "bio")


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ("visitor_id", "ip_address", "country", "country_type", "device", "browser", "os", "current_page", "page_views", "session_duration", "scroll_pct", "lead_id", "last_active")
    list_filter = ("country", "country_type", "device", "browser", "os", "is_bot", "current_page", "last_active")
    search_fields = ("visitor_id", "session_id", "ip_address", "email", "country", "city", "current_page", "lead_id")
    readonly_fields = ("visitor_id", "session_id", "timestamp", "last_active")
    list_per_page = 50
    ordering = ("-last_active",)

    def has_add_permission(self, request):
        return False


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ("log_id", "action", "username", "target_type", "target_id", "ip_address", "browser", "os", "status", "created_at")
    list_filter = ("action", "status", "browser", "os", "created_at")
    search_fields = ("log_id", "username", "target_type", "target_id", "details", "ip_address")
    readonly_fields = tuple(field.name for field in SecurityLog._meta.fields)
    list_per_page = 100
    ordering = ("-created_at",)

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteSetting)
class SiteSettingAdmin(SheetSyncAdminMixin, admin.ModelAdmin):
    list_display = ("id", "key", "updated_at")
    search_fields = ("key",)
    readonly_fields = ("updated_at",)
    security_update_action = SecurityLog.Action.CMS_UPDATE
    security_create_action = SecurityLog.Action.CMS_UPDATE


def dashboard_context():
    now = timezone.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = now - timezone.timedelta(days=7)
    top_pages = Visitor.objects.values("current_page").annotate(total=Count("id")).order_by("-total")[:5]
    return {
        "smartfiq_dashboard": {
            "total_leads": Lead.objects.count(),
            "new_leads": Lead.objects.filter(status=Lead.Status.NEW).count(),
            "subscribers": Subscriber.objects.count(),
            "visitors_today": Visitor.objects.filter(last_active__gte=today).count(),
            "visitors_week": Visitor.objects.filter(last_active__gte=week).count(),
            "indian_visitors": Visitor.objects.filter(country_type="Indian").count() or Visitor.objects.filter(country_type="India").count(),
            "international_visitors": Visitor.objects.filter(country_type="International").count(),
            "mobile_visitors": Visitor.objects.filter(device__icontains="Mobile").count(),
            "desktop_visitors": Visitor.objects.filter(device__icontains="Desktop").count(),
            "top_pages": list(top_pages),
            "recent_leads": Lead.objects.order_by("-created_at")[:5],
            "recent_subscribers": Subscriber.objects.order_by("-timestamp")[:5],
            "recent_visitors": Visitor.objects.order_by("-last_active")[:5],
            "recent_activity": SecurityLog.objects.order_by("-created_at")[:8],
        }
    }


original_index = AdminSite.index


def smartfiq_admin_index(self, request, extra_context=None):
    extra_context = extra_context or {}
    extra_context.update(dashboard_context())
    return original_index(self, request, extra_context)


AdminSite.index = smartfiq_admin_index

admin.site.site_header = "SmartFiQ Administration"
admin.site.site_title = "SmartFiQ Admin"
admin.site.index_title = "Operations Dashboard"
