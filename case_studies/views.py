from django.shortcuts import render, get_object_or_404
from .models import CaseStudy

def list_case_studies(request):
    case_studies = CaseStudy.objects.all()
    return render(request, 'case_studies/list.html', {'case_studies': case_studies})

def detail_case_study(request, slug):
    case_study = get_object_or_404(CaseStudy, slug=slug)
    return render(request, 'case_studies/detail.html', {'case_study': case_study})
