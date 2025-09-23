from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import (
    Fournisseur, MaterielLocation, DemandeLocation, MaterielDemande,
    MiseADisposition, Engagement, FichePointageMateriel, 
    PointageJournalier, FicheVerificationPointage
)


@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    """
    Administration des fournisseurs
    """
    list_display = ['nif', 'raison_sociale', 'telephone', 'actif', 'created_at']
    list_filter = ['actif', 'created_at']
    search_fields = ['nif', 'raison_sociale', 'telephone']
    ordering = ['raison_sociale']
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('nif', 'raison_sociale', 'actif')
        }),
        ('Contact', {
            'fields': ('telephone', 'email', 'adresse')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    actions = ['activer_fournisseurs', 'desactiver_fournisseurs']
    
    def activer_fournisseurs(self, request, queryset):
        count = queryset.update(actif=True)
        self.message_user(request, f"{count} fournisseur(s) activé(s).")
    activer_fournisseurs.short_description = "Activer les fournisseurs sélectionnés"
    
    def desactiver_fournisseurs(self, request, queryset):
        count = queryset.update(actif=False)
        self.message_user(request, f"{count} fournisseur(s) désactivé(s).")
    desactiver_fournisseurs.short_description = "Désactiver les fournisseurs sélectionnés"


@admin.register(MaterielLocation)
class MaterielLocationAdmin(admin.ModelAdmin):
    """
    Administration du catalogue des matériels
    """
    list_display = ['type_materiel', 'type_facturation', 'prix_unitaire_mru', 'actif', 'created_at']
    list_filter = ['type_materiel', 'type_facturation','actif', 'created_at']
    search_fields = ['type_materiel',  'observations']
    ordering = ['type_materiel']
    
    fieldsets = (
        ('Informations du matériel', {
            'fields': ('type_materiel', 'type_facturation', 'prix_unitaire_mru', 'actif')
        }),
        ('Détails', {
            'fields': ('observations',)
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at']
    
    actions = ['activer_materiels', 'desactiver_materiels']
    
    def activer_materiels(self, request, queryset):
        count = queryset.update(actif=True)
        self.message_user(request, f"{count} matériel(s) activé(s).")
    activer_materiels.short_description = "Activer les matériels sélectionnés"
    
    def desactiver_materiels(self, request, queryset):
        count = queryset.update(actif=False)
        self.message_user(request, f"{count} matériel(s) désactivé(s).")
    desactiver_materiels.short_description = "Désactiver les matériels sélectionnés"


class MaterielDemandeInline(admin.TabularInline):
    """
    Interface inline pour les matériels dans les DL
    """
    model = MaterielDemande
    extra = 1
    fields = ['materiel', 'quantite', 'sous_total', 'observations']
    readonly_fields = ['sous_total']


@admin.register(DemandeLocation)
class DemandeLocationAdmin(admin.ModelAdmin):
    """
    Administration des demandes de location
    """
    list_display = [
        'numero', 'chantier', 'demandeur', 'departement', 
        'statut_colored', 'budget_previsionnel_mru', 'created_at'
    ]
    list_filter = ['statut', 'departement', 'created_at']
    search_fields = ['numero', 'chantier', 'demandeur__first_name', 'demandeur__last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('numero', 'demandeur', 'departement', 'date_demande')
        }),
        ('Détails de la demande', {
            'fields': ('chantier', 'duree_mois', 'observations')
        }),
        ('Budget et validation', {
            'fields': ('budget_previsionnel_mru', 'statut', 'validateur', 'date_validation')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['numero', 'budget_previsionnel_mru', 'departement', 'created_at', 'updated_at']
    inlines = [MaterielDemandeInline]
    
    def statut_colored(self, obj):
        """Affichage coloré du statut"""
        colors = {
            'BROUILLON': 'gray',
            'SOUMISE': 'orange', 
            'VALIDEE': 'green',
            'REJETEE': 'red',
            'MISE_A_DISPOSITION': 'blue',
            'ENGAGEMENT_CREE': 'purple'
        }
        color = colors.get(obj.statut, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_statut_display()
        )
    statut_colored.short_description = 'Statut'
    
    def get_queryset(self, request):
        """Filtrer par utilisateur si pas admin"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser and not request.user.is_staff:
            # Adapter selon votre système d'authentification
            if hasattr(request.user, 'is_demandeur') and request.user.is_demandeur:
                qs = qs.filter(demandeur=request.user)
            elif hasattr(request.user, 'is_acheteur') and request.user.is_acheteur:
                qs = qs.filter(statut__in=['VALIDEE', 'MISE_A_DISPOSITION', 'ENGAGEMENT_CREE'])
        return qs
    
    actions = ['valider_demandes', 'rejeter_demandes']
    
    def valider_demandes(self, request, queryset):
        # Adapter selon votre système de permissions
        if not request.user.is_superuser:
            self.message_user(request, "Vous n'avez pas les droits pour valider des demandes.", level='ERROR')
            return
        
        count = queryset.filter(statut='SOUMISE').update(
            statut='VALIDEE',
            validateur=request.user,
            date_validation=timezone.now()
        )
        self.message_user(request, f"{count} demande(s) validée(s).")
    valider_demandes.short_description = "Valider les demandes sélectionnées"
    
    def rejeter_demandes(self, request, queryset):
        # Adapter selon votre système de permissions
        if not request.user.is_superuser:
            self.message_user(request, "Vous n'avez pas les droits pour rejeter des demandes.", level='ERROR')
            return
        
        count = queryset.filter(statut='SOUMISE').update(
            statut='REJETEE',
            validateur=request.user,
            date_validation=timezone.now()
        )
        self.message_user(request, f"{count} demande(s) rejetée(s).")
    rejeter_demandes.short_description = "Rejeter les demandes sélectionnées"


@admin.register(MaterielDemande)
class MaterielDemandeAdmin(admin.ModelAdmin):
    """
    Administration des matériels demandés
    """
    list_display = [
        'demande_location', 'materiel', 'quantite', 'sous_total'
    ]
    list_filter = ['materiel__type_materiel', 'demande_location__statut']
    search_fields = ['demande_location__numero', 'materiel__type_materiel', 'observations']
    ordering = ['-demande_location__created_at']
    
    fieldsets = (
        ('Demande et matériel', {
            'fields': ('demande_location', 'materiel', 'quantite')
        }),
        ('Montant', {
            'fields': ('sous_total',)
        }),
        ('Observations', {
            'fields': ('observations',)
        }),
    )
    
    readonly_fields = ['sous_total']


@admin.register(MiseADisposition)
class MiseADispositionAdmin(admin.ModelAdmin):
    """
    Administration des mises à disposition
    """
    list_display = [
        'demande_location', 'fournisseur', 'date_mise_disposition', 
        'immatriculation', 'conforme', 'responsable'
    ]
    list_filter = ['conforme', 'date_mise_disposition', 'fournisseur']
    search_fields = [
        'demande_location__numero', 'fournisseur__raison_sociale', 
        'immatriculation', 'demande_location__chantier'
    ]
    ordering = ['-date_mise_disposition']
    
    fieldsets = (
        ('Demande et fournisseur', {
            'fields': ('demande_location', 'fournisseur', 'responsable')
        }),
        ('Mise à disposition', {
            'fields': ('date_mise_disposition', 'immatriculation', 'conforme', 'observations')
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Filtrer par rôle utilisateur"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser and not request.user.is_staff:
            if hasattr(request.user, 'is_acheteur') and request.user.is_acheteur:
                qs = qs.filter(responsable=request.user)
            else:
                qs = qs.filter(demande_location__demandeur=request.user)
        return qs


@admin.register(Engagement)
class EngagementAdmin(admin.ModelAdmin):
    """
    Administration des engagements (CTL)
    """
    list_display = [
        'numero', 'chantier_display', 'montant_total_estime_mru', 
        'date_debut', 'date_fin', 'jours_restants_display'
    ]
    list_filter = ['date_debut', 'date_fin']
    search_fields = [
        'numero', 'mise_a_disposition__demande_location__chantier',
        'mise_a_disposition__fournisseur__raison_sociale'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('numero', 'mise_a_disposition', 'responsable')
        }),
        ('Montant', {
            'fields': ('montant_total_estime_mru',)
        }),
        ('Période contractuelle', {
            'fields': ('date_debut', 'date_fin')
        }),
        ('Conditions', {
            'fields': ('conditions_particulieres',)
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['numero', 'montant_total_estime_mru', 'date_fin', 'created_at']
    
    def chantier_display(self, obj):
        """Affichage du chantier"""
        return obj.mise_a_disposition.demande_location.chantier
    chantier_display.short_description = 'Chantier'
    
    def jours_restants_display(self, obj):
        """Affichage des jours restants avec couleur"""
        jours = obj.jours_restants
        if jours <= 0:
            color = 'red'
            text = 'Expiré'
        elif jours <= 10:
            color = 'orange'
            text = f'{jours} jours'
        else:
            color = 'green'
            text = f'{jours} jours'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, text
        )
    jours_restants_display.short_description = 'Jours restants'
    
    def get_queryset(self, request):
        """Filtrer par rôle utilisateur"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser and not request.user.is_staff:
            if hasattr(request.user, 'is_acheteur') and request.user.is_acheteur:
                qs = qs.filter(responsable=request.user)
            else:
                qs = qs.filter(mise_a_disposition__demande_location__demandeur=request.user)
        return qs


class PointageJournalierInline(admin.TabularInline):
    """
    Interface inline pour les pointages journaliers
    """
    model = PointageJournalier
    extra = 0
    fields = [
        'date_pointage', 'jour_semaine', 'heures_travail', 
        'heures_panne', 'heures_arret', 'consommation_carburant', 
        'montant_journalier', 'observations'
    ]
    readonly_fields = ['jour_semaine', 'montant_journalier']
    ordering = ['date_pointage']


@admin.register(FichePointageMateriel)
class FichePointageMaterielAdmin(admin.ModelAdmin):
    """
    Administration des fiches de pointage matériel
    """
    list_display = [
        'numero_fiche', 'engagement_display', 'materiel', 
        'periode_debut', 'periode_fin', 'montant_total_calcule'
    ]
    list_filter = ['periode_debut', 'engagement']
    search_fields = [
        'numero_fiche', 'engagement__numero',
        'engagement__mise_a_disposition__demande_location__chantier'
    ]
    ordering = ['-periode_debut']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('engagement', 'materiel', 'numero_fiche')
        }),
        ('Période de pointage', {
            'fields': ('periode_debut', 'periode_fin')
        }),
        ('Montant', {
            'fields': ('montant_total_calcule',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['montant_total_calcule', 'created_at', 'updated_at']
    inlines = [PointageJournalierInline]
    
    def engagement_display(self, obj):
        """Affichage de l'engagement"""
        return obj.engagement.numero
    engagement_display.short_description = 'Engagement'

    
    
    def get_queryset(self, request):
        """Filtrer par rôle utilisateur"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser and not request.user.is_staff:
            if hasattr(request.user, 'is_acheteur') and request.user.is_acheteur:
                qs = qs.filter(engagement__responsable=request.user)
            else:
                qs = qs.filter(engagement__mise_a_disposition__demande_location__demandeur=request.user)
        return qs


@admin.register(PointageJournalier)
class PointageJournalierAdmin(admin.ModelAdmin):
    """
    Administration des pointages journaliers
    """
    list_display = [
        'date_pointage', 'fiche_pointage_display', 'materiel_display',
        'heures_travail', 'heures_panne', 'heures_arret', 
        'consommation_carburant', 'montant_journalier'
    ]
    list_filter = [
        'date_pointage', 'jour_semaine', 
        
    ]
    search_fields = [
        'fiche_pointage__numero_fiche', 
        
        'observations'
    ]
    ordering = ['-date_pointage']
    
    fieldsets = (
        ('Pointage', {
            'fields': ('fiche_pointage', 'date_pointage', 'jour_semaine')
        }),
        ('Compteurs', {
            'fields': ('compteur_debut', 'compteur_fin')
        }),
        ('Heures détaillées', {
            'fields': ('heures_travail', 'heures_panne', 'heures_arret')
        }),
        ('Carburant et montant', {
            'fields': ('consommation_carburant', 'montant_journalier')
        }),
        ('Observations', {
            'fields': ('observations',)
        }),
    )
    
    readonly_fields = ['jour_semaine', 'montant_journalier']
    
    def fiche_pointage_display(self, obj):
        """Affichage de la fiche de pointage"""
        return obj.fiche_pointage.numero_fiche
    fiche_pointage_display.short_description = 'Fiche'
    
    def materiel_display(self, obj):
        """Affichage du matériel"""
        return obj.fiche_pointage.materiel.materiel.type_materiel
    materiel_display.short_description = 'Matériel'


@admin.register(FicheVerificationPointage)
class FicheVerificationPointageAdmin(admin.ModelAdmin):
    """
    Administration des fiches de vérification
    """
    list_display = [
        'fiche_pointage', 'chantier_verification', 'date_verification',
        'verificateur', 'total_heures_facturees', 'conforme'
    ]
    list_filter = ['conforme', 'date_verification']
    search_fields = [
        'chantier_verification', 'verificateur',
        'fiche_pointage__numero_fiche', 'mois_annee'
    ]
    ordering = ['-date_verification']
    
    fieldsets = (
        ('Fiche et vérificateur', {
            'fields': ('fiche_pointage', 'verificateur', 'date_verification')
        }),
        ('Détails de vérification', {
            'fields': ('chantier_verification', 'mois_annee')
        }),
        ('Totaux', {
            'fields': ('total_heures_facturees', 'total_consommation_carburant')
        }),
        ('Conformité', {
            'fields': ('conforme', 'observations_verification')
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Filtrer par rôle utilisateur"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser and not request.user.is_staff:
            # Les utilisateurs voient les vérifications liées à leurs engagements
            qs = qs.filter(
                fiche_pointage__engagement__mise_a_disposition__demande_location__demandeur=request.user
            )
        return qs
