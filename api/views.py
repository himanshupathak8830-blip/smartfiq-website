import json
import re
import time
from collections import defaultdict

from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from blog.models import Post
from case_studies.models import CaseStudy
from core.models import Appointment, Lead, SecurityLog, SiteSetting, Subscriber, TeamMember, Visitor
from services.google_sheets import GoogleSheetsService
from services.models import Service


RATE_BUCKETS = defaultdict(list)


def _json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return request.POST.dict()


def _client_ip(request):
    return request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")


def _clean_text(value, limit=1000):
    value = re.sub(r"<[^>]*>", "", str(value or "")).strip()
    return value[:limit]


def _rate_limited(request, scope, limit=20, window=60):
    key = f"{scope}:{_client_ip(request)}"
    now = time.time()
    RATE_BUCKETS[key] = [stamp for stamp in RATE_BUCKETS[key] if now - stamp < window]
    if len(RATE_BUCKETS[key]) >= limit:
        return True
    RATE_BUCKETS[key].append(now)
    return False


def _session_id(request, data):
    return request.COOKIES.get("sf_visitor_session") or data.get("visitor_session_id") or data.get("sessionId") or ""


def _valid_email(email):
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False


def _link_visitor(session_id, lead_id="", email=""):
    if not session_id:
        return
    visitor = Visitor.objects.filter(session_id=session_id).first()
    if visitor:
        if lead_id:
            visitor.lead_id = lead_id
        if email:
            visitor.email = email
        visitor.save(update_fields=["lead_id", "email", "last_active"])
        GoogleSheetsService.upsert_visitor(visitor)


@require_http_methods(["GET"])
def health_db(request):
    return JsonResponse({
        "success": True,
        "status": "healthy",
        "backend": "Django",
        "admin": "Django Admin",
        "storage": "Google Sheets via Google Apps Script",
    })


@require_http_methods(["GET", "POST"])
def leads_api(request, lead_id=None):
    if request.method == "GET":
        if not request.user.is_staff:
            return JsonResponse({"error": "Authentication required"}, status=403)
        leads = Lead.objects.select_related("assigned_to").order_by("-created_at")[:500]
        return JsonResponse([{
            "id": lead.id,
            "lead_id": lead.lead_id,
            "name": lead.name,
            "email": lead.email or "",
            "phone": lead.phone or "",
            "budget": lead.budget or "",
            "message": lead.message or "",
            "source": lead.source,
            "status": lead.status,
            "priority": lead.priority,
            "assignedTo": lead.assigned_to.username if lead.assigned_to else "Unassigned",
            "visitor_session_id": lead.visitor_session_id,
            "timestamp": lead.created_at.isoformat(),
        } for lead in leads], safe=False)

    if _rate_limited(request, "lead", limit=8, window=60):
        return JsonResponse({"success": False, "error": "Too many submissions. Please try again shortly."}, status=429)

    data = _json_body(request)
    email = _clean_text(data.get("email"), 254)
    if email and not _valid_email(email):
        return JsonResponse({"success": False, "error": "Enter a valid email address."}, status=400)

    session_id = _session_id(request, data)
    lead = Lead.objects.create(
        name=_clean_text(data.get("fullName") or data.get("name") or "Website Visitor", 150),
        email=email or None,
        phone=_clean_text(data.get("phone"), 50) or None,
        budget=_clean_text(data.get("budget"), 100) or None,
        message=_clean_text(data.get("requirements") or data.get("message"), 2000),
        source=_clean_text(data.get("source") or "Website Form", 100),
        visitor_session_id=session_id,
        country=_clean_text(data.get("country") or "Unknown", 100),
        city=_clean_text(data.get("city") or "Unknown", 100),
        lead_score=100 if email and data.get("phone") else 50,
    )
    GoogleSheetsService.create_lead(lead)
    _link_visitor(session_id, lead.lead_id, email)
    return JsonResponse({"success": True, "lead": {"id": lead.id, "lead_id": lead.lead_id, "name": lead.name, "status": lead.status}}, status=201)


@require_http_methods(["POST"])
def subscribers_api(request):
    if _rate_limited(request, "subscriber", limit=8, window=60):
        return JsonResponse({"success": False, "error": "Too many subscription attempts."}, status=429)
    data = _json_body(request)
    email = _clean_text(data.get("email"), 254).lower()
    if not _valid_email(email):
        return JsonResponse({"success": False, "error": "Enter a valid email address."}, status=400)
    subscriber, created = Subscriber.objects.get_or_create(
        email=email,
        defaults={
            "name": _clean_text(data.get("name"), 150),
            "source": _clean_text(data.get("source") or "Newsletter", 100),
            "ip_address": _client_ip(request),
            "visitor_session_id": _session_id(request, data),
        },
    )
    if not created and subscriber.status != Subscriber.Status.ACTIVE:
        subscriber.status = Subscriber.Status.ACTIVE
        subscriber.save(update_fields=["status"])
    GoogleSheetsService.create_subscriber(subscriber)
    return JsonResponse({"success": True, "subscriber": {"email": subscriber.email, "status": subscriber.status}}, status=201 if created else 200)


@require_http_methods(["GET", "POST"])
def appointments_api(request):
    if request.method == "GET":
        if not request.user.is_staff:
            return JsonResponse({"error": "Authentication required"}, status=403)
        appointments = Appointment.objects.order_by("-appointment_date")[:500]
        return JsonResponse([{
            "id": item.id,
            "appointment_id": item.appointment_id,
            "clientName": item.client_name,
            "email": item.email or "",
            "service": item.service,
            "meetingType": item.meeting_type,
            "date": item.appointment_date.isoformat(),
            "status": item.status,
        } for item in appointments], safe=False)

    if _rate_limited(request, "appointment", limit=8, window=60):
        return JsonResponse({"success": False, "error": "Too many appointment requests."}, status=429)
    data = _json_body(request)
    email = _clean_text(data.get("email"), 254)
    if email and not _valid_email(email):
        return JsonResponse({"success": False, "error": "Enter a valid email address."}, status=400)
    appointment_date = parse_datetime(data.get("appointment_date") or data.get("date") or "") or timezone.now()
    if timezone.is_naive(appointment_date):
        appointment_date = timezone.make_aware(appointment_date)
    appointment = Appointment.objects.create(
        client_name=_clean_text(data.get("clientName") or data.get("name") or "Website Visitor", 150),
        email=email or None,
        phone=_clean_text(data.get("phone"), 50) or None,
        service=_clean_text(data.get("service") or "AI Audit", 100),
        meeting_type=_clean_text(data.get("meetingType") or "AI Audit Consultation", 100),
        appointment_date=appointment_date,
        visitor_session_id=_session_id(request, data),
        notes=_clean_text(data.get("notes"), 1000),
    )
    GoogleSheetsService.create_appointment(appointment)
    return JsonResponse({"success": True, "appointment": {"appointment_id": appointment.appointment_id, "status": appointment.status}}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def track_api(request):
    if _rate_limited(request, "track", limit=60, window=60):
        return JsonResponse({"success": True})
    data = _json_body(request)
    session_id = _session_id(request, data) or f"sf-{int(time.time() * 1000)}"
    current_page = _clean_text(data.get("currentPage") or data.get("current_page") or "/", 250)
    entry_page = _clean_text(data.get("entryPage") or data.get("entry_page") or current_page, 250)
    pages = data.get("pagesVisited") or data.get("pages_visited") or []
    if not isinstance(pages, list):
        pages = []
    if current_page and current_page not in pages:
        pages.append(current_page)

    visitor, created = Visitor.objects.get_or_create(
        session_id=session_id,
        defaults={
            "ip_address": _client_ip(request),
            "entry_page": entry_page,
            "current_page": current_page,
            "pages_visited": pages,
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "referrer": _clean_text(data.get("referrer"), 500),
        },
    )
    if not created:
        known_pages = visitor.pages_visited or []
        for page in pages:
            if page not in known_pages:
                known_pages.append(page)
        visitor.current_page = current_page
        visitor.exit_page = _clean_text(data.get("exitPage") or visitor.exit_page, 250)
        visitor.session_duration = max(visitor.session_duration, int(data.get("sessionDuration") or 0))
        visitor.scroll_pct = max(visitor.scroll_pct, int(data.get("scrollPercentage") or 0))
        visitor.page_views = max(visitor.page_views + 1, len(known_pages))
        visitor.pages_visited = known_pages
        visitor.referrer = _clean_text(data.get("referrer") or visitor.referrer, 500)
        visitor.save()
    GoogleSheetsService.upsert_visitor(visitor)
    response = JsonResponse({"success": True, "session_id": session_id})
    response.set_cookie("sf_visitor_session", session_id, max_age=60 * 60 * 24 * 365, httponly=True, samesite="Lax")
    return response


@require_http_methods(["GET"])
def agency_team(request):
    members = TeamMember.objects.filter(is_active=True).order_by("display_order")
    return JsonResponse([{
        "id": item.id,
        "name": item.name,
        "role": item.role,
        "bio": item.bio,
        "image": item.profile_image,
        "linkedin": item.linkedin,
        "skills": item.skills,
        "revenue": item.revenue,
        "leads": item.leads_count,
        "attendance": item.attendance,
        "kpi": item.kpi,
    } for item in members], safe=False)


@require_http_methods(["GET"])
def public_services(request):
    services = Service.objects.filter(is_active=True).order_by("display_order")
    return JsonResponse([{
        "id": item.id,
        "name": item.title,
        "slug": item.slug,
        "desc": item.description,
        "price": item.pricing_info,
        "icon": item.icon,
        "features": item.features,
    } for item in services], safe=False)


@require_http_methods(["GET"])
def public_blogs(request):
    posts = Post.objects.filter(status=Post.Status.PUBLISHED).select_related("category")
    return JsonResponse([{
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "excerpt": post.excerpt,
        "content": post.body,
        "category": post.category.name if post.category else "AI Automation",
        "coverImage": post.cover_image_url or (post.cover_image.url if post.cover_image else ""),
        "author": post.author,
        "status": post.status,
        "readTime": f"{post.reading_time} min",
        "date": post.published_at.date().isoformat() if post.published_at else "",
    } for post in posts], safe=False)


@require_http_methods(["GET"])
def case_studies_api(request):
    items = CaseStudy.objects.filter(status=CaseStudy.Status.PUBLISHED).order_by("-created_at")
    return JsonResponse([{
        "id": item.id,
        "title": item.project_title,
        "slug": item.slug,
        "client": item.client_name,
        "category": item.category,
        "description": item.description,
        "problem": item.problem,
        "solution": item.solution,
        "results": item.results,
        "content": item.content,
        "image": item.featured_image,
        "featured": True,
    } for item in items], safe=False)


@require_http_methods(["GET"])
def settings_api(request):
    setting = SiteSetting.objects.filter(key="global_cms").first()
    return JsonResponse(setting.value if setting and setting.value else {
        "brandName": "SmartFiQ",
        "heroTitle": "Automate Your Operations & Cut Manual Workload by 80%",
        "heroSubtitle": "We build intelligent AI voice agents, WhatsApp automations, and custom CRM systems.",
        "heroCtaText": "Book Free AI Consultation",
    })


@staff_member_required
@require_http_methods(["GET"])
def stats_api(request):
    today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return JsonResponse({
        "leadsCount": Lead.objects.count(),
        "subscribersCount": Subscriber.objects.count(),
        "dailyVisitors": Visitor.objects.filter(last_active__gte=today).count(),
        "visitorsCount": Visitor.objects.count(),
        "systemHealth": "Operational",
    })


@staff_member_required
@require_http_methods(["GET"])
def visitors_api(request):
    visitors = Visitor.objects.order_by("-last_active")[:500]
    return JsonResponse([{
        "sessionId": item.session_id,
        "ip": item.ip_address or "",
        "email": item.email,
        "country": item.country,
        "city": item.city,
        "countryType": item.country_type,
        "visitorType": item.visitor_type,
        "device": item.device,
        "browser": item.browser,
        "os": item.os,
        "currentPage": item.current_page,
        "pageViews": item.page_views,
        "lastActive": item.last_active.isoformat(),
    } for item in visitors], safe=False)


@staff_member_required
@require_http_methods(["GET"])
def security_logs_api(request):
    logs = SecurityLog.objects.order_by("-created_at")[:100]
    return JsonResponse([{
        "id": log.id,
        "log_id": log.log_id,
        "action": log.action,
        "user": log.username or "System",
        "ip": log.ip_address or "",
        "status": log.status,
        "timestamp": log.created_at.isoformat(),
    } for log in logs], safe=False)


charts_api = stats_api
lead_update = leads_api
lead_notes = leads_api
