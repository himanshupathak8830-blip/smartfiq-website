import os
import datetime
import threading
import requests

GOOGLE_SHEET_URL = os.getenv(
    "GOOGLE_SHEET_URL",
    "https://script.google.com/macros/s/AKfycbxOnGtaB0r8Pwh5gi-B5QsXNa-LKpNG255KyFVGdoyZpV9r2iwt51rMeSpw273S9Rc/exec"
)

class GoogleSheetsService:
    @staticmethod
    def send_lead(lead_data):
        def _post():
            try:
                payload = {
                    "type": "lead",
                    "target": "Leads",
                    "lead_id": lead_data.get("lead_id") or f"LD-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "timestamp": lead_data.get("timestamp") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "full_name": lead_data.get("full_name") or lead_data.get("name") or "",
                    "email": lead_data.get("email") or "",
                    "phone": lead_data.get("phone") or "",
                    "company": lead_data.get("company") or "",
                    "budget": lead_data.get("budget") or "",
                    "requirements": lead_data.get("requirements") or lead_data.get("message") or "",
                    "source": lead_data.get("source") or "Website",
                    "status": lead_data.get("status") or "New",
                    "priority": lead_data.get("priority") or "Medium",
                    "lead_score": lead_data.get("lead_score") or 50,
                    "assigned_to": lead_data.get("assigned_to") or "Unassigned",
                    "notes": lead_data.get("notes") or "",
                    "country": lead_data.get("country") or "Unknown",
                    "city": lead_data.get("city") or "Unknown",
                    "visitor_session_id": lead_data.get("visitor_session_id") or "",
                    "page": lead_data.get("page") or "/"
                }
                requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=8)
            except Exception as e:
                print("Google Sheets Lead Sync Error:", e)

        threading.Thread(target=_post, daemon=True).start()

    @staticmethod
    def send_user(user_obj, raw_password=None):
        def _post():
            try:
                from django.contrib.auth.hashers import make_password
                password_hash = user_obj.password if hasattr(user_obj, 'password') and user_obj.password else make_password(raw_password or "default_pass")
                payload = {
                    "type": "user",
                    "target": "Users",
                    "user_id": f"USR-{getattr(user_obj, 'id', 1):04d}",
                    "username": getattr(user_obj, 'username', 'user'),
                    "email": getattr(user_obj, 'email', ''),
                    "password_hash": password_hash,
                    "name": getattr(user_obj, 'get_full_name', lambda: getattr(user_obj, 'username', 'User'))() or getattr(user_obj, 'username', 'User'),
                    "role": "Superadmin" if getattr(user_obj, 'is_superuser', False) else ("Staff" if getattr(user_obj, 'is_staff', False) else "User"),
                    "status": "Active" if getattr(user_obj, 'is_active', True) else "Inactive",
                    "permissions": "all" if getattr(user_obj, 'is_superuser', False) else "limited",
                    "created_at": getattr(user_obj, 'date_joined', datetime.datetime.now()).strftime("%Y-%m-%d %H:%M:%S") if hasattr(user_obj, 'date_joined') and user_obj.date_joined else datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "last_login": getattr(user_obj, 'last_login', datetime.datetime.now()).strftime("%Y-%m-%d %H:%M:%S") if hasattr(user_obj, 'last_login') and user_obj.last_login else "",
                    "created_by": "System/Admin"
                }
                requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=8)
            except Exception as e:
                print("Google Sheets User Sync Error:", e)

        threading.Thread(target=_post, daemon=True).start()

    @staticmethod
    def send_security_log(log_data):
        def _post():
            try:
                payload = {
                    "type": "security",
                    "target": "Security_Logs",
                    "log_id": log_data.get("log_id") or f"SL-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "timestamp": log_data.get("timestamp") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "user_id": log_data.get("user_id") or "SYSTEM",
                    "username": log_data.get("username") or "System",
                    "action": log_data.get("action") or "ACTION",
                    "target": log_data.get("target") or "SYSTEM",
                    "target_id": log_data.get("target_id") or "-",
                    "status": log_data.get("status") or "SUCCESS",
                    "ip_address": log_data.get("ip_address") or "127.0.0.1",
                    "user_agent": log_data.get("user_agent") or "Unknown",
                    "details": log_data.get("details") or ""
                }
                requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=8)
            except Exception as e:
                print("Google Sheets Security Log Sync Error:", e)

        threading.Thread(target=_post, daemon=True).start()

    @staticmethod
    def send_visitor(visitor_data):
        def _post():
            try:
                payload = {
                    "type": "visitor",
                    "target": "Visitors",
                    "visitor_id": visitor_data.get("visitor_id") or f"VIS-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "session_id": visitor_data.get("session_id") or "",
                    "first_seen": visitor_data.get("first_seen") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "last_seen": visitor_data.get("last_seen") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "ip_address": visitor_data.get("ip_address") or "127.0.0.1",
                    "country": visitor_data.get("country") or "Unknown",
                    "country_code": visitor_data.get("country_code") or "XX",
                    "city": visitor_data.get("city") or "Unknown",
                    "region": visitor_data.get("region") or "Unknown",
                    "timezone": visitor_data.get("timezone") or "UTC",
                    "visitor_type": visitor_data.get("visitor_type") or "New",
                    "device_type": visitor_data.get("device_type") or "Desktop",
                    "device_model": visitor_data.get("device_model") or "Unknown",
                    "os": visitor_data.get("os") or "Unknown",
                    "browser": visitor_data.get("browser") or "Unknown",
                    "entry_page": visitor_data.get("entry_page") or "/",
                    "current_page": visitor_data.get("current_page") or "/",
                    "exit_page": visitor_data.get("exit_page") or "/",
                    "page_views": visitor_data.get("page_views") or 1,
                    "session_duration": visitor_data.get("session_duration") or 0,
                    "max_scroll": visitor_data.get("max_scroll") or 0,
                    "referrer": visitor_data.get("referrer") or "",
                    "landing_source": visitor_data.get("landing_source") or "Direct",
                    "is_bot": visitor_data.get("is_bot") or False,
                    "bot_name": visitor_data.get("bot_name") or "",
                    "email": visitor_data.get("email") or "",
                    "lead_id": visitor_data.get("lead_id") or ""
                }
                requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=8)
            except Exception as e:
                print("Google Sheets Visitor Sync Error:", e)

        threading.Thread(target=_post, daemon=True).start()
