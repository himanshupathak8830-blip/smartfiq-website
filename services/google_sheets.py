import datetime
import os
import threading

import requests


class GoogleSheetsService:
    endpoint_url = os.getenv("GOOGLE_APPS_SCRIPT_URL") or os.getenv("GOOGLE_SHEETS_URL")
    secret = os.getenv("GOOGLE_APPS_SCRIPT_SECRET") or os.getenv("GOOGLE_SHEETS_SECRET")
    timeout = int(os.getenv("GOOGLE_SHEETS_TIMEOUT", "8"))

    @classmethod
    def _request(cls, payload, async_send=False):
        if not cls.endpoint_url:
            return {"success": False, "skipped": True, "error": "GOOGLE_APPS_SCRIPT_URL is not configured"}

        safe_payload = dict(payload)
        if cls.secret:
            safe_payload["secret"] = cls.secret

        def _post():
            try:
                response = requests.post(
                    cls.endpoint_url,
                    json=safe_payload,
                    headers={"Content-Type": "application/json"},
                    timeout=cls.timeout,
                )
                if response.content:
                    try:
                        return response.json()
                    except ValueError:
                        return {"success": response.ok, "message": response.text}
                return {"success": response.ok}
            except requests.RequestException as exc:
                return {"success": False, "error": str(exc)}

        if async_send:
            threading.Thread(target=_post, daemon=True).start()
            return {"success": True, "queued": True}
        return _post()

    @staticmethod
    def _timestamp(value=None):
        if value and hasattr(value, "isoformat"):
            return value.isoformat()
        return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    @classmethod
    def create_lead(cls, lead):
        data = lead if isinstance(lead, dict) else {
            "lead_id": lead.lead_id,
            "full_name": lead.name,
            "business_email": lead.email or "",
            "phone_number": lead.phone or "",
            "budget": lead.budget or "",
            "requirement_details": lead.message or "",
            "source": lead.source,
            "status": lead.status,
            "priority": lead.priority,
            "assigned_to": lead.assigned_to.username if lead.assigned_to else "",
            "country": lead.country,
            "city": lead.city,
            "visitor_session_id": lead.visitor_session_id,
            "created_at": cls._timestamp(lead.created_at),
            "updated_at": cls._timestamp(lead.updated_at),
        }
        return cls._request({"type": "lead", "action": "create", "target": "Leads", **data}, async_send=True)

    @classmethod
    def update_lead(cls, lead_id, data):
        return cls._request({"type": "lead", "action": "update", "target": "Leads", "lead_id": lead_id, **data}, async_send=True)

    @classmethod
    def get_lead(cls, lead_id):
        return cls._request({"type": "lead", "action": "get", "target": "Leads", "lead_id": lead_id})

    @classmethod
    def list_leads(cls):
        return cls._request({"type": "lead", "action": "list", "target": "Leads"})

    @classmethod
    def create_subscriber(cls, subscriber):
        data = subscriber if isinstance(subscriber, dict) else {
            "subscriber_id": subscriber.subscriber_id,
            "email": subscriber.email,
            "name": subscriber.name,
            "source": subscriber.source,
            "status": subscriber.status,
            "timestamp": cls._timestamp(subscriber.timestamp),
            "ip_address": subscriber.ip_address or "",
            "visitor_session_id": subscriber.visitor_session_id,
        }
        return cls._request({"type": "subscriber", "action": "create", "target": "Subscribers", **data}, async_send=True)

    @classmethod
    def update_subscriber(cls, subscriber_id, data):
        return cls._request({"type": "subscriber", "action": "update", "target": "Subscribers", "subscriber_id": subscriber_id, **data}, async_send=True)

    @classmethod
    def list_subscribers(cls):
        return cls._request({"type": "subscriber", "action": "list", "target": "Subscribers"})

    @classmethod
    def create_security_log(cls, log):
        data = log if isinstance(log, dict) else {
            "log_id": log.log_id,
            "timestamp": cls._timestamp(log.created_at),
            "user_id": str(log.user_id or "SYSTEM"),
            "username": log.username or "System",
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details or "",
            "ip_address": log.ip_address or "",
            "user_agent": log.user_agent or "",
            "device": log.device,
            "browser": log.browser,
            "os": log.os,
            "status": log.status,
        }
        return cls._request({"type": "security", "action": "create", "target": "Security_Logs", **data}, async_send=True)

    @classmethod
    def list_security_logs(cls):
        return cls._request({"type": "security", "action": "list", "target": "Security_Logs"})

    @classmethod
    def create_visitor(cls, visitor):
        return cls.upsert_visitor(visitor)

    @classmethod
    def update_visitor(cls, visitor):
        return cls.upsert_visitor(visitor)

    @classmethod
    def upsert_visitor(cls, visitor):
        data = visitor if isinstance(visitor, dict) else {
            "visitor_id": visitor.visitor_id,
            "session_id": visitor.session_id,
            "first_seen": cls._timestamp(visitor.timestamp),
            "last_active": cls._timestamp(visitor.last_active),
            "ip_address": visitor.ip_address or "",
            "country": visitor.country,
            "country_code": visitor.country_code,
            "country_type": visitor.country_type,
            "city": visitor.city,
            "region": visitor.region,
            "timezone": visitor.timezone,
            "isp": visitor.isp,
            "visitor_type": visitor.visitor_type,
            "is_bot": visitor.is_bot,
            "bot_name": visitor.bot_name or "",
            "bot_category": visitor.bot_category or "",
            "device_type": visitor.device,
            "device_model": visitor.device_model,
            "browser": visitor.browser,
            "os": visitor.os,
            "entry_page": visitor.entry_page,
            "current_page": visitor.current_page,
            "exit_page": visitor.exit_page,
            "session_duration": visitor.session_duration,
            "scroll_pct": visitor.scroll_pct,
            "page_views": visitor.page_views,
            "pages_visited": ", ".join(visitor.pages_visited or []),
            "referrer": visitor.referrer,
            "landing_source": visitor.landing_source,
            "email": visitor.email,
            "lead_id": visitor.lead_id,
            "user_agent": visitor.user_agent or "",
        }
        return cls._request({"type": "visitor", "action": "upsert", "target": "Visitors", **data}, async_send=True)

    @classmethod
    def get_visitor_by_session(cls, session_id):
        return cls._request({"type": "visitor", "action": "getBySession", "target": "Visitors", "session_id": session_id})

    @classmethod
    def list_visitors(cls):
        return cls._request({"type": "visitor", "action": "list", "target": "Visitors"})

    @classmethod
    def create_appointment(cls, appointment):
        data = appointment if isinstance(appointment, dict) else {
            "appointment_id": appointment.appointment_id,
            "client_name": appointment.client_name,
            "email": appointment.email or "",
            "phone": appointment.phone or "",
            "service": appointment.service,
            "meeting_type": appointment.meeting_type,
            "appointment_date": cls._timestamp(appointment.appointment_date),
            "status": appointment.status,
            "assigned_to": appointment.assigned_to.username if appointment.assigned_to else "",
            "notes": appointment.notes,
            "visitor_session_id": appointment.visitor_session_id,
            "created_at": cls._timestamp(appointment.created_at),
            "updated_at": cls._timestamp(appointment.updated_at),
        }
        return cls._request({"type": "appointment", "action": "create", "target": "Appointments", **data}, async_send=True)

    @classmethod
    def update_appointment(cls, appointment_id, data):
        return cls._request({"type": "appointment", "action": "update", "target": "Appointments", "appointment_id": appointment_id, **data}, async_send=True)

    @classmethod
    def list_appointments(cls):
        return cls._request({"type": "appointment", "action": "list", "target": "Appointments"})

    @classmethod
    def sync_user_metadata(cls, user, created_by="System"):
        group_names = ", ".join(user.groups.values_list("name", flat=True))
        payload = {
            "type": "user",
            "action": "upsert",
            "target": "Users",
            "user_id": f"USR-{user.id:04d}",
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name() or user.username,
            "role": group_names or ("SUPER_ADMIN" if user.is_superuser else "VIEWER"),
            "status": "Active" if user.is_active else "Inactive",
            "created_by": created_by,
            "created_at": cls._timestamp(user.date_joined),
            "last_login": cls._timestamp(user.last_login) if user.last_login else "",
            "updated_at": cls._timestamp(),
        }
        return cls._request(payload, async_send=True)

    @classmethod
    def sync_blog(cls, post):
        return cls._request({
            "type": "blog",
            "action": "upsert",
            "target": "Blog",
            "post_id": post.id,
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "content": post.body,
            "featured_image": post.cover_image_url or "",
            "category": post.category.name if post.category else "",
            "author": post.author,
            "status": post.status,
            "published_at": cls._timestamp(post.published_at),
            "created_at": cls._timestamp(post.created_at),
            "updated_at": cls._timestamp(post.updated_at),
        }, async_send=True)

    @classmethod
    def sync_case_study(cls, case_study):
        return cls._request({
            "type": "case_study",
            "action": "upsert",
            "target": "Case_Studies",
            "case_study_id": case_study.id,
            "title": case_study.project_title,
            "slug": case_study.slug,
            "description": case_study.description,
            "content": case_study.content,
            "image": case_study.featured_image or "",
            "category": case_study.category,
            "date": cls._timestamp(case_study.created_at),
            "status": case_study.status,
        }, async_send=True)
