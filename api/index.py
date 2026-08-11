import os
import sys

# Add project root directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.core.management import call_command
from django.contrib.auth.models import User

# Safe cold-start setup for Vercel serverless environment
if os.getenv('RUN_MIGRATIONS_ON_BOOT') == '1':
    try:
        call_command('migrate', interactive=False)
        admin_user = os.getenv('DJANGO_SUPERUSER_USERNAME', 'smartfiq')
        admin_email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@smartfiq.website')
        admin_pass = os.getenv('DJANGO_SUPERUSER_PASSWORD')
        if admin_pass and not User.objects.filter(username=admin_user).exists():
            User.objects.create_superuser(admin_user, admin_email, admin_pass)
    except Exception as e:
        print("Vercel migration log:", e)

from config.wsgi import application

# Vercel Serverless Function entrypoints
app = application
handler = application
