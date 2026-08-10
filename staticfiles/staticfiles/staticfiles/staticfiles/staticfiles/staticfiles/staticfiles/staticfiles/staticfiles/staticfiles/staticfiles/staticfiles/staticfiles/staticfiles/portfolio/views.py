from django.shortcuts import render
from .models import PortfolioItem

def list_portfolio(request):
    items = PortfolioItem.objects.filter(is_featured=True)
    return render(request, 'portfolio/list.html', {'items': items})
