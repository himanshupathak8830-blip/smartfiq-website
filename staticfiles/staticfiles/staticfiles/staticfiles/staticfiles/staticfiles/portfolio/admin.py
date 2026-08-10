from django.contrib import admin
from .models import PortfolioItem

@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_name', 'category', 'display_order', 'is_featured')
    list_editable = ('display_order', 'is_featured')
    prepopulated_fields = {'slug': ('project_name',)}
