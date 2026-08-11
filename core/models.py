from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
import uuid


def prefixed_id(prefix):
    return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

def lead_id_default():
    return prefixed_id('LD')

def appointment_id_default():
    return prefixed_id('APT')

def subscriber_id_default():
    return prefixed_id('SUB')

def visitor_id_default():
    return prefixed_id('VIS')

def security_log_id_default():
    return prefixed_id('LOG')

class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        CONTACTED = 'CONTACTED', 'Contacted'
        QUALIFIED = 'QUALIFIED', 'Qualified'
        CONVERTED = 'CONVERTED', 'Converted'
        LOST = 'LOST', 'Lost'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    lead_id = models.CharField(max_length=40, unique=True, default=lead_id_default)
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    company = models.CharField(max_length=150, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    budget = models.CharField(max_length=100, blank=True, null=True)
    source = models.CharField(max_length=100, default='Website')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    lead_score = models.IntegerField(default=50)
    ai_summary = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    country = models.CharField(max_length=100, blank=True, default='Unknown')
    city = models.CharField(max_length=100, blank=True, default='Unknown')
    visitor_session_id = models.CharField(max_length=150, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"

class LeadNote(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        COMPLETED = 'COMPLETED', 'Completed'

    appointment_id = models.CharField(max_length=40, unique=True, default=appointment_id_default)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True)
    client_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    service = models.CharField(max_length=100, default='AI Audit')
    meeting_type = models.CharField(max_length=100, default='AI Audit Consultation')
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_appointments')
    notes = models.TextField(blank=True, default='')
    visitor_session_id = models.CharField(max_length=150, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Subscriber(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        UNSUBSCRIBED = 'UNSUBSCRIBED', 'Unsubscribed'
        BOUNCED = 'BOUNCED', 'Bounced'

    subscriber_id = models.CharField(max_length=40, unique=True, default=subscriber_id_default)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150, blank=True, default='')
    source = models.CharField(max_length=100, default='Website')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    visitor_session_id = models.CharField(max_length=150, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return self.email

class TeamMember(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=150)
    bio = models.TextField()
    profile_image = models.URLField(max_length=500)
    linkedin = models.URLField(max_length=500, blank=True, null=True)
    skills = models.JSONField(default=list)
    revenue = models.CharField(max_length=50, default='₹0')
    leads_count = models.IntegerField(default=0)
    attendance = models.CharField(max_length=50, default='100%')
    kpi = models.CharField(max_length=50, default='5.0/5')
    display_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.name

class Visitor(models.Model):
    visitor_id = models.CharField(max_length=40, unique=True, default=visitor_id_default)
    session_id = models.CharField(max_length=150, unique=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    email = models.CharField(max_length=150, default='Guest')
    location = models.CharField(max_length=150, default='Unknown')
    country = models.CharField(max_length=100, default='Unknown')
    country_code = models.CharField(max_length=10, default='Unknown')
    country_type = models.CharField(max_length=50, default='Unknown')
    city = models.CharField(max_length=100, default='Unknown')
    region = models.CharField(max_length=100, default='Unknown')
    timezone = models.CharField(max_length=100, default='Unknown')
    visitor_type = models.CharField(max_length=50, default='Human')
    isp = models.CharField(max_length=150, default='Unknown')
    is_bot = models.BooleanField(default=False)
    bot_name = models.CharField(max_length=100, blank=True, null=True)
    bot_category = models.CharField(max_length=100, blank=True, null=True)
    device = models.CharField(max_length=50, default='Unknown')
    device_model = models.CharField(max_length=100, default='Unknown')
    browser = models.CharField(max_length=50, default='Unknown')
    os = models.CharField(max_length=50, default='Unknown')
    entry_page = models.CharField(max_length=250, default='/')
    current_page = models.CharField(max_length=250, default='/')
    exit_page = models.CharField(max_length=250, default='/')
    session_duration = models.IntegerField(default=0)
    scroll_pct = models.IntegerField(default=0)
    page_views = models.IntegerField(default=1)
    pages_visited = models.JSONField(default=list, blank=True)
    referrer = models.TextField(blank=True, default='')
    landing_source = models.CharField(max_length=150, default='Direct')
    lead_id = models.CharField(max_length=40, blank=True, default='')
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.ip_address} - {self.location} ({self.visitor_type})"

class SecurityLog(models.Model):
    class Action(models.TextChoices):
        LOGIN_SUCCESS = 'LOGIN_SUCCESS', 'Login success'
        LOGIN_FAILED = 'LOGIN_FAILED', 'Login failed'
        LOGOUT = 'LOGOUT', 'Logout'
        PASSWORD_CHANGED = 'PASSWORD_CHANGED', 'Password changed'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password reset'
        CREATE_USER = 'CREATE_USER', 'Create user'
        UPDATE_USER = 'UPDATE_USER', 'Update user'
        DELETE_USER = 'DELETE_USER', 'Delete user'
        CREATE_LEAD = 'CREATE_LEAD', 'Create lead'
        UPDATE_LEAD = 'UPDATE_LEAD', 'Update lead'
        DELETE_LEAD = 'DELETE_LEAD', 'Delete lead'
        CREATE_SUBSCRIBER = 'CREATE_SUBSCRIBER', 'Create subscriber'
        UPDATE_SUBSCRIBER = 'UPDATE_SUBSCRIBER', 'Update subscriber'
        DELETE_SUBSCRIBER = 'DELETE_SUBSCRIBER', 'Delete subscriber'
        CREATE_APPOINTMENT = 'CREATE_APPOINTMENT', 'Create appointment'
        UPDATE_APPOINTMENT = 'UPDATE_APPOINTMENT', 'Update appointment'
        DELETE_APPOINTMENT = 'DELETE_APPOINTMENT', 'Delete appointment'
        CREATE_BLOG = 'CREATE_BLOG', 'Create blog'
        UPDATE_BLOG = 'UPDATE_BLOG', 'Update blog'
        DELETE_BLOG = 'DELETE_BLOG', 'Delete blog'
        CREATE_CASE_STUDY = 'CREATE_CASE_STUDY', 'Create case study'
        UPDATE_CASE_STUDY = 'UPDATE_CASE_STUDY', 'Update case study'
        DELETE_CASE_STUDY = 'DELETE_CASE_STUDY', 'Delete case study'
        CMS_UPDATE = 'CMS_UPDATE', 'CMS update'

    log_id = models.CharField(max_length=40, unique=True, default=security_log_id_default)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=100, blank=True, null=True)
    action = models.CharField(max_length=50, choices=Action.choices)
    target_type = models.CharField(max_length=100, blank=True, default='')
    target_id = models.CharField(max_length=100, blank=True, default='')
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    device = models.CharField(max_length=50, blank=True, default='Unknown')
    browser = models.CharField(max_length=50, blank=True, default='Unknown')
    os = models.CharField(max_length=50, blank=True, default='Unknown')
    status = models.CharField(max_length=30, default='SUCCESS')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} - {self.username or 'System'}"

class SiteSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
