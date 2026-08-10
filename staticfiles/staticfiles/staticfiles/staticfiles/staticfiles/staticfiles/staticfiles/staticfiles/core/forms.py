from django import forms
from .models import Lead

class ContactForm(forms.ModelForm):
    referred_by = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'input-field', 'placeholder': 'Optional - friend, search, or social'})
    )
    service_interest = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'input-field', 'placeholder': 'What do you need?'})
    )

    class Meta:
        model = Lead
        fields = ['name', 'email', 'company', 'message']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'input-field', 'placeholder': 'Your Name'}),
            'email': forms.EmailInput(attrs={'class': 'input-field', 'placeholder': 'your@email.com'}),
            'company': forms.TextInput(attrs={'class': 'input-field', 'placeholder': 'Company / Business Name'}),
            'message': forms.Textarea(attrs={'class': 'input-field', 'rows': 4, 'placeholder': 'Tell us about your project requirements...'}),
        }
