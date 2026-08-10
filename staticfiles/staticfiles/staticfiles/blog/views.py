from django.shortcuts import render
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def list_posts(request):
    return render(request, 'blog.html')

def detail_post(request, slug=None):
    if slug:
        clean_slug = slug.replace('.html', '')
        article_path = BASE_DIR / 'blog' / f'{clean_slug}.html'
        if article_path.exists():
            return render(request, f'blog/{clean_slug}.html')
    return render(request, 'blog-detail.html')
