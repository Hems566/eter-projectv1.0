"""
Utilitaires pour la génération automatique de pointages
"""
from datetime import date, timedelta
from decimal import Decimal
import random
from typing import List, Dict, Tuple
from django.db import transaction

from .models import (
    Engagement, PointageMontant, ConfigurationPointage, 
    MaterielItem, PointageArchive
)


class PointageGenerator:
    """
    Générateur automatique de pointages basé sur les engagements
    """
    
    @staticmethod
    def get_jours_ouvres(date_debut: date, date_fin: date) -> List[date]:
        """
        Génère la liste des jours ouvrés (lundi-vendredi) entre deux dates
        """
        jours = []
        current_date = date_debut
        
        while current_date <= date_fin:
            # 0=lundi, 6=dimanche
            if current_date.weekday() < 5:  # lundi à vendredi
                jours.append(current_date)
            current_date += timedelta(days=1)
        
        return jours
    
    @staticmethod
    def get_configuration_materiel(type_materiel: str) -> ConfigurationPointage:
        """
        Récupère ou crée une configuration par défaut pour un type de matériel
        """
        config, created = ConfigurationPointage.objects.get_or_create(
            type_materiel=type_materiel,
            defaults={
                'repartition_type': 'UNIFORME',
                'facteur_debut_contrat': Decimal('1.00'),
                'facteur_milieu_contrat': Decimal('1.00'),
                'facteur_fin_contrat': Decimal('1.00'),
                'variation_hebdomadaire': Decimal('0.10'),
                'actif': True,
            }
        )
        return config
    
    @classmethod
    def calculer_utilisation_quotidienne(
        cls, 
        engagement: Engagement, 
        materiel_item: MaterielItem,
        date_courante: date
    ) -> Decimal:
        """
        Calcule l'utilisation quotidienne d'un matériel selon sa configuration
        """
        config = cls.get_configuration_materiel(materiel_item.type_materiel)
        
        # Vérifier si le matériel est utilisé ce jour
        if not config.jour_utilise(date_courante):
            return Decimal('0.00')
        
        # Calculer la base d'utilisation quotidienne
        jours_ouvres_total = len(cls.get_jours_ouvres(
            engagement.date_debut, 
            engagement.date_fin
        ))
        
        if jours_ouvres_total == 0:
            return Decimal('0.00')
        
        # Estimation quotidienne de base
        base_quotidienne = engagement.estimation_quantite / jours_ouvres_total
        
        # Appliquer le facteur selon la progression
        facteur = config.get_facteur_pour_jour(
            date_courante, 
            engagement.date_debut, 
            engagement.date_fin
        )
        
        utilisation = base_quotidienne * facteur
        
        # Ajouter variation aléatoire hebdomadaire
        if config.variation_hebdomadaire > 0:
            variation_pct = float(config.variation_hebdomadaire)
            # Variation basée sur la semaine (pour cohérence)
            semaine_num = date_courante.isocalendar()[1]
            random.seed(semaine_num * 1000 + materiel_item.id)  # Seed déterministe
            
            variation = 1 + (random.random() - 0.5) * 2 * variation_pct
            utilisation = utilisation * Decimal(str(variation))
        
        # S'assurer que l'utilisation reste positive
        return max(Decimal('0.00'), utilisation)
    
    @classmethod
    @transaction.atomic
    def generer_pointages_engagement(cls, engagement: Engagement) -> Dict:
        """
        Génère tous les pointages automatiques pour un engagement
        """
        resultats = {
            'pointages_crees': 0,
            'pointages_existants': 0,
            'materiels_traites': 0,
            'erreurs': []
        }
        
        try:
            # Obtenir tous les matériels de la demande
            materiels = engagement.mise_a_disposition.demande_location.materiel_items.all()
            
            # Obtenir tous les jours ouvrés de l'engagement
            jours_ouvres = cls.get_jours_ouvres(
                engagement.date_debut,
                engagement.date_fin
            )
            
            for materiel_item in materiels:
                resultats['materiels_traites'] += 1
                
                for jour in jours_ouvres:
                    # Vérifier si le pointage existe déjà
                    pointage_existant = PointageMontant.objects.filter(
                        engagement=engagement,
                        materiel_item=materiel_item,
                        date_pointage=jour
                    ).first()
                    
                    if pointage_existant:
                        resultats['pointages_existants'] += 1
                        continue
                    
                    # Calculer l'utilisation pour ce jour
                    utilisation = cls.calculer_utilisation_quotidienne(
                        engagement, materiel_item, jour
                    )
                    
                    # Ne créer un pointage que si l'utilisation > 0
                    if utilisation > 0:
                        # Déterminer le chantier (initialement celui de la DL)
                        chantier_reel = engagement.mise_a_disposition.demande_location.chantier
                        
                        # Créer le pointage automatique
                        PointageMontant.objects.create(
                            engagement=engagement,
                            materiel_item=materiel_item,
                            chantier_reel=chantier_reel,
                            utilisation_reelle=utilisation,
                            date_pointage=jour,
                            notes='Pointage généré automatiquement',
                            responsable_pointage=engagement.responsable
                        )
                        
                        resultats['pointages_crees'] += 1
        
        except Exception as e:
            resultats['erreurs'].append(f"Erreur lors de la génération: {str(e)}")
        
        return resultats
    
    @classmethod
    def mettre_a_jour_chantier_materiel(
        cls, 
        materiel_item: MaterielItem, 
        nouveau_chantier: str,
        date_changement: date = None
    ) -> Dict:
        """
        Met à jour le chantier d'un matériel pour tous les pointages futurs
        """
        if not date_changement:
            date_changement = date.today()
        
        # Trouver tous les pointages futurs automatiques de ce matériel
        pointages_futurs = PointageMontant.objects.filter(
            materiel_item=materiel_item,
            date_pointage__gte=date_changement,
            notes__icontains='généré automatiquement'
        )
        
        count_updated = pointages_futurs.update(
            chantier_reel=nouveau_chantier,
            notes='Pointage automatique - Chantier mis à jour'
        )
        
        return {
            'pointages_mis_a_jour': count_updated,
            'nouveau_chantier': nouveau_chantier,
            'date_changement': date_changement
        }


class PointageArchiver:
    """
    Gestionnaire d'archivage des pointages d'engagements expirés
    """
    
    @classmethod
    @transaction.atomic
    def archiver_engagement_expire(cls, engagement: Engagement) -> Dict:
        """
        Archive tous les pointages d'un engagement expiré depuis 15+ jours
        """
        if engagement.jours_restants > 0:
            return {
                'erreur': 'Engagement pas encore expiré',
                'jours_restants': engagement.jours_restants
            }
        
        # Vérifier si 15 jours sont écoulés depuis l'expiration
        jours_depuis_expiration = (date.today() - engagement.date_fin).days
        if jours_depuis_expiration < 15:
            return {
                'erreur': f'Seulement {jours_depuis_expiration} jours depuis expiration',
                'jours_requis': 15
            }
        
        # Obtenir tous les pointages de cet engagement
        pointages = PointageMontant.objects.filter(engagement=engagement)
        
        if not pointages.exists():
            return {'erreur': 'Aucun pointage à archiver'}
        
        resultats = {
            'archives_creees': 0,
            'pointages_archives': 0,
            'materiels_archives': []
        }
        
        # Grouper par matériel pour créer des archives consolidées
        materiels_data = {}
        
        for pointage in pointages:
            materiel_id = pointage.materiel_item.id
            
            if materiel_id not in materiels_data:
                materiels_data[materiel_id] = {
                    'materiel_item': pointage.materiel_item,
                    'pointages': [],
                    'chantiers': set(),
                    'utilisation_totale': Decimal('0.00'),
                    'montant_total': Decimal('0.00')
                }
            
            materiels_data[materiel_id]['pointages'].append(pointage)
            materiels_data[materiel_id]['chantiers'].add(pointage.chantier_reel)
            materiels_data[materiel_id]['utilisation_totale'] += pointage.utilisation_reelle
            materiels_data[materiel_id]['montant_total'] += pointage.montant_calcule_reel
        
        # Créer les archives par matériel
        for materiel_id, data in materiels_data.items():
            materiel_item = data['materiel_item']
            pointages_materiel = data['pointages']
            
            # Calculer les statistiques
            chantier_initial = engagement.mise_a_disposition.demande_location.chantier
            chantiers_utilises = list(data['chantiers'])
            divergences = sum(1 for p in pointages_materiel if p.chantier_divergent)
            
            utilisation_moyenne = (
                data['utilisation_totale'] / len(pointages_materiel)
                if pointages_materiel else Decimal('0.00')
            )
            
            # Créer l'archive
            archive = PointageArchive.objects.create(
                engagement_numero=engagement.numero,
                engagement_dates=f"{engagement.date_debut} - {engagement.date_fin}",
                materiel_designation=materiel_item.designation,
                materiel_type=materiel_item.type_materiel,
                chantier_initial=chantier_initial,
                chantier_reel=', '.join(chantiers_utilises),
                utilisation_reelle=data['utilisation_totale'],
                montant_calcule_total=data['montant_total'],
                nombre_pointages=len(pointages_materiel),
                date_debut_engagement=engagement.date_debut,
                date_fin_engagement=engagement.date_fin,
                divergences_chantier=divergences,
                utilisation_moyenne_jour=utilisation_moyenne,
                archived_by=engagement.responsable,
                pointages_detail={
                    'pointages': [
                        {
                            'date': p.date_pointage.isoformat(),
                            'utilisation': float(p.utilisation_reelle),
                            'montant': float(p.montant_calcule_reel),
                            'chantier': p.chantier_reel
                        }
                        for p in pointages_materiel
                    ]
                }
            )
            
            resultats['archives_creees'] += 1
            resultats['materiels_archives'].append({
                'materiel': materiel_item.designation,
                'archive_id': archive.id,
                'pointages_count': len(pointages_materiel)
            })
        
        # Supprimer les pointages originaux
        count_deleted = pointages.delete()[0]
        resultats['pointages_archives'] = count_deleted
        
        return resultats
    
    @classmethod
    def obtenir_engagements_a_archiver(cls) -> List[Engagement]:
        """
        Trouve tous les engagements expirés depuis 15+ jours
        """
        date_limite = date.today() - timedelta(days=15)
        
        return Engagement.objects.filter(
            date_fin__lt=date_limite
        ).exclude(
            # Exclure ceux qui ont déjà été archivés
            pointages__isnull=True
        ).distinct()


def generer_configuration_defaut():
    """
    Génère les configurations par défaut pour tous les types de matériel
    """
    configurations = [
        {
            'type_materiel': 'VEHICULE_LEGER',
            'repartition_type': 'UNIFORME',
            'facteur_debut_contrat': Decimal('0.8'),
            'facteur_milieu_contrat': Decimal('1.0'),
            'facteur_fin_contrat': Decimal('0.9'),
            'variation_hebdomadaire': Decimal('0.15'),
        },
        {
            'type_materiel': 'VEHICULE_UTILITAIRE',
            'repartition_type': 'PROGRESSIVE',
            'facteur_debut_contrat': Decimal('0.7'),
            'facteur_milieu_contrat': Decimal('1.2'),
            'facteur_fin_contrat': Decimal('1.1'),
            'variation_hebdomadaire': Decimal('0.20'),
        },
        {
            'type_materiel': 'POIDS_LOURD',
            'repartition_type': 'PICS_SEMAINES',
            'facteur_debut_contrat': Decimal('0.5'),
            'facteur_milieu_contrat': Decimal('1.3'),
            'facteur_fin_contrat': Decimal('0.8'),
            'variation_hebdomadaire': Decimal('0.10'),
            'utilise_lundi': False,  # Livraisons pas le lundi
        },
        {
            'type_materiel': 'ENGIN_TP',
            'repartition_type': 'PROGRESSIVE',
            'facteur_debut_contrat': Decimal('0.6'),
            'facteur_milieu_contrat': Decimal('1.5'),
            'facteur_fin_contrat': Decimal('1.2'),
            'variation_hebdomadaire': Decimal('0.25'),
        },
        {
            'type_materiel': 'EQUIPEMENT_CONSTRUCTION',
            'repartition_type': 'UNIFORME',
            'facteur_debut_contrat': Decimal('0.9'),
            'facteur_milieu_contrat': Decimal('1.1'),
            'facteur_fin_contrat': Decimal('1.0'),
            'variation_hebdomadaire': Decimal('0.05'),
        },
        {
            'type_materiel': 'OUTILLAGE',
            'repartition_type': 'DEGRESSIVE',
            'facteur_debut_contrat': Decimal('1.4'),
            'facteur_milieu_contrat': Decimal('1.0'),
            'facteur_fin_contrat': Decimal('0.6'),
            'variation_hebdomadaire': Decimal('0.30'),
        },
        {
            'type_materiel': 'AUTRE',
            'repartition_type': 'UNIFORME',
            'facteur_debut_contrat': Decimal('1.0'),
            'facteur_milieu_contrat': Decimal('1.0'),
            'facteur_fin_contrat': Decimal('1.0'),
            'variation_hebdomadaire': Decimal('0.10'),
        }
    ]
    
    created_count = 0
    for config_data in configurations:
        config, created = ConfigurationPointage.objects.get_or_create(
            type_materiel=config_data['type_materiel'],
            defaults=config_data
        )
        if created:
            created_count += 1
    
    return created_count