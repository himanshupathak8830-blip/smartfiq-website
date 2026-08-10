import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import Lead, TeamMember, Visitor, SecurityLog
from services.models import Service
from blog.models import Post
from core.views import send_telegram_alert

@csrf_exempt
def health_db(request):
    return JsonResponse({
        "success": True,
        "status": "healthy",
        "database": "PostgreSQL 17 (Python Django)"
    })

@csrf_exempt
def lead_create(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        name = data.get('fullName') or data.get('name') or 'Anonymous Lead'
        email = data.get('email')
        phone = data.get('phone')
        budget = data.get('budget')
        message = data.get('requirements') or data.get('message') or ''

        lead = Lead.objects.create(
            name=name,
            email=email,
            phone=phone,
            budget=budget,
            message=message,
            source=data.get('source', 'Hero Form'),
            status='new',
            lead_score=100 if email and phone else 50,
            ai_summary=f"{name} submitted requirement: {message[:100]}"
        )

        send_telegram_alert(lead)

        return JsonResponse({
            "success": True,
            "lead": {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "lead_score": lead.lead_score
            }
        })
    
    return JsonResponse({"error": "Method not allowed"}, status=405)

def agency_team(request):
    members = TeamMember.objects.filter(is_active=True)
    data = [{
        "id": m.id,
        "name": m.name,
        "role": m.role,
        "bio": m.bio,
        "image": m.profile_image,
        "linkedin": m.linkedin,
        "skills": m.skills,
        "revenue": m.revenue,
        "leads": m.leads_count,
        "attendance": m.attendance,
        "kpi": m.kpi
    } for m in members]
    return JsonResponse(data, safe=False)

def public_services(request):
    services = Service.objects.filter(is_active=True)
    data = [{
        "id": s.id,
        "name": s.title,
        "desc": s.description,
        "price": s.pricing_info,
        "icon": s.icon,
        "features": s.features
    } for s in services]
    return JsonResponse(data, safe=False)

def public_blogs(request):
    blogs = Post.objects.filter(status=Post.Status.PUBLISHED)
    data = [{
        "id": b.id,
        "title": b.title,
        "slug": b.slug,
        "excerpt": b.excerpt,
        "coverImage": b.cover_image_url or (b.cover_image.url if b.cover_image else None),
        "status": b.status,
        "readTime": f"{b.reading_time} mins"
    } for b in blogs]
    return JsonResponse(data, safe=False)
