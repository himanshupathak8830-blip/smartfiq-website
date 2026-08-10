from django.db import models

class Service(models.Model):
    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    description = models.TextField()
    pricing_info = models.CharField(max_length=100, blank=True, null=True)
    icon = models.CharField(max_length=50, default='settings')
    features = models.JSONField(default=list)
    display_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.title
