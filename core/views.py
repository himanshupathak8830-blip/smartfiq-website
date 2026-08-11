import os
import requests
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.static import serve
from django.views.decorators.csrf import ensure_csrf_cookie
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

from core.google_sheets import GoogleSheetsService

def send_google_sheet_lead(full_name, email, phone, budget, requirement_details):
    try:
        GoogleSheetsService.create_lead({
            "full_name": full_name,
            "business_email": email,
            "phone_number": phone,
            "budget": budget,
            "requirement_details": requirement_details,
            "source": "Website Form"
        })
    except Exception as e:
        print("Google Sheet lead sync warning:", e)

def send_telegram_alert(lead_name, email, phone, budget, message):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not bot_token or not chat_id:
        return

    try:
        text = (
            f"New Lead Received (SmartFiQ)\n\n"
            f"Name: {lead_name or 'N/A'}\n"
            f"Email: {email or 'N/A'}\n"
            f"Phone: {phone or 'N/A'}\n"
            f"Budget: {budget or 'N/A'}\n"
            f"Message: {message or 'N/A'}\n"
            f"Source: Website Contact Form"
        )
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        resp = requests.post(
            url,
            json={"chat_id": str(chat_id), "text": text},
            headers={"Content-Type": "application/json"},
            timeout=8
        )
        print("Telegram API response:", resp.status_code, resp.text)
    except Exception as e:
        print("Telegram alert execution warning:", e)

@ensure_csrf_cookie
def home(request):
    return render(request, 'index.html')

@ensure_csrf_cookie
def about(request):
    return render(request, 'about-smartfiq.html')

@ensure_csrf_cookie
def our_story(request):
    return render(request, 'our-story.html')

from core.models import Lead

@ensure_csrf_cookie
def contact(request):
    if request.method == 'POST':
        name = request.POST.get('fullName') or request.POST.get('name') or 'Website Inquiry Lead'
        email = request.POST.get('email')
        phone = request.POST.get('phone')
        budget = request.POST.get('budget')
        message = request.POST.get('requirements') or request.POST.get('message') or ''

        try:
            Lead.objects.create(
                name=name,
                email=email,
                phone=phone,
                budget=budget,
                message=message,
                source='Contact Form',
                status=Lead.Status.NEW,
                lead_score=100 if email and phone else 50,
                ai_summary=f"{name} requirement: {message[:100]}"
            )
        except Exception as e:
            print("Contact DB save warning:", e)

        send_telegram_alert(name, email, phone, budget, message)
        send_google_sheet_lead(name, email, phone, budget, message)

    return render(request, 'index.html')

@ensure_csrf_cookie
def faq(request):
    return render(request, 'smartfiq-faq.html')

@ensure_csrf_cookie
def terms(request):
    return render(request, 'terms.html')

@ensure_csrf_cookie
def privacy(request):
    return render(request, 'privacy-policy.html')

@ensure_csrf_cookie
def insights_view(request):
    return render(request, 'insights.html')

def serve_root_file(request, filename):
    if filename == 'logo-transparent.png':
        filename = 'smartfiq-ai-automation-logo.png'

    # Check static/images/ fallback for images and logos
    static_img_path = BASE_DIR / 'static' / 'images' / filename
    if static_img_path.exists() and static_img_path.is_file():
        return serve(request, filename, document_root=BASE_DIR / 'static' / 'images')

    static_path = BASE_DIR / 'static' / filename
    if static_path.exists() and static_path.is_file():
        return serve(request, filename, document_root=BASE_DIR / 'static')

    file_path = BASE_DIR / filename
    if file_path.exists() and file_path.is_file():
        return serve(request, filename, document_root=BASE_DIR)

    return render(request, 'index.html')
