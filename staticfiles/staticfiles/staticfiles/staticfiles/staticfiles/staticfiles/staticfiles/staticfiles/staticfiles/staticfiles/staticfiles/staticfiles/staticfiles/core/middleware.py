import re
import requests
import threading
from core.models import Visitor

GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwL8EqUfiH6Twt4ooj5U3K0H1vNaDlwJuWWXp8beZnCemyOYZQ3B9C-f084Hr3CKBDs/exec"

BOT_USER_AGENTS = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'ahrefsbot', 'semrushbot', 'facebookexternalhit',
    'twitterbot', 'python-requests', 'curl', 'wget', 'bytespider'
]

def send_visitor_to_google_sheet(visitor):
    def _async_sync():
        try:
            payload = {
                "target": "visitors",
                "id": visitor.id,
                "session_id": visitor.session_id,
                "ip_address": visitor.ip_address or "127.0.0.1",
                "email": visitor.email or "Guest",
                "location": visitor.location or "India",
                "country_type": visitor.country_type or "India",
                "visitor_type": visitor.visitor_type or "Human",
                "isp": visitor.isp or "Telecom",
                "is_bot": visitor.is_bot,
                "bot_name": visitor.bot_name or ("Bot Crawler" if visitor.is_bot else "Human User"),
                "bot_category": visitor.bot_category or ("Search Engine" if visitor.is_bot else "User"),
                "device": visitor.device or "Desktop",
                "device_model": visitor.device_model or "PC",
                "browser": visitor.browser or "Chrome",
                "os": visitor.os or "Windows",
                "entry_page": visitor.entry_page or "/",
                "current_page": visitor.current_page or "/",
                "exit_page": visitor.exit_page or "/",
                "session_duration": visitor.session_duration or 0,
                "scroll_pct": visitor.scroll_pct or 0,
                "page_views": visitor.page_views or 1,
                "user_agent": visitor.user_agent or "",
                "timestamp": visitor.timestamp.isoformat() if visitor.timestamp else "",
                "last_active": visitor.last_active.isoformat() if visitor.last_active else ""
            }
            requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=8)
        except Exception as e:
            print("Google Sheet Visitor Sync Warning:", e)

    threading.Thread(target=_async_sync, daemon=True).start()

class VisitorTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        
        # Ignore static assets, media, and admin background API polling calls
        if not path.startswith(('/static/', '/media/', '/favicon.ico', '/personal-admin/js/', '/personal-admin/css/')):
            try:
                user_agent_str = request.META.get('HTTP_USER_AGENT', '').lower()
                is_bot = any(bot in user_agent_str for bot in BOT_USER_AGENTS)
                
                # Determine device type
                if 'mobile' in user_agent_str or 'android' in user_agent_str or 'iphone' in user_agent_str:
                    device = 'Mobile'
                elif 'tablet' in user_agent_str or 'ipad' in user_agent_str:
                    device = 'Tablet'
                else:
                    device = 'Desktop'

                # Determine browser
                if 'chrome' in user_agent_str and 'edg' not in user_agent_str:
                    browser = 'Chrome'
                elif 'safari' in user_agent_str and 'chrome' not in user_agent_str:
                    browser = 'Safari'
                elif 'firefox' in user_agent_str:
                    browser = 'Firefox'
                elif 'edg' in user_agent_str:
                    browser = 'Edge'
                else:
                    browser = 'Other'

                # Determine IP address
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0].strip()
                else:
                    ip = request.META.get('REMOTE_ADDR', '127.0.0.1')

                # Country Detection (Cloudflare / Vercel header or IP fallback)
                country_code = request.META.get('HTTP_CF_IPCOUNTRY') or request.META.get('HTTP_X_VERCEL_IP_COUNTRY') or 'IN'
                if country_code in ('IN', 'IND') or ip.startswith(('127.', '192.168.', '10.')):
                    country_type = 'India'
                    location = 'India'
                else:
                    country_type = 'International'
                    location = f"{country_code} (International)"

                visitor_type = 'Bot' if is_bot else 'Human'
                bot_name = 'Search Engine Bot' if is_bot else 'Human User'

                # Track session in cookies or header
                session_id = request.COOKIES.get('sf_visitor_session')
                if not session_id:
                    session_id = f"sf-{abs(hash(ip + user_agent_str))}"

                visitor, created = Visitor.objects.get_or_create(
                    session_id=session_id,
                    defaults={
                        'ip_address': ip,
                        'device': device,
                        'browser': browser,
                        'location': location,
                        'country_type': country_type,
                        'visitor_type': visitor_type,
                        'is_bot': is_bot,
                        'bot_name': bot_name,
                        'current_page': path,
                        'entry_page': path,
                        'page_views': 1,
                        'user_agent': user_agent_str
                    }
                )

                if not created:
                    visitor.current_page = path
                    visitor.page_views += 1
                    visitor.location = location
                    visitor.country_type = country_type
                    visitor.visitor_type = visitor_type
                    visitor.is_bot = is_bot
                    visitor.device = device
                    visitor.browser = browser
                    visitor.user_agent = user_agent_str
                    visitor.save()

                send_visitor_to_google_sheet(visitor)

            except Exception:
                pass

        response = self.get_response(request)
        return response
