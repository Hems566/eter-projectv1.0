from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Modèle utilisateur personnalisé avec rôles et départements pour ETER
    """
    
    # Choix des rôles
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('DEMANDEUR', 'Demandeur'),
        ('ACHETEUR', 'Acheteur'),
    ]
    
    # Choix des départements (pour les DEMANDEURS)
    DEPARTEMENT_CHOICES = [
        ('DTX', 'Direction Technique'),
        ('DEM', 'Direction Équipements et Matériels'),
        ('DAL', 'Direction Achats et Logistique'),
        ('DAF', 'Direction Administrative et Financière'),
    ]
    
    # Champs personnalisés
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='DEMANDEUR',
        verbose_name='Rôle'
    )
    
    departement = models.CharField(
        max_length=10,
        choices=DEPARTEMENT_CHOICES,
        blank=True,
        null=True,
        verbose_name='Département',
        help_text='Requis pour les demandeurs uniquement'
    )
    
    telephone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Téléphone'
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
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
    
    def save(self, *args, **kwargs):
        # Validation : DEMANDEUR doit avoir un département
        if self.role == 'DEMANDEUR' and not self.departement:
            raise ValueError('Un demandeur doit avoir un département')
        
        # Les ACHETEURS sont toujours du département DAL
        if self.role == 'ACHETEUR':
            self.departement = 'DAL'
        
        # Les ADMIN n'ont pas de département
        if self.role == 'ADMIN':
            self.departement = None
            
        super().save(*args, **kwargs)
    
    @property
    def is_admin(self):
        return self.role == 'ADMIN'
    
    @property
    def is_demandeur(self):
        return self.role == 'DEMANDEUR'
    
    @property
    def is_acheteur(self):
        return self.role == 'ACHETEUR'
    
    def can_create_dl(self):
        """Peut créer une demande de location"""
        return self.role in ['ADMIN', 'DEMANDEUR', 'ACHETEUR']
    
    def can_validate_dl(self):
        """Peut valider une demande de location"""
        return self.role in ['ADMIN', 'ACHETEUR']
    
    def can_create_engagement(self):
        """Peut créer un engagement"""
        return self.role in ['ADMIN', 'ACHETEUR']