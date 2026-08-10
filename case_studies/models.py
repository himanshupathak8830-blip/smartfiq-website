from django.db import models

class CaseStudy(models.Model):
    project_title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    client_name = models.CharField(max_length=150, blank=True, null=True)
    problem = models.TextField()
    solution = models.TextField()
    results = models.TextField()
    seo_title = models.CharField(max_length=150, blank=True, null=True)
    seo_description = models.TextField(blank=True, null=True)
    featured_image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.project_title
