from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Administration personnalisée pour le modèle CustomUser
    """
    
    # Champs affichés dans la liste
    list_display = (
        'username', 'email', 'first_name', 'last_name', 
        'role', 'departement', 'is_active', 'date_joined'
    )
    
    list_filter = (
        'role', 'departement', 'is_active', 'is_staff', 'date_joined'
    )
    
    search_fields = ('username', 'first_name', 'last_name', 'email')
    
    ordering = ('-date_joined',)
    
    # Configuration des fieldsets pour le formulaire d'édition
    fieldsets = UserAdmin.fieldsets + (
        (_('Informations ETER'), {
            'fields': ('role', 'departement', 'telephone')
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Champs en lecture seule
    readonly_fields = ('created_at', 'updated_at')
    
    # Configuration pour l'ajout d'utilisateur
    add_fieldsets = UserAdmin.add_fieldsets + (
        (_('Informations ETER'), {
            'fields': ('role', 'departement', 'telephone', 'email', 'first_name', 'last_name')
        }),
    )
    
    def get_form(self, request, obj=None, **kwargs):
        """
        Personnaliser le formulaire selon le contexte
        """
        form = super().get_form(request, obj, **kwargs)
        
        # Logique pour les champs conditionnels
        if 'departement' in form.base_fields:
            # Aide contextuelle
            form.base_fields['departement'].help_text = (
                "Obligatoire pour les DEMANDEURS. "
                "Automatiquement défini à 'DAL' pour les ACHETEURS. "
                "Vide pour les ADMIN."
            )
        
        return form
    
    def save_model(self, request, obj, form, change):
        """
        Logique personnalisée de sauvegarde
        """
        try:
            super().save_model(request, obj, form, change)
        except ValueError as e:
            # Gestion des erreurs de validation
            self.message_user(request, str(e), level='ERROR')
            return
    
    # Actions personnalisées
    actions = ['activate_users', 'deactivate_users', 'reset_passwords']
    
    def activate_users(self, request, queryset):
        """Activer les utilisateurs sélectionnés"""
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} utilisateur(s) activé(s).")
    activate_users.short_description = "Activer les utilisateurs sélectionnés"
    
    def deactivate_users(self, request, queryset):
        """Désactiver les utilisateurs sélectionnés"""
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} utilisateur(s) désactivé(s).")
    deactivate_users.short_description = "Désactiver les utilisateurs sélectionnés"