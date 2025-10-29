from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
import logging
logger = logging.getLogger(__name__)
from .models import (
    Engagement, FichePointageMateriel, FicheVerificationPointage, Fournisseur, DemandeLocation, MaterielDemande, MaterielLocation, MiseADisposition, PointageJournalier,
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'role', 'departement']
        read_only_fields = fields


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = [
            'id', 'nif', 'raison_sociale', 'telephone', 'email', 
            'adresse', 'actif', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class MaterielLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterielLocation
        fields = '__all__'

class MaterielDemandeSerializer(serializers.ModelSerializer):
    materiel_type = serializers.CharField(source='materiel.type_materiel', read_only=True)
    prix_unitaire_mru = serializers.DecimalField(source='materiel.prix_unitaire_mru', max_digits=10, decimal_places=3, read_only=True)
    
    class Meta:
        model = MaterielDemande
        fields = [
            'id', 'materiel', 'materiel_type', 'quantite', 
            'prix_unitaire_mru', 'sous_total', 'observations'
        ]
        read_only_fields = ['sous_total']

class DemandeLocationListSerializer(serializers.ModelSerializer):
    demandeur = UserBasicSerializer(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    materiels_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DemandeLocation
        fields = [
            'id', 'numero', 'date_demande', 'demandeur', 'departement',
            'chantier', 'duree_mois', 'budget_previsionnel_mru', 'statut', 
            'statut_display', 'materiels_count', 'created_at'
        ]
    
    def get_materiels_count(self, obj):
        return obj.materieldemande_set.count()

class DemandeLocationDetailSerializer(serializers.ModelSerializer):
    demandeur = UserBasicSerializer(read_only=True)
    validateur = UserBasicSerializer(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    materiels_demandes = MaterielDemandeSerializer(source='materieldemande_set', many=True, read_only=True)
    
    class Meta:
        model = DemandeLocation
        fields = '__all__'

class DemandeLocationCreateSerializer(serializers.ModelSerializer):
    materiels_demandes = MaterielDemandeSerializer(many=True, write_only=True)
    
    class Meta:
        model = DemandeLocation
        fields = ['chantier', 'duree_mois', 'observations', 'materiels_demandes']

    def create(self, validated_data):
        materiels_data = validated_data.pop('materiels_demandes')
        demande = DemandeLocation.objects.create(**validated_data)
        for materiel_data in materiels_data:
            MaterielDemande.objects.create(demande_location=demande, **materiel_data)
        return demande

class MiseADispositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiseADisposition
        fields = '__all__'

class EngagementListSerializer(serializers.ModelSerializer):
    chantier = serializers.CharField(source='mise_a_disposition.demande_location.chantier', read_only=True)
    fournisseur_nom = serializers.CharField(source='mise_a_disposition.fournisseur.raison_sociale', read_only=True)
    jours_restants = serializers.IntegerField(read_only=True)

    class Meta:
        model = Engagement
        fields = ['id', 'numero', 'chantier', 'fournisseur_nom', 'date_debut', 'date_fin', 'budget_previsionnel_mru', 'montant_actuel_mru', 'jours_restants']

class EngagementDetailSerializer(serializers.ModelSerializer):
    mise_a_disposition = MiseADispositionSerializer(read_only=True)
    responsable = UserBasicSerializer(read_only=True)
    jours_restants = serializers.IntegerField(read_only=True)
    fiches_pointage_count = serializers.IntegerField(source='fiches_pointage.count', read_only=True)
    materiels_demandes = MaterielDemandeSerializer(source='mise_a_disposition.demande_location.materieldemande_set', many=True, read_only=True)

    class Meta:
        model = Engagement
        fields = ['id', 'numero', 'mise_a_disposition', 'responsable', 'date_debut', 'date_fin', 'conditions_particulieres', 'budget_previsionnel_mru', 'montant_actuel_mru', 'jours_restants', 'fiches_pointage_count', 'materiels_demandes']

class PointageJournalierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointageJournalier
        fields = '__all__'

class FichePointageMaterielSerializer(serializers.ModelSerializer):
    pointages_journaliers = PointageJournalierSerializer(many=True, read_only=True)
    engagement_numero = serializers.CharField(source='engagement.numero', read_only=True)
    materiel_type = serializers.CharField(source='materiel.materiel.type_materiel', read_only=True)

    class Meta:
        model = FichePointageMateriel
        fields = ['id', 'engagement', 'engagement_numero', 'materiel', 'materiel_type', 'numero_fiche', 'periode_debut', 'periode_fin', 'montant_total_calcule', 'pointages_journaliers']