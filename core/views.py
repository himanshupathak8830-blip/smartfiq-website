import os
import requests
from django.shortcuts import render, redirect
from django.contrib import messages
from .models import TeamMember, Lead
from .forms import ContactForm

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

def send_telegram_alert(lead):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        text = (
            f"🚨 New Website Lead Received!\n\n"
            f"👤 Name: {lead.name}\n"
            f"📧 Email: {lead.email or 'N/A'}\n"
            f"🏢 Company: {lead.company or 'N/A'}\n"
            f"📝 Message: {lead.message or 'N/A'}\n"
            f"🌐 Source: {lead.source}"
        )
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=5
        )
    except Exception as e:
        print("Telegram alert warning:", e)

def home(request):
    return render(request, 'core/home.html')

def about(request):
    return render(request, 'core/about.html')

def our_story(request):
    team_members = TeamMember.objects.filter(is_active=True)
    return render(request, 'core/our_story.html', {'team_members': team_members})

def contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            lead = form.save(commit=False)
            lead.source = 'Contact Page'
            lead.save()
            send_telegram_alert(lead)
            messages.success(request, 'Thank you! Your message has been received. Our team will get back to you shortly.')
            return redirect('core:contact')
    else:
        form = ContactForm()
    return render(request, 'core/contact.html', {'form': form})

def faq(request):
    return render(request, 'core/faq.html')

def terms(request):
    return render(request, 'core/terms.html')

def privacy(request):
    return render(request, 'core/privacy.html')
