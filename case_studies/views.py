from django.shortcuts import render

def list_case_studies(request):
    return render(request, 'case-studies.html')

def detail_case_study(request, slug=None):
    if slug == 'whatsapp-automation-guide':
        return render(request, 'case-studies/whatsapp-automation-guide.html')
    elif slug == 'data-modeling-bi-dashboard':
        return render(request, 'case-studies/data-modeling-bi-dashboard.html')
    return render(request, 'case-studies/lead-extraction-agent.html')
