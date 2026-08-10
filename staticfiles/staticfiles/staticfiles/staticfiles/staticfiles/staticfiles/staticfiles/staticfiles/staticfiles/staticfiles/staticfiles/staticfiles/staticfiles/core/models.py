from django.db import models
from django.contrib.auth.models import User

class Lead(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    company = models.CharField(max_length=150, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    budget = models.CharField(max_length=100, blank=True, null=True)
    source = models.CharField(max_length=100, default='Website')
    status = models.CharField(max_length=50, default='new')
    priority = models.CharField(max_length=50, default='normal')
    lead_score = models.IntegerField(default=50)
    ai_summary = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
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
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True)
    client_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    service = models.CharField(max_length=100, default='AI Audit')
    meeting_type = models.CharField(max_length=100, default='AI Audit Consultation')
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=50, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

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
    session_id = models.CharField(max_length=150, unique=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    email = models.CharField(max_length=150, default='Guest')
    location = models.CharField(max_length=150, default='India')
    country_type = models.CharField(max_length=50, default='India')  # India vs International
    visitor_type = models.CharField(max_length=50, default='Human')  # Human vs Bot
    isp = models.CharField(max_length=150, default='Telecom')
    is_bot = models.BooleanField(default=False)
    bot_name = models.CharField(max_length=100, blank=True, null=True)
    bot_category = models.CharField(max_length=100, blank=True, null=True)
    device = models.CharField(max_length=50, default='Desktop')
    device_model = models.CharField(max_length=100, default='PC')
    browser = models.CharField(max_length=50, default='Chrome')
    os = models.CharField(max_length=50, default='Windows')
    entry_page = models.CharField(max_length=250, default='/')
    current_page = models.CharField(max_length=250, default='/')
    exit_page = models.CharField(max_length=250, default='/')
    session_duration = models.IntegerField(default=0)
    scroll_pct = models.IntegerField(default=0)
    page_views = models.IntegerField(default=1)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.ip_address} - {self.location} ({self.visitor_type})"

class SecurityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=100, blank=True, null=True)
    action = models.CharField(max_length=150)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SiteSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
