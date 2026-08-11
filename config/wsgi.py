import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@smartfiq.website')
    admin_password = os.getenv('ADMIN_PASSWORD', 'SmartFiQ2026!')
    
    if not User.objects.filter(username=admin_username).exists():
        User.objects.create_superuser(admin_username, admin_email, admin_password)
        print(f"Superuser '{admin_username}' created successfully.")
    else:
        u = User.objects.get(username=admin_username)
        u.set_password(admin_password)
        u.is_staff = True
        u.is_superuser = True
        u.save()
        print(f"Superuser '{admin_username}' password updated successfully.")
except Exception as e:
    print("Auto migration & admin setup warning:", e)
