from django.shortcuts import render
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def list_case_studies(request):
    return render(request, 'case-studies.html')

def detail_case_study(request, slug=None):
    if slug:
        clean_slug = slug.replace('.html', '')
        cs_path = BASE_DIR / 'case-studies' / f'{clean_slug}.html'
        if cs_path.exists():
            return render(request, f'case-studies/{clean_slug}.html')
    return render(request, 'case-studies/lead-extraction-agent.html')
