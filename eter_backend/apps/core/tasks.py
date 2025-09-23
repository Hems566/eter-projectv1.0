"""
Tâches Celery pour l'automatisation des pointages
"""
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import date, timedelta
import logging

from .models import Engagement, PointageMontant, ConfigurationPointage
from .pointage_utils import PointageGenerator, PointageArchiver

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generer_pointages_automatiques_task(self, engagement_id):
    """
    Tâche pour générer automatiquement les pointages d'un engagement
    """
    try:
        engagement = Engagement.objects.get(id=engagement_id)
        logger.info(f"Début génération pointages pour engagement {engagement.numero}")
        
        resultats = PointageGenerator.generer_pointages_engagement(engagement)
        
        logger.info(f"Génération terminée pour {engagement.numero}: {resultats}")
        
        return {
            'engagement_numero': engagement.numero,
            'success': True,
            'resultats': resultats
        }
        
    except Engagement.DoesNotExist:
        error_msg = f"Engagement {engagement_id} non trouvé"
        logger.error(error_msg)
        return {
            'engagement_id': engagement_id,
            'success': False,
            'error': error_msg
        }
    
    except Exception as exc:
        error_msg = f"Erreur génération pointages engagement {engagement_id}: {str(exc)}"
        logger.error(error_msg)
        
        # Retry avec délai exponentiel
        if self.request.retries < self.max_retries:
            logger.info(f"Retry {self.request.retries + 1}/{self.max_retries} dans 60s")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        return {
            'engagement_id': engagement_id,
            'success': False,
            'error': error_msg
        }


@shared_task(bind=True)
def archiver_engagements_expires_task(self):
    """
    Tâche périodique pour archiver les engagements expirés depuis 15+ jours
    À lancer quotidiennement via Celery Beat
    """
    try:
        logger.info("Début archivage engagements expirés")
        
        engagements_a_archiver = PointageArchiver.obtenir_engagements_a_archiver()
        
        if not engagements_a_archiver:
            logger.info("Aucun engagement à archiver")
            return {
                'success': True,
                'engagements_archives': 0,
                'message': 'Aucun engagement à archiver'
            }
        
        total_archives = 0
        total_pointages_archives = 0
        resultats_detail = []
        
        for engagement in engagements_a_archiver:
            try:
                resultats = PointageArchiver.archiver_engagement_expire(engagement)
                
                if 'erreur' in resultats:
                    logger.warning(f"Engagement {engagement.numero} non archivé: {resultats['erreur']}")
                    continue
                
                total_archives += 1
                total_pointages_archives += resultats.get('pointages_archives', 0)
                
                resultats_detail.append({
                    'engagement': engagement.numero,
                    'archives_creees': resultats.get('archives_creees', 0),
                    'pointages_archives': resultats.get('pointages_archives', 0)
                })
                
                logger.info(f"Engagement {engagement.numero} archivé: {resultats}")
                
            except Exception as e:
                logger.error(f"Erreur archivage engagement {engagement.numero}: {e}")
                continue
        
        summary = {
            'success': True,
            'engagements_archives': total_archives,
            'total_pointages_archives': total_pointages_archives,
            'detail': resultats_detail
        }
        
        logger.info(f"Archivage terminé: {summary}")
        return summary
        
    except Exception as exc:
        error_msg = f"Erreur lors de l'archivage: {str(exc)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }


@shared_task
def mettre_a_jour_chantier_materiel_task(materiel_item_id, nouveau_chantier, date_changement_str=None):
    """
    Tâche pour mettre à jour le chantier d'un matériel pour tous ses pointages futurs
    """
    try:
        from .models import MaterielItem
        from datetime import datetime
        
        materiel_item = MaterielItem.objects.get(id=materiel_item_id)
        
        if date_changement_str:
            date_changement = datetime.strptime(date_changement_str, '%Y-%m-%d').date()
        else:
            date_changement = date.today()
        
        resultats = PointageGenerator.mettre_a_jour_chantier_materiel(
            materiel_item, nouveau_chantier, date_changement
        )
        
        logger.info(f"Chantier mis à jour pour {materiel_item.designation}: {resultats}")
        
        return {
            'success': True,
            'materiel': materiel_item.designation,
            'resultats': resultats
        }
        
    except Exception as exc:
        error_msg = f"Erreur mise à jour chantier matériel {materiel_item_id}: {str(exc)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }


@shared_task
def generer_configurations_defaut_task():
    """
    Tâche pour générer les configurations par défaut de tous les types de matériel
    """
    try:
        from .pointage_utils import generer_configuration_defaut
        
        count_created = generer_configuration_defaut()
        
        logger.info(f"{count_created} configurations par défaut créées")
        
        return {
            'success': True,
            'configurations_creees': count_created
        }
        
    except Exception as exc:
        error_msg = f"Erreur génération configurations par défaut: {str(exc)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }


@shared_task
def nettoyer_pointages_orphelins_task():
    """
    Tâche de maintenance pour nettoyer les pointages orphelins ou invalides
    """
    try:
        # Supprimer les pointages dont l'engagement n'existe plus
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM core_pointagemontant 
                WHERE engagement_id NOT IN (
                    SELECT id FROM core_engagement
                )
            """)
            pointages_orphelins = cursor.rowcount
        
        # Supprimer les pointages avec dates invalides (hors période engagement)
        pointages_invalides = 0
        for engagement in Engagement.objects.all():
            count = PointageMontant.objects.filter(
                engagement=engagement
            ).exclude(
                date_pointage__range=[engagement.date_debut, engagement.date_fin]
            ).delete()[0]
            pointages_invalides += count
        
        logger.info(f"Nettoyage: {pointages_orphelins} orphelins, {pointages_invalides} invalides")
        
        return {
            'success': True,
            'pointages_orphelins_supprimes': pointages_orphelins,
            'pointages_invalides_supprimes': pointages_invalides
        }
        
    except Exception as exc:
        error_msg = f"Erreur nettoyage pointages: {str(exc)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }


@shared_task
def rapport_pointages_quotidien_task():
    """
    Tâche pour générer un rapport quotidien des pointages automatiques
    """
    try:
        aujourd_hui = date.today()
        hier = aujourd_hui - timedelta(days=1)
        
        # Pointages créés hier
        pointages_hier = PointageMontant.objects.filter(
            created_at__date=hier,
            notes__icontains='automatiquement'
        ).count()
        
        # Engagements actifs
        engagements_actifs = Engagement.objects.filter(
            date_debut__lte=aujourd_hui,
            date_fin__gte=aujourd_hui
        ).count()
        
        # Engagements expirant dans 7 jours
        date_limite = aujourd_hui + timedelta(days=7)
        engagements_bientot_expires = Engagement.objects.filter(
            date_fin__lte=date_limite,
            date_fin__gte=aujourd_hui
        ).count()
        
        rapport = {
            'date': aujourd_hui.isoformat(),
            'pointages_auto_hier': pointages_hier,
            'engagements_actifs': engagements_actifs,
            'engagements_bientot_expires': engagements_bientot_expires
        }
        
        logger.info(f"Rapport quotidien: {rapport}")
        
        # TODO: Optionnel - Envoyer par email aux responsables
        
        return {
            'success': True,
            'rapport': rapport
        }
        
    except Exception as exc:
        error_msg = f"Erreur rapport quotidien: {str(exc)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }