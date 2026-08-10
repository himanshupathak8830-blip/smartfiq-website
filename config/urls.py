from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import home, about, our_story, contact, faq, terms, privacy, admin_panel, insights_view, serve_root_file
from blog.views import list_posts, detail_post
from services.views import list_services
from case_studies.views import list_case_studies, detail_case_study

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('admin', admin_panel, name='admin_panel'),
    path('admin.html', admin_panel),
    
    path('', home, name='home'),
    path('index.html', home),
    path('about-smartfiq', about, name='about'),
    path('about-smartfiq.html', about),
    path('our-story', our_story, name='our_story'),
    path('our-story.html', our_story),
    path('contact', contact, name='contact'),
    path('faq', faq, name='faq'),
    path('faq.html', faq),
    path('terms', terms, name='terms'),
    path('terms.html', terms),
    path('privacy-policy', privacy, name='privacy'),
    path('privacy-policy.html', privacy),
    path('insights', insights_view, name='insights'),
    path('insights.html', insights_view),

    path('blog', list_posts, name='blog_list'),
    path('blog.html', list_posts),
    path('blog-detail.html', detail_post),
    path('blog/<slug:slug>', detail_post, name='blog_detail'),

    path('services', list_services, name='services_list'),
    path('services.html', list_services),

    path('case-studies', list_case_studies, name='case_studies_list'),
    path('case-studies.html', list_case_studies),
    path('case-studies/<slug:slug>', detail_case_study, name='case_study_detail'),
    path('lead-extraction-case-study.html', detail_case_study),

    path('api/', include('api.urls')),
    
    re_path(r'^(?P<filename>.*\.js|.*\.png|.*\.webp|.*\.css|.*\.xml|.*\.txt)$', serve_root_file),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static('/', document_root=settings.BASE_DIR)
