from django.http import Http404, HttpResponse
from django.shortcuts import render
from pathlib import Path

from .models import CaseStudy

BASE_DIR = Path(__file__).resolve().parent.parent

def list_case_studies(request):
    return render(request, 'case-studies.html')

def detail_case_study(request, slug=None):
    if slug:
        clean_slug = slug.replace('.html', '').strip().lower()

        # 1. First check pre-rendered static HTML file in case-studies/ folder
        root_case_study = BASE_DIR / 'case-studies' / f'{clean_slug}.html'
        if root_case_study.exists():
            with open(root_case_study, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')

        cs_tpl = BASE_DIR / 'templates' / 'case-studies' / f'{clean_slug}.html'
        if cs_tpl.exists():
            return render(request, f'case-studies/{clean_slug}.html')

        # 2. Check DB safely with try...except
        try:
            db_case_study = CaseStudy.objects.filter(slug=clean_slug).first()
            if db_case_study:
                if db_case_study.status != CaseStudy.Status.PUBLISHED:
                    raise Http404("Case study is not published.")
                return render(request, 'case-studies.html')
        except Exception as e:
            print("CaseStudy DB query exception:", e)

    return render(request, 'case-studies.html')
