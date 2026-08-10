import os
import sys

# Add project root directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.core.management import call_command
from django.contrib.auth.models import User

# Auto-migrate database tables & create admin superuser on Vercel cold start
try:
    call_command('migrate', interactive=False)
    if not User.objects.filter(username='smartfiq').exists():
        User.objects.create_superuser('smartfiq', 'admin@smartfiq.website', 'Smartfiq#Sec2026!Admin')
except Exception as e:
    print("Vercel cold start migration log:", e)

from config.wsgi import application

# Vercel Serverless Function entrypoints
app = application
handler = application
