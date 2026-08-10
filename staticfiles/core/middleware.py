import re
from core.models import Visitor

BOT_USER_AGENTS = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'ahrefsbot', 'semrushbot', 'facebookexternalhit',
    'twitterbot', 'python-requests', 'curl', 'wget', 'bytespider'
]

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
                        'page_views': 1
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
                    visitor.save()

            except Exception:
                pass

        response = self.get_response(request)
        return response
