from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum, Q
from decimal import Decimal

# Importer les modèles à la fin pour éviter les importations circulaires si nécessaire
from .models import FichePointageMateriel, PointageJournalier, Engagement

@receiver([post_save, post_delete], sender=FichePointageMateriel)
def update_engagement_on_fiche_change(sender, instance, **kwargs):
    """Met à jour le montant de l'engagement lorsque les fiches sont modifiées."""
    if instance.engagement:
        total = instance.engagement.fiches_pointage.aggregate(
            total_montant=Sum('montant_total_calcule')
        )['total_montant'] or Decimal('0.000')
        
        Engagement.objects.filter(pk=instance.engagement.pk).update(montant_actuel_mru=total)

@receiver([post_save, post_delete], sender=PointageJournalier)
def update_fiche_on_pointage_change(sender, instance, **kwargs):
    """Met à jour le montant de la fiche de pointage lorsque les pointages sont modifiés."""
    if instance.fiche_pointage:
        instance.fiche_pointage.calculer_montant_total()
