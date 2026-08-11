import os
import requests
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.static import serve
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8841778238:AAHOmeQHKc8MiBpOTnov-defOCzBHdIkOI0")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "-5570843599")
GOOGLE_SHEET_URL = os.getenv("GOOGLE_SHEET_URL", "https://script.google.com/macros/s/AKfycbxhaaYQJ6wtk4Oo8FpqMF7wdYISFRpghPthKB_iH9hXSQMxYWKZrJESuyy0ZngcBRU_/exec")

def send_google_sheet_lead(full_name, email, phone, budget, requirement_details):
    try:
        import datetime
        payload = {
            "type": "lead",
            "target": "Leads",
            "Timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "fullName": full_name or "",
            "Full Name": full_name or "",
            "email": email or "",
            "Business Email": email or "",
            "phone": phone or "",
            "Phone Number": phone or "",
            "budget": budget or "",
            "Budget": budget or "",
            "requirements": requirement_details or "",
            "Requirement Details": requirement_details or ""
        }
        requests.post(GOOGLE_SHEET_URL, json=payload, headers={'Content-Type': 'application/json'}, timeout=5)
    except Exception as e:
        print("Google Sheet sync warning:", e)

def send_telegram_alert(lead_name, email, phone, budget, message):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        text = (
            f"🚨 New Lead Received! (Automate With AK)\n\n"
            f"👤 Name: {lead_name}\n"
            f"📧 Email: {email or 'N/A'}\n"
            f"📞 Phone: {phone or 'N/A'}\n"
            f"💰 Budget: {budget or 'N/A'}\n"
            f"📝 Message: {message or 'N/A'}\n"
            f"🌐 Source: Website Contact Form"
        )
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=5
        )
    except Exception as e:
        print("Telegram alert warning:", e)

def home(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'about-smartfiq.html')

def our_story(request):
    return render(request, 'our-story.html')

from core.models import Lead

def contact(request):
    if request.method == 'POST':
        try:
            name = request.POST.get('fullName') or request.POST.get('name') or 'Website Inquiry Lead'
            email = request.POST.get('email')
            phone = request.POST.get('phone')
            budget = request.POST.get('budget')
            message = request.POST.get('requirements') or request.POST.get('message') or ''

            Lead.objects.create(
                name=name,
                email=email,
                phone=phone,
                budget=budget,
                message=message,
                source='Contact Form',
                status='new',
                lead_score=100 if email and phone else 50,
                ai_summary=f"{name} requirement: {message[:100]}"
            )
            send_telegram_alert(name, email, phone, budget, message)
            send_google_sheet_lead(name, email, phone, budget, message)
        except Exception as e:
            print("Contact form processing error:", e)

    return render(request, 'index.html')

def faq(request):
    return render(request, 'faq.html')

def terms(request):
    return render(request, 'terms.html')

def privacy(request):
    return render(request, 'privacy-policy.html')

def admin_panel(request):
    return render(request, 'admin.html')

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
