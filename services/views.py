from django.shortcuts import render

def list_services(request):
    return render(request, 'services.html')
