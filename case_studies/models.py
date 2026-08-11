from django.db import models

class CaseStudy(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    project_title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    client_name = models.CharField(max_length=150, blank=True, null=True)
    category = models.CharField(max_length=100, default='AI Automation')
    description = models.CharField(max_length=250, blank=True, default='')
    problem = models.TextField()
    solution = models.TextField()
    results = models.TextField()
    content = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PUBLISHED)
    seo_title = models.CharField(max_length=150, blank=True, null=True)
    seo_description = models.TextField(blank=True, null=True)
    featured_image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.project_title
