from django.db import models
from django.urls import reverse

class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts")
    cover_image = models.ImageField(upload_to="blog/", blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True, help_text="External image fallback URL")
    excerpt = models.CharField(max_length=250, help_text="List page + social share ke liye summary")
    body = models.TextField(help_text="Blank line = new paragraph. '## ' se heading, '- ' se bullet.")
    youtube_url = models.URLField(max_length=500, blank=True, null=True, help_text="Optional - video guide ka Youtube link. Post ke body ke saath dikhega.")
    meta_title = models.CharField(max_length=200, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    keywords = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PUBLISHED)
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    view_count = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("blog:detail", args=[self.slug])

    @property
    def embed_url(self):
        return self.youtube_url

    @property
    def reading_time(self):
        word_count = len((self.body or "").split())
        return max(1, round(word_count / 200))

    @property
    def toc(self):
        headings = []
        if not self.body:
            return headings
        for line in self.body.split('\n'):
            if line.startswith('## '):
                text = line.replace('## ', '').strip()
                slug = text.lower().replace(' ', '-').replace('?', '')
                headings.append({'text': text, 'slug': slug})
        return headings
