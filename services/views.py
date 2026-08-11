import re
from html import escape
from pathlib import Path

from django.http import Http404
from django.shortcuts import render


BASE_DIR = Path(__file__).resolve().parent.parent
SERVICES_MD_DIR = BASE_DIR / "services.md"


def list_services(request):
    return render(request, 'services.html')


def _extract_meta(markdown_text, key):
    pattern = rf"\*\*{re.escape(key)}:\*\*\s*(.+)"
    match = re.search(pattern, markdown_text)
    return match.group(1).strip() if match else ""


def _format_inline(text):
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', text)
    return text


def _markdown_to_html(markdown_text):
    lines = markdown_text.splitlines()
    html = []
    in_list = False
    skip_meta = {"Meta Title", "Meta Description", "Target Keywords"}

    def close_list():
        nonlocal in_list
        if in_list:
            html.append("</ul>")
            in_list = False

    for line in lines:
        raw = line.strip()
        if not raw:
            close_list()
            continue
        if any(raw.startswith(f"**{key}:**") for key in skip_meta):
            continue
        if raw == "---":
            close_list()
            html.append('<hr class="my-10 border-white/10" />')
            continue
        if raw.startswith("### "):
            close_list()
            html.append(f'<h3>{_format_inline(raw[4:])}</h3>')
            continue
        if raw.startswith("## "):
            close_list()
            html.append(f'<h2>{_format_inline(raw[3:])}</h2>')
            continue
        if raw.startswith("# "):
            close_list()
            continue
        if raw.startswith("- "):
            if not in_list:
                html.append("<ul>")
                in_list = True
            html.append(f"<li>{_format_inline(raw[2:])}</li>")
            continue
        if re.match(r"^\d+\.\s+", raw):
            close_list()
            step = re.sub(r"^\d+\.\s+", "", raw)
            html.append(f'<p class="service-step">{_format_inline(step)}</p>')
            continue
        close_list()
        html.append(f"<p>{_format_inline(raw)}</p>")

    close_list()
    return "\n".join(html)


def service_detail(request, slug):
    clean_slug = slug.replace(".html", "")
    md_path = SERVICES_MD_DIR / f"{clean_slug}.md"
    if not md_path.exists():
        raise Http404("Service not found.")

    markdown_text = md_path.read_text(encoding="utf-8")
    title_line = next((line.strip("# ").strip() for line in markdown_text.splitlines() if line.startswith("# ")), "SmartFiQ Service")
    service = {
        "slug": clean_slug,
        "title": title_line,
        "meta_title": _extract_meta(markdown_text, "Meta Title") or title_line,
        "meta_description": _extract_meta(markdown_text, "Meta Description"),
        "keywords": _extract_meta(markdown_text, "Target Keywords"),
        "content_html": _markdown_to_html(markdown_text),
    }
    return render(request, "service-detail.html", {"service": service})
