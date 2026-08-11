from django.contrib.auth.models import Group, Permission, User
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from services.google_sheets import GoogleSheetsService

from .models import SecurityLog


ROLE_PERMISSIONS = {
    "SUPER_ADMIN": "__all__",
    "ADMIN": ["lead", "subscriber", "appointment", "visitor", "sitesetting", "post", "casestudy", "user"],
    "MANAGER": ["lead", "subscriber", "appointment", "visitor"],
    "EDITOR": ["post", "casestudy", "sitesetting"],
    "SUPPORT": ["lead", "appointment"],
    "VIEWER": [],
}


def parse_user_agent(user_agent):
    ua = (user_agent or "").lower()
    device = "Mobile" if any(x in ua for x in ("iphone", "android", "mobile")) else ("Tablet" if any(x in ua for x in ("ipad", "tablet")) else "Desktop")
    browser = "Edge" if "edg" in ua else "Chrome" if "chrome" in ua else "Safari" if "safari" in ua else "Firefox" if "firefox" in ua else "Unknown"
    os_name = "iOS" if any(x in ua for x in ("iphone", "ipad")) else "Android" if "android" in ua else "macOS" if "mac os" in ua or "macintosh" in ua else "Windows" if "windows" in ua else "Linux" if "linux" in ua else "Unknown"
    return device, browser, os_name


def get_ip(request):
    if not request:
        return None
    return request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")


def write_security_log(action, request=None, user=None, username="", details="", status="SUCCESS"):
    user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""
    device, browser, os_name = parse_user_agent(user_agent)
    log = SecurityLog.objects.create(
        user=user if user and user.is_authenticated else None,
        username=(user.username if user and user.is_authenticated else username),
        action=action,
        details=details,
        ip_address=get_ip(request),
        user_agent=user_agent,
        device=device,
        browser=browser,
        os=os_name,
        status=status,
    )
    GoogleSheetsService.create_security_log(log)


@receiver(user_logged_in)
def track_login_success(sender, request, user, **kwargs):
    write_security_log(SecurityLog.Action.LOGIN_SUCCESS, request=request, user=user, details="Django Admin login succeeded")
    GoogleSheetsService.sync_user_metadata(user)


@receiver(user_logged_out)
def track_logout(sender, request, user, **kwargs):
    if user:
        write_security_log(SecurityLog.Action.LOGOUT, request=request, user=user, details="Django Admin logout")


@receiver(user_login_failed)
def track_login_failure(sender, credentials, request, **kwargs):
    username = (credentials or {}).get("username", "")
    write_security_log(SecurityLog.Action.LOGIN_FAILED, request=request, username=username, details="Invalid credentials", status="FAILED")


@receiver(post_save, sender=User)
def sync_user_metadata(sender, instance, **kwargs):
    GoogleSheetsService.sync_user_metadata(instance)


@receiver(post_migrate)
def ensure_roles(sender, **kwargs):
    all_permissions = Permission.objects.all()
    model_permissions = {}
    for permission in all_permissions.select_related("content_type"):
        model_permissions.setdefault(permission.content_type.model, []).append(permission)

    for role, models in ROLE_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=role)
        if models == "__all__":
            group.permissions.set(all_permissions)
            continue
        permissions = []
        for model_name in models:
            permissions.extend(model_permissions.get(model_name, []))
        if role == "VIEWER":
            permissions = [p for p in all_permissions if p.codename.startswith("view_")]
        group.permissions.set(permissions)
