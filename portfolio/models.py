from django.db import models

class PortfolioItem(models.Model):
    project_name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    description = models.TextField()
    category = models.CharField(max_length=100, default='AI Automation')
    image_url = models.URLField(blank=True, null=True)
    client_link = models.URLField(blank=True, null=True, help_text="Optional live project or case study link")
    display_order = models.IntegerField(default=1)
    is_featured = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return self.project_name
