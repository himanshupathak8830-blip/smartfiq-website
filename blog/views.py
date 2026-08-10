from django.shortcuts import render, get_object_or_404
from .models import Post, Category

def list_posts(request):
    category_slug = request.GET.get('category')
    posts = Post.objects.filter(status=Post.Status.PUBLISHED)
    categories = Category.objects.all()
    
    if category_slug:
        posts = posts.filter(category__name__iexact=category_slug)
        
    return render(request, 'blog/list.html', {
        'posts': posts,
        'categories': categories,
        'selected_category': category_slug
    })

def detail_post(request, slug):
    post = get_object_or_404(Post, slug=slug, status=Post.Status.PUBLISHED)
    post.view_count += 1
    post.save(update_fields=['view_count'])
    
    related_posts = Post.objects.filter(status=Post.Status.PUBLISHED).exclude(id=post.id)[:3]
    
    return render(request, 'blog/detail.html', {
        'post': post,
        'related_posts': related_posts
    })
