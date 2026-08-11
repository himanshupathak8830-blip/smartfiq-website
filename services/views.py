import re
from html import escape
from pathlib import Path
from django.http import Http404, HttpResponse
from django.shortcuts import render

BASE_DIR = Path(__file__).resolve().parent.parent
SERVICES_DIR = BASE_DIR / "services"
SERVICES_MD_DIR = BASE_DIR / "services.md"

def list_services(request):
    return render(request, 'services.html')

def service_detail(request, slug):
    clean_slug = slug.replace(".html", "").strip().lower()
    
    # 1. Direct static HTML file in services/
    html_path = SERVICES_DIR / f"{clean_slug}.html"
    if html_path.exists():
        with open(html_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
            
    # 2. Keyword / Alias fuzzy matching
    files = list(SERVICES_DIR.glob("*.html")) if SERVICES_DIR.exists() else []
    matched = None
    for f in files:
        fname = f.stem.lower()
        if fname == clean_slug or clean_slug.startswith(fname) or fname.startswith(clean_slug):
            matched = f
            break
            
    if matched and matched.exists():
        with open(matched, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')

    if 'voice' in clean_slug or 'call' in clean_slug:
        target = SERVICES_DIR / 'ai-voice-call-agents.html'
        if target.exists():
            return HttpResponse(target.read_text(encoding='utf-8'), content_type='text/html')
            
    if 'viral' in clean_slug or 'reel' in clean_slug or 'pilot' in clean_slug:
        target = SERVICES_DIR / 'viralpilot-ai-social-reel-automation.html'
        if target.exists():
            return HttpResponse(target.read_text(encoding='utf-8'), content_type='text/html')

    if 'logo' in clean_slug or 'brand' in clean_slug:
        target = SERVICES_DIR / 'logo-brand-identity-design.html'
        if target.exists():
            return HttpResponse(target.read_text(encoding='utf-8'), content_type='text/html')

    # 3. Fallback to Markdown parsing if available
    md_path = SERVICES_MD_DIR / f"{clean_slug}.md"
    if md_path.exists():
        markdown_text = md_path.read_text(encoding="utf-8")
        title_line = next((line.strip("# ").strip() for line in markdown_text.splitlines() if line.startswith("# ")), "SmartFiQ Service")
        service = {
            "slug": clean_slug,
            "title": title_line,
            "meta_title": title_line,
            "meta_description": f"SmartFiQ service for {title_line}",
            "content_html": markdown_text,
        }
        return render(request, "service-detail.html", {"service": service})

    return render(request, 'services.html')
