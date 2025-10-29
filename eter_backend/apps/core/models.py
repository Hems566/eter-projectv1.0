from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.conf import settings
from decimal import Decimal
from datetime import date, timedelta
import uuid
from django.core.exceptions import ValidationError


class Fournisseur(models.Model):
    """
    Modèle pour les fournisseurs de matériel
    """
    nif_validator = RegexValidator(
        regex=r'^\d{8}$',
        message='Le NIF doit contenir exactement 8 chiffres'
    )
    
    nif = models.CharField(
        max_length=8,
        unique=True,
        validators=[nif_validator],
        verbose_name='NIF',
        help_text='Numéro d\'Identification Fiscale (8 chiffres)'
    )
    
    raison_sociale = models.CharField(
        max_length=255,
        verbose_name='Raison sociale'
    )
    
    telephone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Téléphone'
    )
    
    adresse = models.TextField(
        blank=True,
        verbose_name='Adresse'
    )
    
    email = models.EmailField(
        blank=True,
        verbose_name='Email'
    )
    
    actif = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière modification'
    )
    
    class Meta:
        verbose_name = 'Fournisseur'
        verbose_name_plural = 'Fournisseurs'
        ordering = ['raison_sociale']
    
    def __str__(self):
        return f"{self.raison_sociale} (NIF: {self.nif})"


class MaterielLocation(models.Model):
    """
    Catalogue des matériels disponibles à la location
    """
    TYPE_MATERIEL_CHOICES = [
        ('NIVELEUSE', 'Niveleuse'),
        ('BULLDOZER', 'Bulldozer'),
        ('EXCAVATRICE', 'Excavatrice'),
        ('COMPACTEUR', 'Compacteur'),
        ('CAMION', 'Camion'),
        ('VEHICULE_LEGER', 'Véhicule léger'),
        ('GROUPE_ELECTROGENE', 'Groupe électrogène'),
        ('AUTRE', 'Autre équipement'),
    ]

    TYPE_FACTURATION_CHOICES = [
        ('PAR_JOUR', 'Prix Unitaire × Nombre Jours'),
        ('PAR_HEURE', 'Prix Unitaire × Total des Heures'),
        ('FORFAITAIRE', 'Prix Forfaitaire'),
    ]
    
    type_materiel = models.CharField(
        max_length=30,
        choices=TYPE_MATERIEL_CHOICES,
        verbose_name='Type de matériel'
    )

    type_facturation = models.CharField(
        max_length=15,
        choices=TYPE_FACTURATION_CHOICES,
        default='PAR_JOUR',
        verbose_name='Type de facturation'
    )
      
    prix_unitaire_mru = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        verbose_name='Prix Unitaire TTC'
    )

    observations = models.TextField(
        blank=True,
        verbose_name='Observations'
    )

    actif = models.BooleanField(
        default=True,
        verbose_name='Disponible à la location'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    class Meta:
        verbose_name = 'Matériel de Location'
        verbose_name_plural = 'Matériels de Location'
        ordering = ['type_materiel']
    
    def __str__(self):
        return f"{self.type_materiel} - {self.prix_unitaire_mru} MRU/{self.get_type_facturation_display().lower()}"


class DemandeLocation(models.Model):
    """
    Modèle pour les demandes de location (DL)
    """
    STATUT_CHOICES = [
        ('BROUILLON', 'Brouillon'),
        ('SOUMISE', 'Soumise'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
        ('MISE_A_DISPOSITION', 'Mise à disposition'),
        ('ENGAGEMENT_CREE', 'Engagement créé'),
    ]
    
    numero = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name='Numéro DL'
    )
    
    date_demande = models.DateField(
        default=date.today,
        verbose_name='Date de demande'
    )
    
    demandeur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='demandes_location',
        verbose_name='Demandeur'
    )
    
    departement = models.CharField(
        max_length=10,
        verbose_name='Département demandeur'
    )
    
    chantier = models.CharField(
        max_length=255,
        verbose_name='Chantier/Projet'
    )
    
    materiels = models.ManyToManyField(
        MaterielLocation,
        through='MaterielDemande',
        related_name='demandes',
        verbose_name='Matériels demandés'
    )
    
    duree_mois = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(6)],
        verbose_name='Durée en mois',
        help_text='Entre 1 et 6 mois'
    )
    
    budget_previsionnel_mru = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        editable=False,
        default=Decimal('0.000'),
        verbose_name='Budget prévisionnel (MRU)'
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='SOUMISE',
        verbose_name='Statut'
    )
    
    observations = models.TextField(
        blank=True,
        verbose_name='Observations'
    )
    
    date_validation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de validation'
    )
    
    validateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_validees',
        verbose_name='Validateur'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière modification'
    )
    
    class Meta:
        verbose_name = 'Demande de Location'
        verbose_name_plural = 'Demandes de Location'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.numero:
            year = date.today().year
            count = DemandeLocation.objects.filter(numero__startswith=f'DL-{year}-').count() + 1
            self.numero = f'DL-{year}-{count:04d}'
        
        if self.demandeur and hasattr(self.demandeur, 'departement'):
            self.departement = self.demandeur.departement
        
        super().save(*args, **kwargs)
        
        self.calculer_budget()
    
    def calculer_budget(self):
        total = Decimal('0.000')
        for materiel_demande in self.materieldemande_set.all():
            total += materiel_demande.sous_total
        
        if self.budget_previsionnel_mru != total:
            DemandeLocation.objects.filter(pk=self.pk).update(budget_previsionnel_mru=total)
            self.budget_previsionnel_mru = total
    
    def __str__(self):
        return f"{self.numero} - {self.chantier} ({self.get_statut_display()})"


class MaterielDemande(models.Model):
    demande_location = models.ForeignKey(
        DemandeLocation,
        on_delete=models.CASCADE,
        verbose_name='Demande de location'
    )
    
    materiel = models.ForeignKey(
        MaterielLocation,
        on_delete=models.CASCADE,
        verbose_name='Matériel'
    )
    
    quantite = models.IntegerField(
        validators=[MinValueValidator(1)],
        default=1,
        verbose_name='Quantité demandée'
    )
    
    sous_total = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        editable=False,
        default=Decimal('0.000'),
        verbose_name='Montant Previsionnel TTC'
    )
    
    observations = models.TextField(
        blank=True,
        verbose_name='Observations spécifiques'
    )
    
    class Meta:
        verbose_name = 'Matériel Demandé'
        verbose_name_plural = 'Matériels Demandés'
        unique_together = ['demande_location', 'materiel']
    
    def save(self, *args, **kwargs):
        if self.demande_location and self.demande_location.duree_mois:
            jours_total = self.demande_location.duree_mois * 30
            self.sous_total = self.materiel.prix_unitaire_mru * self.quantite * jours_total
        
        super().save(*args, **kwargs)
        
        if self.demande_location:
            self.demande_location.calculer_budget()
    
    def __str__(self):
        return f"{self.materiel.type_materiel} (x{self.quantite}) - {self.sous_total} MRU"


class MiseADisposition(models.Model):
    demande_location = models.OneToOneField(
        DemandeLocation,
        on_delete=models.CASCADE,
        related_name='mise_a_disposition',
        verbose_name='Demande de location'
    )
    
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.CASCADE,
        related_name='mises_a_disposition',
        verbose_name='Fournisseur'
    )
    
    date_mise_disposition = models.DateField(
        default=date.today,
        verbose_name='Date de mise à disposition'
    )
    
    immatriculation = models.CharField(
        max_length=50,
        verbose_name='Immatriculation/Référence'
    )
    
    conforme = models.BooleanField(
        default=True,
        verbose_name='Conforme aux spécifications'
    )
    
    observations = models.TextField(
        blank=True,
        verbose_name='Observations'
    )
    
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mises_a_disposition_gerees',
        verbose_name='Responsable acheteur'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    class Meta:
        verbose_name = 'Mise à disposition'
        verbose_name_plural = 'Mises à disposition'
        ordering = ['-date_mise_disposition']
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        if self.demande_location.statut == 'VALIDEE':
            self.demande_location.statut = 'MISE_A_DISPOSITION'
            self.demande_location.save()
    
    def __str__(self):
        return f"Mise à disposition - {self.demande_location.numero} - {self.fournisseur.raison_sociale}"


class Engagement(models.Model):
    """
    Engagement contractuel (CTL)
    """
    mise_a_disposition = models.OneToOneField(
        MiseADisposition,
        on_delete=models.CASCADE,
        related_name='engagement',
        verbose_name='Mise à disposition'
    )
    
    numero = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name='Numéro CTL'
    )
    
    date_debut = models.DateField(
        verbose_name='Date de début'
    )
    
    date_fin = models.DateField(
        editable=False,
        verbose_name='Date de fin'
    )
    
    budget_previsionnel_mru = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        editable=False,
        default=Decimal('0.000'),
        verbose_name='Budget Prévisionnel (MRU)'
    )

    montant_actuel_mru = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        default=Decimal('0.000'),
        verbose_name='Montant Actuel (MRU)'
    )
    
    conditions_particulieres = models.TextField(
        blank=True,
        verbose_name='Conditions particulières'
    )
    
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagements_geres',
        verbose_name='Responsable engagement'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    class Meta:
        verbose_name = 'Engagement (CTL)'
        verbose_name_plural = 'Engagements (CTL)'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.numero:
            year = date.today().year
            count = Engagement.objects.filter(numero__startswith=f'CTL-{year}-').count() + 1
            self.numero = f'CTL-{year}-{count:04d}'
        
        if self.date_debut:
            duree_mois = self.mise_a_disposition.demande_location.duree_mois
            self.date_fin = self.date_debut + timedelta(days=duree_mois * 30)

        if not self.pk: # If new instance
            self.budget_previsionnel_mru = self.mise_a_disposition.demande_location.budget_previsionnel_mru
        
        super().save(*args, **kwargs)
        
        dl = self.mise_a_disposition.demande_location
        if dl.statut == 'MISE_A_DISPOSITION':
            dl.statut = 'ENGAGEMENT_CREE'
            dl.save()

    @property
    def jours_restants(self):
        if self.date_fin:
            delta = self.date_fin - date.today()
            return max(0, delta.days)
        return 0
    
    @property
    def proche_expiration(self):
        return self.jours_restants <= 10
    
    def __str__(self):
        return f"{self.numero} - {self.mise_a_disposition.demande_location.chantier}"


class FichePointageMateriel(models.Model):
    engagement = models.ForeignKey(
        Engagement,
        on_delete=models.CASCADE,
        related_name='fiches_pointage',
        verbose_name='Engagement'
    )
    
    materiel = models.ForeignKey(
        MaterielDemande,
        on_delete=models.CASCADE,
        related_name='fiches_pointage',
        verbose_name='Matériel pointé'
    )
    
    numero_fiche = models.CharField(
        max_length=50,
        verbose_name='Numéro de fiche'
    )
    
    periode_debut = models.DateField(
        verbose_name='Début de période'
    )
    
    periode_fin = models.DateField(
        verbose_name='Fin de période'
    )
    
    montant_total_calcule = models.DecimalField(
        max_digits=15,
        decimal_places=3,
        editable=False,
        default=Decimal('0.000'),
        verbose_name='Montant total calculé (MRU)'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière modification'
    )
    
    class Meta:
        verbose_name = 'Fiche de Pointage Matériel'
        verbose_name_plural = 'Fiches de Pointage Matériel'
        ordering = ['-periode_debut']
        unique_together = ['engagement', 'materiel', 'periode_debut']
    
    def get_chantiers_utilises(self):
        chantiers = {self.engagement.mise_a_disposition.demande_location.chantier}
        chantiers.update(self.pointages_journaliers.exclude(chantier_pointage__isnull=True).exclude(chantier_pointage__exact='').values_list('chantier_pointage', flat=True))
        return sorted(list(chantiers))
    
    def get_repartition_par_chantier(self):
        # ... (implementation details)
        return {}

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.calculer_montant_total()

    def calculer_montant_total(self):
        total = self.pointages_journaliers.aggregate(Sum('montant_journalier'))['montant_journalier__sum'] or Decimal('0.000')
        if self.montant_total_calcule != total:
            FichePointageMateriel.objects.filter(pk=self.pk).update(montant_total_calcule=total)

    def __str__(self):
        return f"Fiche {self.numero_fiche} - {self.materiel.materiel.type_materiel} ({self.periode_debut} - {self.periode_fin})"


class PointageJournalier(models.Model):
    fiche_pointage = models.ForeignKey(
        FichePointageMateriel,
        on_delete=models.CASCADE,
        related_name='pointages_journaliers',
        verbose_name='Fiche de pointage'
    )
    
    date_pointage = models.DateField(
        verbose_name='Date'
    )
    
    # ... (other fields)

    def save(self, *args, **kwargs):
        # ... (calculation logic)
        super().save(*args, **kwargs)
        if self.fiche_pointage:
            self.fiche_pointage.calculer_montant_total()

    # ... (other methods)