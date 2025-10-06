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
    """Serializer de base pour les utilisateurs (pour les relations)"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'role', 'departement']
        read_only_fields = fields


class FournisseurSerializer(serializers.ModelSerializer):
    """Serializer pour les fournisseurs"""
    
    class Meta:
        model = Fournisseur
        fields = [
            'id', 'nif', 'raison_sociale', 'telephone', 'email', 
            'adresse', 'actif', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_nif(self, value):
        """Validation personnalisée du NIF"""
        if not value.isdigit() or len(value) != 8:
            raise serializers.ValidationError("Le NIF doit contenir exactement 8 chiffres.")
        return value



class MaterielLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterielLocation
        fields = [
            'id', 'type_materiel', 'type_facturation', 'prix_unitaire_mru', 'observations', 
            'actif', 'created_at',
        ]
        read_only_fields = ['created_at']

class MaterielDemandeSerializer(serializers.ModelSerializer):
    """Serializer pour les matériels demandés"""
    materiel_type = serializers.CharField(source='materiel.type_materiel', read_only=True)
    prix_unitaire_mru = serializers.DecimalField(source='materiel.prix_unitaire_mru', max_digits=10, decimal_places=3, read_only=True)
    
    class Meta:
        model = MaterielDemande
        fields = [
            'id', 'materiel', 'materiel_type', 'quantite', 
            'prix_unitaire_mru', 'sous_total', 'observations'
        ]
        read_only_fields = ['sous_total']
    
    def validate_quantite(self, value):
        """Validation de la quantité"""
        if value < 1:
            raise serializers.ValidationError("La quantité doit être au moins 1.")
        return value


class MaterielDemandeCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un matériel demandé"""
    
    class Meta:
        model = MaterielDemande
        fields = ['materiel', 'quantite', 'observations']
    
    def validate_materiel(self, value):
        """Validation du matériel"""
        if not value.actif:
            raise serializers.ValidationError("Ce matériel n'est plus disponible à la location.")
        return value


class DemandeLocationListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des demandes de location"""
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
        read_only_fields = ['numero', 'budget_previsionnel_mru', 'departement', 'created_at']
    
    def get_materiels_count(self, obj):
        """Compter le nombre de matériels demandés"""
        return obj.materieldemande_set.count()


class DemandeLocationDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les demandes de location"""
    demandeur = UserBasicSerializer(read_only=True)
    validateur = UserBasicSerializer(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    materiels_demandes = MaterielDemandeSerializer(source='materieldemande_set', many=True, read_only=True)
    
    class Meta:
        model = DemandeLocation
        fields = [
            'id', 'numero', 'date_demande', 'demandeur', 'departement',
            'chantier', 'duree_mois', 'budget_previsionnel_mru', 'statut', 
            'statut_display', 'observations', 'date_validation', 'validateur',
            'materiels_demandes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'numero', 'budget_previsionnel_mru', 'departement', 
            'demandeur', 'date_validation', 'validateur',
            'created_at', 'updated_at'
        ]
    
    def validate_duree_mois(self, value):
        """Validation de la durée"""
        if not (1 <= value <= 6):
            raise serializers.ValidationError("La durée doit être entre 1 et 6 mois.")
        return value


class DemandeLocationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une demande de location avec matériels"""
    materiels_demandes = MaterielDemandeCreateSerializer(many=True)
    
    class Meta:
        model = DemandeLocation
        fields = [
            'chantier', 'duree_mois', 'observations', 'materiels_demandes'
        ]
    
    def validate_materiels_demandes(self, value):
        """Validation des matériels demandés"""
        if not value:
            raise serializers.ValidationError("Au moins un matériel doit être demandé.")
        
        # Vérifier qu'il n'y a pas de doublons
        materiels_ids = [item['materiel'].id for item in value]
        if len(materiels_ids) != len(set(materiels_ids)):
            raise serializers.ValidationError("Un matériel ne peut être demandé qu'une seule fois par demande.")
        
        return value
    
    def create(self, validated_data):
        """Créer une DL avec ses matériels"""
        logger.info(f"Données reçues: {validated_data}")
        materiels_demandes_data = validated_data.pop('materiels_demandes')
        logger.info(f"Matériels demandés: {materiels_demandes_data}")
        
        # Définir le demandeur depuis le contexte (request.user)
        user = self.context['request'].user
        validated_data['demandeur'] = user
        
        # Vérifier le rôle et le département de l'utilisateur
        if not hasattr(user, 'can_create_dl') or not user.can_create_dl():
            raise serializers.ValidationError(
                f"Votre rôle ne permet pas de créer des demandes de location. "
                "Seuls les administrateurs et demandeurs peuvent créer des demandes."
            )
        
        # Pour les demandeurs, vérifier qu'ils ont un département
        # if hasattr(user, 'is_demandeur') and user.is_demandeur and not hasattr(user, 'departement'):
        #     raise serializers.ValidationError(
        #         "Votre compte demandeur doit avoir un département assigné pour créer une demande de location. "
        #         "Veuillez contacter l'administrateur pour assigner un département à votre compte."
        #     )
        
        # Définir le département
        if hasattr(user, 'departement') and user.departement:
            validated_data['departement'] = user.departement
        else:
            # Fallback pour les admins sans département
            validated_data['departement'] = 'DAL'  # Département par défaut
        
        # Créer la DL
        demande_location = DemandeLocation.objects.create(**validated_data)
        
        # Créer les matériels demandés
        for materiel_data in materiels_demandes_data:
            MaterielDemande.objects.create(
                demande_location=demande_location,
                **materiel_data
            )
        return demande_location
    def to_representation(self, instance):
        """Utiliser une représentation simple pour éviter l'erreur materiels_demandes"""
        return {
            'id': instance.id,
            'numero': instance.numero,
            'chantier': instance.chantier,
            'duree_mois': instance.duree_mois,
            'observations': instance.observations,
            'departement': instance.departement,
            'statut': instance.statut,
            'budget_previsionnel_mru': instance.budget_previsionnel_mru,
            'date_demande': instance.date_demande,
        }
        


class DemandeLocationUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour mettre à jour une demande de location"""
    materiels_demandes = MaterielDemandeCreateSerializer(many=True, required=False)
    
    class Meta:
        model = DemandeLocation
        fields = [
            'chantier', 'duree_mois', 'observations', 'materiels_demandes'
        ]
    
    def validate(self, attrs):
        """Validation globale"""
        # Vérifier que la DL peut être modifiée
        if self.instance and self.instance.statut not in ['BROUILLON', 'REJETEE']:
            raise serializers.ValidationError(
                f"Une demande au statut '{self.instance.get_statut_display()}' ne peut pas être modifiée."
            )
        return attrs
    
    def update(self, instance, validated_data):
        """Mettre à jour une DL avec ses matériels"""
        materiels_demandes_data = validated_data.pop('materiels_demandes', None)
        
        # Mettre à jour les champs de base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour les matériels si fournis
        if materiels_demandes_data is not None:
            # Supprimer les anciens matériels
            instance.materieldemande_set.all().delete()
            
            # Créer les nouveaux matériels
            for materiel_data in materiels_demandes_data:
                MaterielDemande.objects.create(
                    demande_location=instance,
                    **materiel_data
                )
        
        return instance


class DemandeLocationValidationSerializer(serializers.ModelSerializer):
    """Serializer pour la validation des demandes"""
    action = serializers.ChoiceField(choices=['valider', 'rejeter'], write_only=True)
    observations = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = DemandeLocation
        fields = ['action', 'observations']
    
    def validate(self, attrs):
        """Validation de l'action"""
        if self.instance.statut != 'SOUMISE':
            raise serializers.ValidationError(
                f"Seules les demandes soumises peuvent être validées/rejetées. "
                f"Statut actuel: {self.instance.get_statut_display()}"
            )
        return attrs
    
    def update(self, instance, validated_data):
        """Valider ou rejeter la demande"""
        from django.utils import timezone
        
        action = validated_data['action']
        user = self.context['request'].user
        
        # Vérifier les permissions
        if not hasattr(user, 'can_validate_dl') or not user.can_validate_dl():
            raise serializers.ValidationError("Vous n'avez pas les droits pour valider des demandes.")
        
        # Mettre à jour le statut
        if action == 'valider':
            instance.statut = 'VALIDEE'
        else:  # rejeter
            instance.statut = 'REJETEE'
        
        # Mettre à jour les informations de validation
        instance.validateur = user
        instance.date_validation = timezone.now()
        
        # Ajouter les observations si fournies
        if validated_data.get('observations'):
            if instance.observations:
                instance.observations += f"\n\nValidation ({timezone.now().strftime('%d/%m/%Y %H:%M')}): {validated_data['observations']}"
            else:
                instance.observations = f"Validation ({timezone.now().strftime('%d/%m/%Y %H:%M')}): {validated_data['observations']}"
        
        instance.save()
        return instance


class MiseADispositionSerializer(serializers.ModelSerializer):
    """Serializer pour les mises à disposition"""
    demande_location = DemandeLocationListSerializer(read_only=True)
    fournisseur = FournisseurSerializer(read_only=True)
    responsable = UserBasicSerializer(read_only=True)
    
    # Champs pour la création (IDs uniquement)
    demande_location_id = serializers.IntegerField(write_only=True)
    fournisseur_id = serializers.IntegerField(write_only=True)
    
    # Informations supplémentaires en lecture seule
    chantier = serializers.CharField(source='demande_location.chantier', read_only=True)
    numero_dl = serializers.CharField(source='demande_location.numero', read_only=True)
    duree_mois = serializers.IntegerField(source='demande_location.duree_mois', read_only=True)
    
    class Meta:
        model = MiseADisposition
        fields = [
            'id', 'demande_location', 'demande_location_id', 'fournisseur', 'fournisseur_id',
            'date_mise_disposition', 'immatriculation', 'conforme', 
            'observations', 'responsable', 'created_at',
            'chantier', 'numero_dl', 'duree_mois'  # Informations de la DL
        ]
        read_only_fields = ['responsable', 'created_at', 'chantier', 'numero_dl', 'duree_mois']
    
    def validate_demande_location_id(self, value):
        """Valider que la DL existe et est validée"""
        try:
            dl = DemandeLocation.objects.get(id=value)
            
            # Vérifier le statut de la DL
            if dl.statut != 'VALIDEE':
                raise serializers.ValidationError(
                    f"La demande doit être validée pour créer une mise à disposition. "
                    f"Statut actuel: {dl.get_statut_display()}"
                )
            
            # Vérifier qu'il n'y a pas déjà une mise à disposition
            if hasattr(dl, 'mise_a_disposition'):
                raise serializers.ValidationError(
                    f"Cette demande (N° {dl.numero}) a déjà une mise à disposition."
                )
            
            # Vérifier que la DL a des matériels
            if not dl.materieldemande_set.exists():
                raise serializers.ValidationError(
                    "La demande de location doit contenir au moins un matériel."
                )
            
            return value
            
        except DemandeLocation.DoesNotExist:
            raise serializers.ValidationError("Demande de location introuvable.")
    
    def validate_fournisseur_id(self, value):
        """Valider que le fournisseur existe et est actif"""
        try:
            fournisseur = Fournisseur.objects.get(id=value)
            if not fournisseur.actif:
                raise serializers.ValidationError(
                    f"Le fournisseur '{fournisseur.raison_sociale}' n'est plus actif."
                )
            return value
        except Fournisseur.DoesNotExist:
            raise serializers.ValidationError("Fournisseur introuvable.")
    
    def validate_immatriculation(self, value):
        """Valider l'immatriculation"""
        if not value or not value.strip():
            raise serializers.ValidationError("L'immatriculation est obligatoire.")
        
        # Vérifier l'unicité de l'immatriculation pour les mises à disposition actives
        # (optionnel selon vos besoins métier)
        if MiseADisposition.objects.filter(
            immatriculation__iexact=value.strip()
        ).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError(
                f"L'immatriculation '{value}' est déjà utilisée pour une autre mise à disposition."
            )
        
        return value.strip().upper()  # Normaliser en majuscules
    
    def validate_date_mise_disposition(self, value):
        """Valider la date de mise à disposition"""
        from datetime import date
        
        if value > date.today():
            raise serializers.ValidationError(
                "La date de mise à disposition ne peut pas être dans le futur."
            )
        
        return value
    
    def create(self, validated_data):
        """Créer une mise à disposition"""
        user = self.context['request'].user
        
        # Vérifier les permissions
        if not hasattr(user, 'is_acheteur') or not user.is_acheteur:
            if not user.is_superuser:
                raise serializers.ValidationError(
                    "Seuls les acheteurs peuvent créer des mises à disposition."
                )
        
        # Définir le responsable
        validated_data['responsable'] = user
        
        # Créer la mise à disposition
        mise_a_disposition = super().create(validated_data)
        
        return mise_a_disposition
    
    def update(self, instance, validated_data):
        """Mettre à jour une mise à disposition"""
        # Vérifier que la mise à disposition peut être modifiée
        if hasattr(instance, 'engagement'):
            raise serializers.ValidationError(
                "Cette mise à disposition ne peut plus être modifiée car un engagement a été créé."
            )
        
        return super().update(instance, validated_data)


class MiseADispositionListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des mises à disposition"""
    demande_location_numero = serializers.CharField(source='demande_location.numero', read_only=True)
    chantier = serializers.CharField(source='demande_location.chantier', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.raison_sociale', read_only=True)
    responsable_nom = serializers.CharField(source='responsable.get_full_name', read_only=True)
    statut_dl = serializers.CharField(source='demande_location.get_statut_display', read_only=True)
    a_engagement = serializers.SerializerMethodField()
    
    class Meta:
        model = MiseADisposition
        fields = [
            'id', 'demande_location_numero', 'chantier', 'fournisseur_nom',
            'date_mise_disposition', 'immatriculation', 'conforme',
            'responsable_nom', 'statut_dl', 'a_engagement', 'created_at'
        ]
    
    def get_a_engagement(self, obj):
        """Vérifier si un engagement existe"""
        return hasattr(obj, 'engagement')


class MiseADispositionDetailSerializer(MiseADispositionSerializer):
    """Serializer détaillé pour les mises à disposition"""
    demande_location = DemandeLocationDetailSerializer(read_only=True)
    materiels_demandes = serializers.SerializerMethodField()
    engagement = serializers.SerializerMethodField()
    
    class Meta(MiseADispositionSerializer.Meta):
        fields = MiseADispositionSerializer.Meta.fields + [
            'materiels_demandes', 'engagement'
        ]
    
    def get_materiels_demandes(self, obj):
        """Récupérer les matériels de la demande de location"""
        from .serializers import MaterielDemandeSerializer  # Import local pour éviter les imports circulaires
        return MaterielDemandeSerializer(
            obj.demande_location.materieldemande_set.all(), 
            many=True
        ).data
    
    def get_engagement(self, obj):
        """Récupérer l'engagement s'il existe"""
        if hasattr(obj, 'engagement'):
            return {
                'id': obj.engagement.id,
                'numero': obj.engagement.numero,
                'date_debut': obj.engagement.date_debut,
                'date_fin': obj.engagement.date_fin,
                'montant_total_estime_mru': obj.engagement.montant_total_estime_mru
            }
        return None

class EngagementListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des engagements"""
    mise_a_disposition = MiseADispositionSerializer(read_only=True)
    responsable = UserBasicSerializer(read_only=True)
    jours_restants = serializers.ReadOnlyField()
    proche_expiration = serializers.ReadOnlyField()
    
    # Informations de la demande de location
    chantier = serializers.CharField(source='mise_a_disposition.demande_location.chantier', read_only=True)
    numero_dl = serializers.CharField(source='mise_a_disposition.demande_location.numero', read_only=True)
    fournisseur_nom = serializers.CharField(source='mise_a_disposition.fournisseur.raison_sociale', read_only=True)
    
    class Meta:
        model = Engagement
        fields = [
            'id', 'numero', 'mise_a_disposition', 'montant_total_estime_mru',
            'date_debut', 'date_fin', 'responsable', 'jours_restants', 
            'proche_expiration', 'created_at', 'chantier', 'numero_dl', 
            'fournisseur_nom'
        ]
        read_only_fields = ['numero', 'montant_total_estime_mru', 'date_fin', 'created_at']


class EngagementDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé pour les engagements"""
    mise_a_disposition = MiseADispositionDetailSerializer(read_only=True)
    responsable = UserBasicSerializer(read_only=True)
    jours_restants = serializers.ReadOnlyField()
    proche_expiration = serializers.ReadOnlyField()
    
    # Fiches de pointage associées
    fiches_pointage_count = serializers.SerializerMethodField()
    total_pointages_journaliers = serializers.SerializerMethodField()
    montant_reel_pointe = serializers.SerializerMethodField()
    
    # Informations des matériels de la DL
    materiels_demandes = serializers.SerializerMethodField()
    
    class Meta:
        model = Engagement
        fields = [
            'id', 'numero', 'mise_a_disposition', 'montant_total_estime_mru',
            'date_debut', 'date_fin', 'conditions_particulieres', 'responsable',
            'jours_restants', 'proche_expiration', 'fiches_pointage_count',
            'total_pointages_journaliers', 'montant_reel_pointe', 
            'materiels_demandes', 'created_at'
        ]
        read_only_fields = [
            'numero', 'montant_total_estime_mru', 'date_fin', 
            'responsable', 'created_at'
        ]
    
    def get_fiches_pointage_count(self, obj):
        """Nombre de fiches de pointage"""
        return obj.fiches_pointage.count()
    
    def get_total_pointages_journaliers(self, obj):
        """Nombre total de pointages journaliers"""
        total = 0
        for fiche in obj.fiches_pointage.all():
            total += fiche.pointages_journaliers.count()
        return total
    
    def get_montant_reel_pointe(self, obj):
        """Montant réel basé sur les pointages effectués"""
        from decimal import Decimal
        total = Decimal('0.000')
        for fiche in obj.fiches_pointage.all():
            total += fiche.montant_total_calcule
        return total
    
    def get_materiels_demandes(self, obj):
        """Récupérer les matériels de la demande de location"""
        materiels = obj.mise_a_disposition.demande_location.materieldemande_set.all()
        from .serializers import MaterielDemandeSerializer
        return MaterielDemandeSerializer(materiels, many=True).data


class EngagementCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un engagement"""
    mise_a_disposition_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Engagement
        fields = [
            'mise_a_disposition_id', 'date_debut', 'conditions_particulieres'
        ]
    
    def validate_mise_a_disposition_id(self, value):
        """Valider que la mise à disposition existe et peut avoir un engagement"""
        try:
            mad = MiseADisposition.objects.get(id=value)
            
            # Vérifier qu'il n'y a pas déjà un engagement
            if hasattr(mad, 'engagement'):
                raise serializers.ValidationError(
                    f"Cette mise à disposition (DL N° {mad.demande_location.numero}) a déjà un engagement."
                )
            
            # Vérifier que la mise à disposition est conforme
            if not mad.conforme:
                raise serializers.ValidationError(
                    "La mise à disposition doit être conforme pour créer un engagement."
                )
            
            # Vérifier que la DL est au bon statut
            if mad.demande_location.statut != 'MISE_A_DISPOSITION':
                raise serializers.ValidationError(
                    f"La demande de location doit être au statut 'Mise à disposition'. "
                    f"Statut actuel: {mad.demande_location.get_statut_display()}"
                )
            
            return value
            
        except MiseADisposition.DoesNotExist:
            raise serializers.ValidationError("Mise à disposition introuvable.")
    
    def validate_date_debut(self, value):
        """Valider la date de début"""
        from datetime import date, timedelta
        
        # La date de début ne peut pas être dans le passé (sauf aujourd'hui)
        if value < date.today():
            raise serializers.ValidationError(
                "La date de début ne peut pas être antérieure à aujourd'hui."
            )
        
        # La date de début ne peut pas être trop loin dans le futur (ex: 30 jours)
        if value > date.today() + timedelta(days=30):
            raise serializers.ValidationError(
                "La date de début ne peut pas être supérieure à 30 jours dans le futur."
            )
        
        return value
    
    def create(self, validated_data):
        """Créer un engagement"""
        user = self.context['request'].user
        
        # Vérifier les permissions
        if not hasattr(user, 'is_acheteur') or not user.is_acheteur:
            if not user.is_superuser:
                raise serializers.ValidationError(
                    "Seuls les acheteurs peuvent créer des engagements."
                )
        
        # Définir le responsable
        validated_data['responsable'] = user
        
        # Créer l'engagement
        engagement = super().create(validated_data)
        
        return engagement


class EngagementUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour mettre à jour un engagement"""
    
    class Meta:
        model = Engagement
        fields = ['date_debut', 'conditions_particulieres']
    
    def validate(self, attrs):
        """Validation globale"""
        # Vérifier que l'engagement peut être modifié
        if self.instance.fiches_pointage.exists():
            raise serializers.ValidationError(
                "Cet engagement ne peut plus être modifié car des fiches de pointage existent."
            )
        
        return attrs
    
    def validate_date_debut(self, value):
        """Valider la nouvelle date de début"""
        from datetime import date, timedelta
        
        # Si des pointages existent, on ne peut pas changer la date
        if self.instance.fiches_pointage.exists():
            raise serializers.ValidationError(
                "La date de début ne peut plus être modifiée car des pointages existent."
            )
        
        # Même validation que pour la création
        if value < date.today():
            raise serializers.ValidationError(
                "La date de début ne peut pas être antérieure à aujourd'hui."
            )
        
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour l'engagement"""
        user = self.context['request'].user
        
        # Vérifier les permissions
        if not user.is_superuser and instance.responsable != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Seul le responsable de cet engagement peut le modifier."
            )
        
        return super().update(instance, validated_data)


class EngagementStatutSerializer(serializers.Serializer):
    """Serializer pour les actions sur le statut de l'engagement"""
    action = serializers.ChoiceField(
        choices=['suspendre', 'reprendre', 'cloturer'], 
        write_only=True
    )
    motif = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate(self, attrs):
        """Validation selon l'action"""
        action = attrs.get('action')
        motif = attrs.get('motif', '')
        
        if action in ['suspendre', 'cloturer'] and not motif:
            raise serializers.ValidationError({
                'motif': f"Un motif est obligatoire pour {action} un engagement."
            })
        
        return attrs


class PointageJournalierSerializer(serializers.ModelSerializer):
    """Serializer pour les pointages journaliers"""
    jour_semaine = serializers.CharField(read_only=True)
    montant_journalier = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    total_heures = serializers.ReadOnlyField()
    
    class Meta:
        model = PointageJournalier
        fields = [
            'id', 'date_pointage', 'jour_semaine', 'chantier_pointage', 'compteur_debut', 'compteur_fin',
            'heures_panne', 'heures_arret', 'heures_travail', 'consommation_carburant',
            'observations', 'montant_journalier', 'total_heures'
        ]
        read_only_fields = ['jour_semaine', 'montant_journalier']
    
    def validate(self, attrs):
        """Validations personnalisées"""
        heures_panne = attrs.get('heures_panne', 0)
        heures_arret = attrs.get('heures_arret', 0)
        heures_travail = attrs.get('heures_travail', 0)
        
        # Vérifier que la somme des heures ne dépasse pas 10h
        total_heures = heures_panne + heures_arret + heures_travail
        if total_heures > 10:
            raise serializers.ValidationError(
                f'La somme des heures ne peut pas dépasser 10h. Total actuel: {total_heures}h'
            )
        
        # Vérifier les compteurs si fournis
        compteur_debut = attrs.get('compteur_debut')
        compteur_fin = attrs.get('compteur_fin')
        
        if compteur_debut is not None and compteur_fin is not None:
            if compteur_fin < compteur_debut:
                raise serializers.ValidationError(
                    'Le compteur de fin doit être supérieur ou égal au compteur de début.'
                )
        
        return attrs


class PointageJournalierCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un pointage journalier"""
    
    class Meta:
        model = PointageJournalier
        fields = [
            'fiche_pointage', 'date_pointage', 'chantier_pointage', 'compteur_debut', 'compteur_fin',
            'heures_panne', 'heures_arret', 'heures_travail', 'consommation_carburant',
            'observations'
        ]
    
    def validate_date_pointage(self, value):
        """Valider que la date est dans la période de la fiche"""
        fiche_pointage = self.initial_data.get('fiche_pointage')
        
        if fiche_pointage:
            try:
                from .models import FichePointageMateriel
                fiche = FichePointageMateriel.objects.get(id=fiche_pointage)
                
                if not (fiche.periode_debut <= value <= fiche.periode_fin):
                    raise serializers.ValidationError(
                        f'La date doit être comprise entre {fiche.periode_debut} et {fiche.periode_fin}'
                    )
            except FichePointageMateriel.DoesNotExist:
                pass  # La validation de fiche_pointage se fera ailleurs
        
        return value


class FichePointageMaterielSerializer(serializers.ModelSerializer):
    """Serializer pour les fiches de pointage matériel"""
    engagement_numero = serializers.CharField(source='engagement.numero', read_only=True)
    materiel_type = serializers.CharField(source='materiel.materiel.type_materiel', read_only=True)
    materiel_quantite = serializers.IntegerField(source='materiel.quantite', read_only=True)
    prix_unitaire = serializers.DecimalField(
        source='materiel.materiel.prix_unitaire_mru', 
        max_digits=10, decimal_places=3, read_only=True
    )
    montant_total_calcule = serializers.DecimalField(max_digits=15, decimal_places=3, read_only=True)
    
    # Statistiques des pointages
    total_jours_pointes = serializers.SerializerMethodField()
    total_heures_travail = serializers.SerializerMethodField()
    total_heures_panne = serializers.SerializerMethodField()
    total_heures_arret = serializers.SerializerMethodField()
    
    class Meta:
        model = FichePointageMateriel
        fields = [
            'id', 'engagement', 'engagement_numero', 'materiel', 'materiel_type',
            'materiel_quantite', 'prix_unitaire', 'numero_fiche', 'periode_debut',
            'periode_fin', 'montant_total_calcule',
            'total_jours_pointes', 'total_heures_travail', 'total_heures_panne',
            'total_heures_arret', 'created_at', 'updated_at'
        ]
        read_only_fields = ['montant_total_calcule', 'created_at', 'updated_at']
    
    def get_total_jours_pointes(self, obj):
        """Nombre de jours pointés"""
        return obj.pointages_journaliers.count()
    
    def get_total_heures_travail(self, obj):
        """Total des heures de travail"""
        from django.db.models import Sum
        result = obj.pointages_journaliers.aggregate(total=Sum('heures_travail'))
        return result['total'] or 0
    
    def get_total_heures_panne(self, obj):
        """Total des heures de panne"""
        from django.db.models import Sum
        result = obj.pointages_journaliers.aggregate(total=Sum('heures_panne'))
        return result['total'] or 0
    
    def get_total_heures_arret(self, obj):
        """Total des heures d'arrêt"""
        from django.db.models import Sum
        result = obj.pointages_journaliers.aggregate(total=Sum('heures_arret'))
        return result['total'] or 0


class FichePointageMaterielDetailSerializer(FichePointageMaterielSerializer):
    """Serializer détaillé pour les fiches de pointage avec pointages journaliers"""
    engagement = EngagementListSerializer(read_only=True)
    materiel = MaterielDemandeSerializer(read_only=True)
    pointages_journaliers = PointageJournalierSerializer(many=True, read_only=True)
    
    class Meta(FichePointageMaterielSerializer.Meta):
        fields = FichePointageMaterielSerializer.Meta.fields + [
            'pointages_journaliers'
        ]


class FichePointageMaterielCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une fiche de pointage matériel"""
    
    class Meta:
        model = FichePointageMateriel
        fields = [
            'engagement', 'materiel', 'numero_fiche', 'periode_debut',
            'periode_fin',
        ]
    
    def validate(self, attrs):
        """Validations croisées"""
        engagement = attrs.get('engagement')
        materiel = attrs.get('materiel')
        periode_debut = attrs.get('periode_debut')
        periode_fin = attrs.get('periode_fin')
        
        # Vérifier que le matériel appartient à l'engagement
        if engagement and materiel:
            if materiel.demande_location != engagement.mise_a_disposition.demande_location:
                raise serializers.ValidationError(
                    'Le matériel sélectionné ne correspond pas à cet engagement.'
                )
        
        # Vérifier que la période est cohérente
        if periode_debut and periode_fin:
            if periode_debut > periode_fin:
                raise serializers.ValidationError(
                    'La date de début doit être antérieure à la date de fin.'
                )
            
            # Vérifier que la période ne dépasse pas la durée de l'engagement
            if engagement:
                if periode_debut < engagement.date_debut:
                    raise serializers.ValidationError(
                        f'La période ne peut pas commencer avant le début de l\'engagement ({engagement.date_debut})'
                    )
                
                if periode_fin > engagement.date_fin:
                    raise serializers.ValidationError(
                        f'La période ne peut pas se terminer après la fin de l\'engagement ({engagement.date_fin})'
                    )
        
        # Vérifier l'unicité (engagement + matériel + période)
        if self.instance is None:  # Création uniquement
            from .models import FichePointageMateriel
            exists = FichePointageMateriel.objects.filter(
                engagement=engagement,
                materiel=materiel,
                periode_debut=periode_debut
            ).exists()
            
            if exists:
                raise serializers.ValidationError(
                    'Une fiche de pointage existe déjà pour ce matériel sur cette période.'
                )
        
        return attrs
    
    def validate_numero_fiche(self, value):
        """Valider l'unicité du numéro de fiche"""
        if not value or not value.strip():
            raise serializers.ValidationError('Le numéro de fiche est obligatoire.')
        
        # Vérifier l'unicité
        from .models import FichePointageMateriel
        exists = FichePointageMateriel.objects.filter(
            numero_fiche__iexact=value.strip()
        ).exclude(pk=self.instance.pk if self.instance else None).exists()
        
        if exists:
            raise serializers.ValidationError(
                f'Le numéro de fiche "{value}" existe déjà.'
            )
        
        return value.strip().upper()


class FicheVerificationPointageSerializer(serializers.ModelSerializer):
    """Serializer pour les fiches de vérification"""
    fiche_pointage = FichePointageMaterielSerializer(read_only=True)
    
    # Champs calculés
    total_jours_travailles = serializers.SerializerMethodField()
    total_heures_travail_calculees = serializers.SerializerMethodField()
    total_consommation_calculee = serializers.SerializerMethodField()
    
    class Meta:
        model = FicheVerificationPointage
        fields = [
            'id', 'fiche_pointage', 'chantier_verification', 'mois_annee',
            'date_verification', 'verificateur', 'total_consommation_carburant',
            'total_heures_facturees', 'conforme', 'observations_verification',
            'total_jours_travailles', 'total_heures_travail_calculees',
            'total_consommation_calculee', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_total_jours_travailles(self, obj):
        """Calculer le total des jours travaillés depuis les pointages"""
        return obj.fiche_pointage.pointages_journaliers.filter(heures_travail__gt=0).count()
    
    def get_total_heures_travail_calculees(self, obj):
        """Calculer le total des heures de travail depuis les pointages"""
        from django.db.models import Sum
        result = obj.fiche_pointage.pointages_journaliers.aggregate(
            total=Sum('heures_travail')
        )
        return result['total'] or 0
    
    def get_total_consommation_calculee(self, obj):
        """Calculer le total de consommation depuis les pointages"""
        from django.db.models import Sum
        result = obj.fiche_pointage.pointages_journaliers.aggregate(
            total=Sum('consommation_carburant')
        )
        return result['total'] or 0


class FicheVerificationPointageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une fiche de vérification"""
    
    class Meta:
        model = FicheVerificationPointage
        fields = [
            'fiche_pointage', 'chantier_verification', 'mois_annee',
            'date_verification', 'verificateur', 'total_consommation_carburant',
            'total_heures_facturees', 'conforme', 'observations_verification'
        ]
    
    def validate_fiche_pointage(self, value):
        """Valider que la fiche n'a pas déjà de vérification"""
        if hasattr(value, 'fiche_verification'):
            raise serializers.ValidationError(
                'Cette fiche de pointage a déjà une fiche de vérification.'
            )
        
        # Vérifier que la fiche a des pointages
        if not value.pointages_journaliers.exists():
            raise serializers.ValidationError(
                'La fiche de pointage doit contenir au moins un pointage journalier.'
            )
        
        return value


# Serializer pour les actions groupées sur les pointages
class PointageJournalierBulkCreateSerializer(serializers.Serializer):
    """Serializer pour créer plusieurs pointages en une fois"""
    fiche_pointage_id = serializers.IntegerField()
    pointages = PointageJournalierCreateSerializer(many=True)
    
    def validate_pointages(self, value):
        """Valider les pointages"""
        if not value:
            raise serializers.ValidationError('Au moins un pointage doit être fourni.')
        
        # Vérifier l'unicité des dates
        dates = [p['date_pointage'] for p in value]
        if len(dates) != len(set(dates)):
            raise serializers.ValidationError('Les dates de pointage doivent être uniques.')
        
        return value
    
    def create(self, validated_data):
        """Créer les pointages en lot"""
        from .models import FichePointageMateriel, PointageJournalier
        
        fiche_pointage = FichePointageMateriel.objects.get(
            id=validated_data['fiche_pointage_id']
        )
        
        pointages_created = []
        for pointage_data in validated_data['pointages']:
            pointage_data['fiche_pointage'] = fiche_pointage
            pointage = PointageJournalier.objects.create(**pointage_data)
            pointages_created.append(pointage)
        
        return {
            'fiche_pointage': fiche_pointage,
            'pointages_created': pointages_created,
            'count': len(pointages_created)
        }
