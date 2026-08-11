import re
import requests
import threading
import datetime
from django.utils import timezone
from core.models import Visitor

GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxhaaYQJ6wtk4Oo8FpqMF7wdYISFRpghPthKB_iH9hXSQMxYWKZrJESuyy0ZngcBRU_/exec"

BOT_USER_AGENTS = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'ahrefsbot', 'semrushbot', 'facebookexternalhit',
    'twitterbot', 'python-requests', 'curl', 'wget', 'bytespider', 'cms-checker'
]

# Cache to prevent duplicate Google Sheet row spam for same session within 5 minutes
RECENT_SHEET_SYNCS = {}

from core.google_sheets import GoogleSheetsService

def send_visitor_to_google_sheet(visitor, force_sync=False):
    def _async_sync():
        try:
            now = datetime.datetime.now()
            last_sync = RECENT_SHEET_SYNCS.get(visitor.session_id)
            
            # Rate limit sheet appends: Only append if last sync was > 5 minutes ago or force_sync
            if not force_sync and last_sync and (now - last_sync).total_seconds() < 300:
                return

            RECENT_SHEET_SYNCS[visitor.session_id] = now

            GoogleSheetsService.send_visitor({
                "visitor_id": f"VIS-{visitor.id:05d}",
                "session_id": visitor.session_id,
                "first_seen": visitor.timestamp.strftime("%Y-%m-%d %H:%M:%S") if visitor.timestamp else now.strftime("%Y-%m-%d %H:%M:%S"),
                "last_seen": visitor.last_active.strftime("%Y-%m-%d %H:%M:%S") if visitor.last_active else now.strftime("%Y-%m-%d %H:%M:%S"),
                "ip_address": visitor.ip_address or "127.0.0.1",
                "country": visitor.location or "Unknown",
                "country_code": getattr(visitor, 'country_type', 'Unknown'),
                "city": "Unknown",
                "region": "Unknown",
                "timezone": "IST" if visitor.country_type == 'India' else "UTC",
                "visitor_type": visitor.visitor_type or "Human",
                "device_type": "Mobile" if "Mobile" in (visitor.device or "") else ("Tablet" if "Tablet" in (visitor.device or "") else "Desktop"),
                "device_model": visitor.device_model or visitor.device or "Unknown",
                "os": visitor.os or "Unknown",
                "browser": visitor.browser or "Chrome",
                "entry_page": visitor.entry_page or "/",
                "current_page": visitor.current_page or "/",
                "exit_page": visitor.exit_page or "/",
                "page_views": visitor.page_views or 1,
                "session_duration": visitor.session_duration or 0,
                "max_scroll": getattr(visitor, 'scroll_pct', 0) or 0,
                "referrer": getattr(visitor, 'user_agent', '') or "",
                "landing_source": "Direct",
                "is_bot": visitor.is_bot,
                "bot_name": visitor.bot_name or ("Bot Crawler" if visitor.is_bot else "Human User"),
                "email": visitor.email or "Guest",
                "lead_id": ""
            })
        except Exception as e:
            print("Google Sheet Visitor Sync Warning:", e)

    threading.Thread(target=_async_sync, daemon=True).start()

class VisitorTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.lower()

        # STRICT FILTER: Ignore static files, images, JS/CSS, API endpoints, and Admin internal URLs
        ignored_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.js', '.css', '.woff', '.woff2', '.ttf', '.map', '.json', '.xml')
        ignored_prefixes = ('/static/', '/media/', '/api/', '/personal-admin/', '/favicon.ico')

        if not path.endswith(ignored_extensions) and not any(path.startswith(prefix) for prefix in ignored_prefixes):
            try:
                user_agent_str = request.META.get('HTTP_USER_AGENT', '').lower()
                is_bot = any(bot in user_agent_str for bot in BOT_USER_AGENTS)
                
                # Accurate Device Detection (Mobile Phone vs PC)
                if any(m in user_agent_str for m in ['iphone', 'android', 'mobile', 'webos', 'ipod', 'blackBerry', 'windows phone']):
                    if 'iphone' in user_agent_str:
                        device = 'Mobile (iPhone)'
                    elif 'android' in user_agent_str:
                        device = 'Mobile (Android)'
                    else:
                        device = 'Mobile Phone'
                elif any(t in user_agent_str for t in ['ipad', 'tablet', 'playbook', 'silk']):
                    if 'ipad' in user_agent_str:
                        device = 'Tablet (iPad)'
                    else:
                        device = 'Tablet'
                else:
                    if 'macintosh' in user_agent_str or 'mac os' in user_agent_str:
                        device = 'Desktop PC (Mac OS)'
                    elif 'windows' in user_agent_str:
                        device = 'Desktop PC (Windows)'
                    elif 'linux' in user_agent_str:
                        device = 'Desktop PC (Linux)'
                    else:
                        device = 'Desktop PC'

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
                country_code = request.META.get('HTTP_CF_IPCOUNTRY') or request.META.get('HTTP_X_VERCEL_IP_COUNTRY')
                if country_code:
                    if country_code.upper() in ('IN', 'IND'):
                        country_type = 'India'
                        location = 'India'
                    else:
                        country_type = 'International'
                        location = f"{country_code.upper()} (International)"
                elif ip.startswith(('127.', '192.168.', '10.', '172.16.')):
                    country_type = 'India'
                    location = 'India (Localhost)'
                else:
                    country_type = 'Unknown'
                    location = 'Unknown Location'

                visitor_type = 'Bot' if is_bot else 'Human'
                bot_name = 'Search Engine Bot' if is_bot else 'Human User'

                # Session ID
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
                        'current_page': request.path,
                        'entry_page': request.path,
                        'page_views': 1,
                        'user_agent': user_agent_str
                    }
                )

                if not created:
                    visitor.current_page = request.path
                    visitor.page_views += 1
                    visitor.location = location
                    visitor.country_type = country_type
                    visitor.visitor_type = visitor_type
                    visitor.is_bot = is_bot
                    visitor.device = device
                    visitor.browser = browser
                    visitor.user_agent = user_agent_str
                    visitor.save()

                send_visitor_to_google_sheet(visitor, force_sync=created)

            except Exception:
                pass

        response = self.get_response(request)
        return response
