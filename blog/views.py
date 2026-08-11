from django.http import Http404, HttpResponse
from django.shortcuts import render
from pathlib import Path

from .models import Post

BASE_DIR = Path(__file__).resolve().parent.parent

def list_posts(request):
    return render(request, 'blog.html')

def detail_post(request, slug=None):
    if slug:
        clean_slug = slug.replace('.html', '').strip().lower()

        # 1. First check pre-rendered static HTML file in blog/ folder
        root_blog_path = BASE_DIR / 'blog' / f'{clean_slug}.html'
        if root_blog_path.exists():
            with open(root_blog_path, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')

        tpl_path = BASE_DIR / 'templates' / 'blog' / f'{clean_slug}.html'
        if tpl_path.exists():
            return render(request, f'blog/{clean_slug}.html')

        # 2. Check DB safely with try...except
        try:
            db_post = Post.objects.filter(slug=clean_slug).first()
            if db_post:
                if db_post.status != Post.Status.PUBLISHED:
                    raise Http404("Blog post is not published.")
                return render(request, 'blog-detail.html')
        except Exception as e:
            print("Blog Post DB query exception:", e)

    return render(request, 'blog.html')
