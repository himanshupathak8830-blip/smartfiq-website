from django.shortcuts import render

def list_posts(request):
    return render(request, 'blog.html')

def detail_post(request, slug=None):
    return render(request, 'blog-detail.html')
