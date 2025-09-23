from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import date, timedelta

from .models import (
    Engagement, FichePointageMateriel, FicheVerificationPointage, Fournisseur, DemandeLocation, MaterielLocation, MiseADisposition, PointageJournalier,
)
from .serializers import (
    DemandeLocationCreateSerializer,
    DemandeLocationDetailSerializer,
    DemandeLocationListSerializer,
    DemandeLocationValidationSerializer,
    EngagementCreateSerializer,
    EngagementDetailSerializer,
    EngagementListSerializer,
    EngagementUpdateSerializer,
    FichePointageMaterielCreateSerializer,
    FichePointageMaterielDetailSerializer,
    FichePointageMaterielSerializer,
    FicheVerificationPointageCreateSerializer,
    FicheVerificationPointageSerializer,
    FournisseurSerializer,
    MaterielLocationSerializer,
    MiseADispositionDetailSerializer,
    MiseADispositionListSerializer,
    MiseADispositionSerializer,
    PointageJournalierBulkCreateSerializer,
    PointageJournalierCreateSerializer,
    PointageJournalierSerializer, 
)
from .permissions import IsOwnerOrAcheteur, CanCreateDL, CanValidateDL, CanCreateEngagement


class MaterielLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les Materiel de Location
    Lecture accessible à tous les utilisateurs authentifiés (pour la sélection lors de demande de location)
    """
    queryset = MaterielLocation.objects.filter(actif=True)  # Afficher seulement les fournisseurs actifs
    serializer_class = MaterielLocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['actif']
    search_fields = ['type_materiel', 'type_facturation']
    ordering_fields = ['type_materiel', 'created_at']
    ordering = ['type_materiel']


    def get_permissions(self):
        """
        Permissions différentes selon l'action
        """
        if self.action in ['list', 'retrieve']:
            # Lecture accessible à tous les utilisateurs authentifiés
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Lecture accessible à tous les utilisateurs authentifiés
            permission_classes = [permissions.IsAuthenticated, CanCreateDL]
        
        
        return [permission() for permission in permission_classes]

class FournisseurViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les fournisseurs
    Lecture accessible à tous les utilisateurs authentifiés (pour la sélection lors de mise à disposition)
    Création/modification accessible aux acheteurs et admins uniquement
    """
    queryset = Fournisseur.objects.filter(actif=True)  # Afficher seulement les fournisseurs actifs
    serializer_class = FournisseurSerializer
    permission_classes = [permissions.IsAuthenticated]  # Lecture pour tous
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['actif']
    search_fields = ['nif', 'raison_sociale', 'telephone']
    ordering_fields = ['raison_sociale', 'created_at']
    ordering = ['raison_sociale']
    
    def get_permissions(self):
        """
        Permissions différentes selon l'action
        """
        if self.action in ['list', 'retrieve']:
            # Lecture accessible à tous les utilisateurs authentifiés
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Création/modification/suppression pour acheteurs et admins uniquement
            permission_classes = [permissions.IsAuthenticated, CanValidateDL]
        
        return [permission() for permission in permission_classes]


class DemandeLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les demandes de location
    Filtrage automatique par utilisateur selon les rôles
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'departement']
    search_fields = ['numero', 'chantier', 'demandeur__first_name', 'demandeur__last_name']
    ordering_fields = ['created_at', 'date_demande', 'budget_previsionnel_mru']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        
        if user.is_admin:
            # Admin voit tout
            return DemandeLocation.objects.all()
        elif user.is_acheteur:
            # Acheteur voit les DL soumises et celles qu'il gère
            return DemandeLocation.objects.filter(
                Q(statut__in=['SOUMISE', 'VALIDEE', 'MISE_A_DISPOSITION', 'ENGAGEMENT_CREE']) |
                Q(validateur=user)
            )
        else:
            # Demandeur voit uniquement ses propres DL
            return DemandeLocation.objects.filter(demandeur=user)
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return DemandeLocationCreateSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return DemandeLocationDetailSerializer
        return DemandeLocationListSerializer
    
    def get_permissions(self):
        """Permissions selon l'action"""
        if self.action == 'create':
            return [permissions.IsAuthenticated(), CanCreateDL()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrAcheteur()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def soumettre(self, request, pk=None):
        """
        Endpoint: POST /api/demandes-location/{id}/soumettre/
        Changer le statut de BROUILLON à SOUMISE
        """
        demande = self.get_object()
        user = request.user
        
        # Vérifier les permissions
        if demande.demandeur != user and not user.is_admin:
            return Response({
                'error': 'Seul le demandeur peut soumettre sa demande'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Vérifier le statut
        if demande.statut != 'BROUILLON':
            return Response({
                'error': 'Seules les demandes en brouillon peuvent être soumises'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier qu'il y a des matériels
        if not demande.materieldemande_set.exists():
            return Response({
                'error': 'Impossible de soumettre une demande sans matériel'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Changer le statut
        demande.statut = 'SOUMISE'
        demande.save()
        
        serializer = DemandeLocationDetailSerializer(demande)
        return Response({
            'message': 'Demande soumise avec succès',
            'demande': serializer.data
        })

    @action(detail=True, methods=['post'])
    def retirer_soumission(self, request, pk=None):
        """
        Endpoint: POST /api/demandes-location/{id}/retirer-soumission/
        Changer le statut de SOUMISE à BROUILLON
        """
        demande = self.get_object()
        user = request.user
        
        # Vérifier les permissions
        if demande.demandeur != user and not user.is_admin:
            return Response({
                'error': 'Seul le demandeur peut retirer sa soumission'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Vérifier le statut
        if demande.statut != 'SOUMISE':
            return Response({
                'error': 'Seules les demandes soumises peuvent être retirées'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Changer le statut
        demande.statut = 'BROUILLON'
        demande.save()
        
        serializer = DemandeLocationDetailSerializer(demande)
        return Response({
            'message': 'Soumission retirée, demande remise en brouillon',
            'demande': serializer.data
        })

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """
        Endpoint: GET /api/demandes-location/statistiques-statuts/
        Statistiques par statut
        """
        queryset = self.get_queryset()
        
        stats = {}
        for statut, label in DemandeLocation.STATUT_CHOICES:
            count = queryset.filter(statut=statut).count()
            stats[statut] = {
                'count': count,
                'label': label
            }
        
        # Statistiques supplémentaires
        total = queryset.count()
        en_cours = queryset.filter(
            statut__in=['BROUILLON', 'SOUMISE', 'VALIDEE', 'MISE_A_DISPOSITION']
        ).count()
        
        return Response({
            'par_statut': stats,
            'total': total,
            'en_cours': en_cours,
            'terminees': queryset.filter(statut='ENGAGEMENT_CREE').count()
        })


    @action(detail=True, methods=['post'], permission_classes=[CanValidateDL])
    def valider(self, request, pk=None):
        """Action pour valider une DL"""
        demande = self.get_object()
        serializer = DemandeLocationValidationSerializer(
            instance=demande,
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        demande = serializer.save()

        return Response({
            'message': 'Demande validée avec succès.' if demande.statut == 'VALIDEE' else 'Demande rejetée.',
            'demande': DemandeLocationDetailSerializer(demande, context=self.get_serializer_context()).data
        })
        
    
    @action(detail=False, methods=['get'])
    def mes_demandes(self, request):
        """Endpoint pour les demandes de l'utilisateur connecté"""
        demandes = DemandeLocation.objects.filter(demandeur=request.user)
        page = self.paginate_queryset(demandes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(demandes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[CanValidateDL])
    def en_attente_validation(self, request):
        """Endpoint pour les DL en attente de validation"""
        demandes = DemandeLocation.objects.filter(statut='SOUMISE')
        page = self.paginate_queryset(demandes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(demandes, many=True)
        return Response(serializer.data)
    
class MiseADispositionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les mises à disposition
    
    Permissions:
    - list/retrieve: Tous les utilisateurs authentifiés
    - create/update/delete: Acheteurs et admins uniquement
    - Actions spécifiques selon les permissions métier
    """
    queryset = MiseADisposition.objects.select_related(
        'demande_location', 'demande_location__demandeur', 
        'fournisseur', 'responsable'
    ).prefetch_related(
        'demande_location__materieldemande_set__materiel'
    ).all()
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtres
    filterset_fields = {
        'conforme': ['exact'],
        'date_mise_disposition': ['exact', 'gte', 'lte'],
        'fournisseur': ['exact'],
        'demande_location__statut': ['exact'],
        'demande_location__departement': ['exact'],
        'responsable': ['exact']
    }
    
    # Recherche
    search_fields = [
        'demande_location__numero', 'demande_location__chantier',
        'fournisseur__raison_sociale', 'fournisseur__nif',
        'immatriculation', 'observations'
    ]
    
    # Tri
    ordering_fields = [
        'date_mise_disposition', 'created_at', 
        'demande_location__numero', 'fournisseur__raison_sociale'
    ]
    ordering = ['-date_mise_disposition']
    
    def get_serializer_class(self):
        """Choisir le serializer selon l'action"""
        if self.action == 'list':
            return MiseADispositionListSerializer
        elif self.action == 'retrieve':
            return MiseADispositionDetailSerializer
        else:
            return MiseADispositionSerializer
    
    def get_permissions(self):
        """Permissions selon l'action"""
        if self.action in ['list', 'retrieve']:
            # Lecture pour tous les utilisateurs authentifiés
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Écriture pour acheteurs et admins
            permission_classes = [permissions.IsAuthenticated, CanCreateEngagement]
        else:
            # Actions personnalisées
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtrer selon le rôle utilisateur"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_superuser:
            # Les admins voient tout
            return queryset
        
        if hasattr(user, 'is_acheteur') and user.is_acheteur:
            # Les acheteurs voient toutes les mises à disposition
            return queryset
        
        if hasattr(user, 'is_demandeur') and user.is_demandeur:
            # Les demandeurs voient leurs propres DL
            return queryset.filter(demande_location__demandeur=user)
        
        # Par défaut, filtrer par demandeur
        return queryset.filter(demande_location__demandeur=user)
    
    def perform_create(self, serializer):
        """Personnaliser la création"""
        # Le responsable est défini dans le serializer
        mise_a_disposition = serializer.save()
        
        # Log de l'action (optionnel)
        # logger.info(f"Mise à disposition créée: {mise_a_disposition.id} par {self.request.user}")
    
    def perform_update(self, serializer):
        """Personnaliser la mise à jour"""
        # Vérifier les permissions spécifiques
        instance = self.get_object()
        user = self.request.user
        
        # Seul le responsable ou un admin peut modifier
        if not user.is_superuser and instance.responsable != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul le responsable de cette mise à disposition peut la modifier.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Personnaliser la suppression"""
        user = self.request.user
        
        # Vérifier qu'il n'y a pas d'engagement
        if hasattr(instance, 'engagement'):
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Impossible de supprimer une mise à disposition avec un engagement.")
        
        # Seul le responsable ou un admin peut supprimer
        if not user.is_superuser and instance.responsable != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul le responsable de cette mise à disposition peut la supprimer.")
        
        # Remettre la DL au statut VALIDEE
        instance.demande_location.statut = 'VALIDEE'
        instance.demande_location.save()
        
        super().perform_destroy(instance)
    
    @action(detail=False, methods=['get'])
    def demandes_disponibles(self, request):
        """
        Endpoint: GET /api/mises-a-disposition/demandes-disponibles/
        Retourner les demandes de location validées sans mise à disposition
        """
        demandes = DemandeLocation.objects.filter(
            statut='VALIDEE'
        ).exclude(
            mise_a_disposition__isnull=False
        ).select_related('demandeur')
        
        # Filtrer par département si l'utilisateur n'est pas admin
        if not request.user.is_superuser:
            if hasattr(request.user, 'departement') and request.user.departement:
                demandes = demandes.filter(departement=request.user.departement)
        
        from .serializers import DemandeLocationListSerializer
        serializer = DemandeLocationListSerializer(demandes, many=True)
        
        return Response({
            'count': demandes.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def fournisseurs_actifs(self, request):
        """
        Endpoint: GET /api/mises-a-disposition/fournisseurs-actifs/
        Retourner les fournisseurs actifs pour la sélection
        """
        fournisseurs = Fournisseur.objects.filter(actif=True)
        
        # Recherche optionnelle
        search = request.query_params.get('search', None)
        if search:
            fournisseurs = fournisseurs.filter(
                Q(raison_sociale__icontains=search) |
                Q(nif__icontains=search)
            )
        
        from .serializers import FournisseurSerializer
        serializer = FournisseurSerializer(fournisseurs, many=True)
        
        return Response({
            'count': fournisseurs.count(),
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def marquer_conforme(self, request, pk=None):
        """
        Endpoint: POST /api/mises-a-disposition/{id}/marquer-conforme/
        Marquer une mise à disposition comme conforme/non conforme
        """
        mise_a_disposition = self.get_object()
        user = request.user
        
        # Vérifier les permissions
        if not user.is_superuser and mise_a_disposition.responsable != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul le responsable peut modifier la conformité.")
        
        conforme = request.data.get('conforme', True)
        observations = request.data.get('observations', '')
        
        mise_a_disposition.conforme = conforme
        
        # Ajouter les observations
        if observations:
            timestamp = timezone.now().strftime('%d/%m/%Y %H:%M')
            status_text = 'Conforme' if conforme else 'Non conforme'
            new_obs = f"\n{status_text} ({timestamp}): {observations}"
            
            if mise_a_disposition.observations:
                mise_a_disposition.observations += new_obs
            else:
                mise_a_disposition.observations = new_obs.strip()
        
        mise_a_disposition.save()
        
        serializer = self.get_serializer(mise_a_disposition)
        return Response({
            'message': f'Mise à disposition marquée comme {"conforme" if conforme else "non conforme"}',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def materiels(self, request, pk=None):
        """
        Endpoint: GET /api/mises-a-disposition/{id}/materiels/
        Retourner les matériels de la demande de location
        """
        mise_a_disposition = self.get_object()
        materiels = mise_a_disposition.demande_location.materieldemande_set.all()
        
        from .serializers import MaterielDemandeSerializer
        serializer = MaterielDemandeSerializer(materiels, many=True)
        
        return Response({
            'demande_location': mise_a_disposition.demande_location.numero,
            'chantier': mise_a_disposition.demande_location.chantier,
            'materiels': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """
        Endpoint: GET /api/mises-a-disposition/statistiques/
        Statistiques des mises à disposition
        """
        queryset = self.get_queryset()
        
        # Statistiques de base
        total = queryset.count()
        conformes = queryset.filter(conforme=True).count()
        non_conformes = queryset.filter(conforme=False).count()
        avec_engagement = queryset.filter(engagement__isnull=False).count()
        
        # Statistiques par mois (3 derniers mois)
        from django.db.models import Count
        from django.db.models.functions import TruncMonth
        
        stats_mensuelles = queryset.filter(
            date_mise_disposition__gte=date.today().replace(day=1) - timezone.timedelta(days=90)
        ).annotate(
            mois=TruncMonth('date_mise_disposition')
        ).values('mois').annotate(
            count=Count('id')
        ).order_by('mois')
        
        # Top fournisseurs
        top_fournisseurs = queryset.values(
            'fournisseur__raison_sociale'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return Response({
            'total': total,
            'conformes': conformes,
            'non_conformes': non_conformes,
            'avec_engagement': avec_engagement,
            'taux_conformite': round((conformes / total * 100) if total > 0 else 0, 2),
            'taux_engagement': round((avec_engagement / total * 100) if total > 0 else 0, 2),
            'statistiques_mensuelles': list(stats_mensuelles),
            'top_fournisseurs': list(top_fournisseurs)
        })

# class MaterielItemViewSet(viewsets.ModelViewSet):
#     """
#     ViewSet pour les matériels
#     Lié aux demandes de location
#     """
#     serializer_class = MaterielItemSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     filter_backends = [DjangoFilterBackend, SearchFilter]
#     filterset_fields = ['type_materiel', 'demande_location']
#     search_fields = ['designation', 'specifications']
    
#     def get_queryset(self):
#         """Filtrage selon les rôles"""
#         user = self.request.user
        
#         if user.is_admin:
#             return MaterielItem.objects.all()
#         elif user.is_acheteur:
#             return MaterielItem.objects.filter(
#                 demande_location__statut__in=['SOUMISE', 'VALIDEE', 'MISE_A_DISPOSITION', 'ENGAGEMENT_CREE']
#             )
#         else:
#             return MaterielItem.objects.filter(demande_location__demandeur=user)
    
#     def perform_create(self, serializer):
#         """Vérifier que l'utilisateur peut modifier cette DL"""
#         demande_location = serializer.validated_data['demande_location']
#         user = self.request.user
        
#         if not (user.is_admin or demande_location.demandeur == user):
#             raise permissions.PermissionDenied("Vous ne pouvez pas ajouter de matériel à cette demande.")
        
#         if demande_location.statut not in ['BROUILLON', 'SOUMISE']:
#             raise permissions.PermissionDenied("Impossible de modifier une demande validée.")
        
#         serializer.save()


# class MiseADispositionViewSet(viewsets.ModelViewSet):
#     """
#     ViewSet pour les mises à disposition
#     Accessible aux acheteurs pour création, visible par les demandeurs
#     """
#     serializer_class = MiseADispositionSerializer
#     permission_classes = [permissions.IsAuthenticated]
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     filterset_fields = ['conforme', 'fournisseur', 'date_mise_disposition']
#     search_fields = ['immatriculation', 'demande_location__numero', 'demande_location__chantier']
#     ordering_fields = ['date_mise_disposition', 'created_at']
#     ordering = ['-date_mise_disposition']
    
#     def get_queryset(self):
#         """Filtrage selon les rôles"""
#         user = self.request.user
        
#         if user.is_admin:
#             return MiseADisposition.objects.all()
#         elif user.is_acheteur:
#             return MiseADisposition.objects.filter(responsable=user)
#         else:
#             return MiseADisposition.objects.filter(demande_location__demandeur=user)
    
#     def get_permissions(self):
#         """Permissions selon l'action"""
#         if self.action in ['create', 'update', 'partial_update', 'destroy']:
#             return [permissions.IsAuthenticated(), CanValidateDL()]  # Acheteurs uniquement
#         return [permissions.IsAuthenticated()]


class EngagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les engagements contractuels
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtres adaptés au nouveau modèle
    filterset_fields = {
        'date_debut': ['exact', 'gte', 'lte'],
        'date_fin': ['exact', 'gte', 'lte'],
        'mise_a_disposition__fournisseur': ['exact'],
        'mise_a_disposition__demande_location__departement': ['exact'],
        'responsable': ['exact']
    }
    
    search_fields = [
        'numero', 'mise_a_disposition__demande_location__chantier',
        'mise_a_disposition__demande_location__numero',
        'mise_a_disposition__fournisseur__raison_sociale'
    ]
    
    ordering_fields = ['date_debut', 'date_fin', 'montant_total_estime_mru', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrage selon les rôles avec optimisation des requêtes"""
        user = self.request.user
        queryset = Engagement.objects.select_related(
            'mise_a_disposition__demande_location__demandeur',
            'mise_a_disposition__fournisseur',
            'responsable'
        ).prefetch_related(
            'fiches_pointage__pointages_journaliers'
        )
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            return queryset.all()
        else:
            return queryset.filter(
                mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return EngagementCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return EngagementUpdateSerializer
        elif self.action == 'retrieve':
            return EngagementDetailSerializer
        return EngagementListSerializer
    
    def get_permissions(self):
        """Permissions selon l'action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), CanCreateEngagement()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def mises_a_disposition_disponibles(self, request):
        """
        Endpoint: GET /api/engagements/mises-a-disposition-disponibles/
        Retourner les mises à disposition sans engagement
        """
        mises_a_disposition = MiseADisposition.objects.filter(
            conforme=True
        ).exclude(
            engagement__isnull=False
        ).select_related(
            'demande_location__demandeur', 'fournisseur'
        )
        
        # Filtrer par utilisateur si pas admin
        user = request.user
        if not user.is_superuser:
            if hasattr(user, 'is_acheteur') and user.is_acheteur:
                # Les acheteurs voient toutes les MAD conformes
                pass
            else:
                # Les autres voient leurs propres DL
                mises_a_disposition = mises_a_disposition.filter(
                    demande_location__demandeur=user
                )
        
        from .serializers import MiseADispositionListSerializer
        serializer = MiseADispositionListSerializer(mises_a_disposition, many=True)
        
        return Response({
            'count': mises_a_disposition.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def expirant_bientot(self, request):
        """Engagements expirant dans moins de 10 jours"""
        date_limite = date.today() + timedelta(days=10)
        engagements = self.get_queryset().filter(
            date_fin__lte=date_limite, 
            date_fin__gte=date.today()
        )
        
        page = self.paginate_queryset(engagements)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(engagements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expires(self, request):
        """Engagements déjà expirés"""
        engagements = self.get_queryset().filter(date_fin__lt=date.today())
        
        page = self.paginate_queryset(engagements)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(engagements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def fiches_pointage(self, request, pk=None):
        """
        Endpoint: GET /api/engagements/{id}/fiches-pointage/
        Retourner les fiches de pointage de l'engagement
        """
        engagement = self.get_object()
        fiches = engagement.fiches_pointage.all()
        
        serializer = FichePointageMaterielSerializer(fiches, many=True)
        return Response({
            'engagement': engagement.numero,
            'fiches_count': fiches.count(),
            'fiches': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques des engagements"""
        queryset = self.get_queryset()
        
        # Statistiques de base
        total = queryset.count()
        actifs = queryset.filter(date_fin__gte=date.today()).count()
        expires = queryset.filter(date_fin__lt=date.today()).count()
        expirant_bientot = queryset.filter(
            date_fin__gte=date.today(),
            date_fin__lte=date.today() + timedelta(days=10)
        ).count()
        
        # Montants
        montant_total = queryset.aggregate(
            total=Sum('montant_total_estime_mru')
        )['total'] or 0
        
        # Statistiques par mois
        stats_mensuelles = queryset.filter(
            date_debut__gte=date.today().replace(day=1) - timedelta(days=90)
        ).extra(
            select={'mois': "DATE_FORMAT(date_debut, '%%Y-%%m')"}
        ).values('mois').annotate(
            count=Count('id'),
            montant=Sum('montant_total_estime_mru')
        ).order_by('mois')
        
        return Response({
            'total': total,
            'actifs': actifs,
            'expires': expires,
            'expirant_bientot': expirant_bientot,
            'montant_total_estime': montant_total,
            'statistiques_mensuelles': list(stats_mensuelles)
        })


class FichePointageMaterielViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les fiches de pointage matériel
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'engagement': ['exact'],
        'materiel__materiel__type_materiel': ['exact'],
        'periode_debut': ['exact', 'gte', 'lte'],
        'periode_fin': ['exact', 'gte', 'lte']
    }
    
    search_fields = [
        'numero_fiche', 'engagement__numero', 'immatriculation',
        'engagement__mise_a_disposition__demande_location__chantier'
    ]
    
    ordering_fields = ['periode_debut', 'periode_fin', 'montant_total_calcule', 'created_at']
    ordering = ['-periode_debut']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = FichePointageMateriel.objects.select_related(
            'engagement__mise_a_disposition__demande_location',
            'materiel__materiel'
        ).prefetch_related('pointages_journaliers')
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            return queryset.filter(engagement__responsable=user)
        else:
            return queryset.filter(
                engagement__mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return FichePointageMaterielCreateSerializer
        elif self.action == 'retrieve':
            return FichePointageMaterielDetailSerializer
        return FichePointageMaterielSerializer
    
    @action(detail=True, methods=['get'])
    def pointages_journaliers(self, request, pk=None):
        """
        Endpoint: GET /api/fiches-pointage/{id}/pointages-journaliers/
        Retourner les pointages journaliers de la fiche
        """
        fiche = self.get_object()
        pointages = fiche.pointages_journaliers.all().order_by('date_pointage')
        
        serializer = PointageJournalierSerializer(pointages, many=True)
        return Response({
            'fiche': fiche.numero_fiche,
            'periode': f"{fiche.periode_debut} - {fiche.periode_fin}",
            'pointages_count': pointages.count(),
            'pointages': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def creer_pointages_periode(self, request, pk=None):
        """
        Endpoint: POST /api/fiches-pointage/{id}/creer-pointages-periode/
        Créer des pointages pour toute la période de la fiche
        """
        fiche = self.get_object()
        
        # Vérifier les permissions
        user = request.user
        if not user.is_superuser:
            if not (hasattr(user, 'is_acheteur') and user.is_acheteur):
                if fiche.engagement.mise_a_disposition.demande_location.demandeur != user:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Vous n'avez pas les droits pour créer des pointages sur cette fiche.")
        
        # Générer les dates de la période
        current_date = fiche.periode_debut
        pointages_created = []
        
        while current_date <= fiche.periode_fin:
            # Vérifier si un pointage existe déjà
            if not fiche.pointages_journaliers.filter(date_pointage=current_date).exists():
                pointage = PointageJournalier.objects.create(
                    fiche_pointage=fiche,
                    date_pointage=current_date,
                    heures_travail=0,  # Valeurs par défaut
                    heures_panne=0,
                    heures_arret=0,
                    consommation_carburant=0
                )
                pointages_created.append(pointage)
            
            current_date += timedelta(days=1)
        
        serializer = PointageJournalierSerializer(pointages_created, many=True)
        return Response({
            'message': f'{len(pointages_created)} pointages créés',
            'pointages': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def materiels_disponibles(self, request):
        """
        Endpoint: GET /api/fiches-pointage/materiels-disponibles/
        Retourner les matériels disponibles pour un engagement
        """
        engagement_id = request.query_params.get('engagement_id')
        
        if not engagement_id:
            return Response({
                'error': 'Paramètre engagement_id requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import Engagement, MaterielDemande
            engagement = Engagement.objects.get(id=engagement_id)
            materiels = MaterielDemande.objects.filter(
                demande_location=engagement.mise_a_disposition.demande_location
            )
            
            from .serializers import MaterielDemandeSerializer
            serializer = MaterielDemandeSerializer(materiels, many=True)
            
            return Response({
                'engagement': engagement.numero,
                'materiels': serializer.data
            })
            
        except Engagement.DoesNotExist:
            return Response({
                'error': 'Engagement introuvable'
            }, status=status.HTTP_404_NOT_FOUND)


class PointageJournalierViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les pointages journaliers
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'date_pointage': ['exact', 'gte', 'lte'],
        'jour_semaine': ['exact'],
        'fiche_pointage': ['exact'],
        'fiche_pointage__engagement': ['exact']
    }
    
    search_fields = ['observations', 'fiche_pointage__numero_fiche']
    ordering_fields = ['date_pointage', 'heures_travail', 'montant_journalier']
    ordering = ['-date_pointage']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = PointageJournalier.objects.select_related(
            'fiche_pointage__engagement__mise_a_disposition__demande_location'
        )
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            return queryset.filter(fiche_pointage__engagement__responsable=user)
        else:
            return queryset.filter(
                fiche_pointage__engagement__mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return PointageJournalierCreateSerializer
        return PointageJournalierSerializer
    
    @action(detail=False, methods=['post'])
    def creation_groupee(self, request):
        """
        Endpoint: POST /api/pointages-journaliers/creation-groupee/
        Créer plusieurs pointages en une fois
        """
        serializer = PointageJournalierBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = serializer.save()
        
        return Response({
            'message': f"{result['count']} pointages créés avec succès",
            'fiche_pointage': result['fiche_pointage'].numero_fiche,
            'pointages': PointageJournalierSerializer(result['pointages_created'], many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def rapport_mensuel(self, request):
        """Rapport mensuel des pointages"""
        mois = request.query_params.get('mois')  # Format: YYYY-MM
        
        if not mois:
            return Response({
                'error': 'Paramètre mois requis (format: YYYY-MM)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            annee, mois_num = mois.split('-')
            pointages = self.get_queryset().filter(
                date_pointage__year=int(annee),
                date_pointage__month=int(mois_num)
            )
            
            # Statistiques du mois
            stats = {
                'mois': mois,
                'total_pointages': pointages.count(),
                'total_heures_travail': pointages.aggregate(
                    total=Sum('heures_travail')
                )['total'] or 0,
                'total_heures_panne': pointages.aggregate(
                    total=Sum('heures_panne')
                )['total'] or 0,
                'total_heures_arret': pointages.aggregate(
                    total=Sum('heures_arret')
                )['total'] or 0,
                'total_montant': pointages.aggregate(
                    total=Sum('montant_journalier')
                )['total'] or 0,
                'total_carburant': pointages.aggregate(
                    total=Sum('consommation_carburant')
                )['total'] or 0
            }
            
            return Response(stats)
            
        except ValueError:
            return Response({
                'error': 'Format de mois invalide (attendu: YYYY-MM)'
            }, status=status.HTTP_400_BAD_REQUEST)


class FicheVerificationPointageViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les fiches de vérification
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'conforme': ['exact'],
        'date_verification': ['exact', 'gte', 'lte'],
        'fiche_pointage__engagement': ['exact']
    }
    
    search_fields = ['chantier_verification', 'verificateur', 'mois_annee']
    ordering_fields = ['date_verification', 'created_at']
    ordering = ['-date_verification']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = FicheVerificationPointage.objects.select_related(
            'fiche_pointage__engagement__mise_a_disposition__demande_location'
        )
        
        if user.is_superuser:
            return queryset.all()
        else:
            # Tous les utilisateurs authentifiés peuvent voir les vérifications
            # mais filtré par leurs engagements/demandes
            return queryset.filter(
                Q(fiche_pointage__engagement__responsable=user) |
                Q(fiche_pointage__engagement__mise_a_disposition__demande_location__demandeur=user)
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return FicheVerificationPointageCreateSerializer
        return FicheVerificationPointageSerializer
    
class  EngagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les engagements contractuels
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtres adaptés au nouveau modèle
    filterset_fields = {
        'date_debut': ['exact', 'gte', 'lte'],
        'date_fin': ['exact', 'gte', 'lte'],
        'mise_a_disposition__fournisseur': ['exact'],
        'mise_a_disposition__demande_location__departement': ['exact'],
        'responsable': ['exact']
    }
    
    search_fields = [
        'numero', 'mise_a_disposition__demande_location__chantier',
        'mise_a_disposition__demande_location__numero',
        'mise_a_disposition__fournisseur__raison_sociale'
    ]
    
    ordering_fields = ['date_debut', 'date_fin', 'montant_total_estime_mru', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filtrage selon les rôles avec optimisation des requêtes"""
        user = self.request.user
        queryset = Engagement.objects.select_related(
            'mise_a_disposition__demande_location__demandeur',
            'mise_a_disposition__fournisseur',
            'responsable'
        ).prefetch_related(
            'fiches_pointage__pointages_journaliers'
        )
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            return queryset.all()
        else:
            return queryset.filter(
                mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return EngagementCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return EngagementUpdateSerializer
        elif self.action == 'retrieve':
            return EngagementDetailSerializer
        return EngagementListSerializer
    
    def get_permissions(self):
        """Permissions selon l'action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), CanCreateEngagement()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def mises_a_disposition_disponibles(self, request):
        """
        Endpoint: GET /api/engagements/mises-a-disposition-disponibles/
        Retourner les mises à disposition sans engagement
        """
        mises_a_disposition = MiseADisposition.objects.filter(
            conforme=True
        ).exclude(
            engagement__isnull=False
        ).select_related(
            'demande_location__demandeur', 'fournisseur'
        )
        
        # Filtrer par utilisateur si pas admin
        user = request.user
        if not user.is_superuser:
            if hasattr(user, 'is_acheteur') and user.is_acheteur:
                # Les acheteurs voient toutes les MAD conformes
                pass
            else:
                # Les autres voient leurs propres DL
                mises_a_disposition = mises_a_disposition.filter(
                    demande_location__demandeur=user
                )
        
        from .serializers import MiseADispositionListSerializer
        serializer = MiseADispositionListSerializer(mises_a_disposition, many=True)
        
        return Response({
            'count': mises_a_disposition.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def expirant_bientot(self, request):
        """Engagements expirant dans moins de 10 jours"""
        date_limite = date.today() + timedelta(days=10)
        engagements = self.get_queryset().filter(
            date_fin__lte=date_limite, 
            date_fin__gte=date.today()
        )
        
        page = self.paginate_queryset(engagements)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(engagements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expires(self, request):
        """Engagements déjà expirés"""
        engagements = self.get_queryset().filter(date_fin__lt=date.today())
        
        page = self.paginate_queryset(engagements)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(engagements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def fiches_pointage(self, request, pk=None):
        """
        Endpoint: GET /api/engagements/{id}/fiches-pointage/
        Retourner les fiches de pointage de l'engagement
        """
        engagement = self.get_object()
        fiches = engagement.fiches_pointage.all()
        
        serializer = FichePointageMaterielSerializer(fiches, many=True)
        return Response({
            'engagement': engagement.numero,
            'fiches_count': fiches.count(),
            'fiches': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques des engagements"""
        queryset = self.get_queryset()
        
        # Statistiques de base
        total = queryset.count()
        actifs = queryset.filter(date_fin__gte=date.today()).count()
        expires = queryset.filter(date_fin__lt=date.today()).count()
        expirant_bientot = queryset.filter(
            date_fin__gte=date.today(),
            date_fin__lte=date.today() + timedelta(days=10)
        ).count()
        
        # Montants
        montant_total = queryset.aggregate(
            total=Sum('montant_total_estime_mru')
        )['total'] or 0
        
        # Statistiques par mois
        stats_mensuelles = queryset.filter(
            date_debut__gte=date.today().replace(day=1) - timedelta(days=90)
        ).extra(
            select={'mois': "DATE_FORMAT(date_debut, '%%Y-%%m')"}
        ).values('mois').annotate(
            count=Count('id'),
            montant=Sum('montant_total_estime_mru')
        ).order_by('mois')
        
        return Response({
            'total': total,
            'actifs': actifs,
            'expires': expires,
            'expirant_bientot': expirant_bientot,
            'montant_total_estime': montant_total,
            'statistiques_mensuelles': list(stats_mensuelles)
        })


class FichePointageMaterielViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les fiches de pointage matériel
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'engagement': ['exact'],
        'materiel__materiel__type_materiel': ['exact'],
        'periode_debut': ['exact', 'gte', 'lte'],
        'periode_fin': ['exact', 'gte', 'lte']
    }
    
    search_fields = [
        'numero_fiche', 'engagement__numero', 'immatriculation',
        'engagement__mise_a_disposition__demande_location__chantier'
    ]
    
    ordering_fields = ['periode_debut', 'periode_fin', 'montant_total_calcule', 'created_at']
    ordering = ['-periode_debut']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = FichePointageMateriel.objects.select_related(
            'engagement__mise_a_disposition__demande_location',
            'materiel__materiel'
        ).prefetch_related('pointages_journaliers')
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            # return queryset.filter(engagement__responsable=user)
            return queryset.all()
        else:
            return queryset.filter(
                engagement__mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return FichePointageMaterielCreateSerializer
        elif self.action == 'retrieve':
            return FichePointageMaterielDetailSerializer
        return FichePointageMaterielSerializer
    
    @action(detail=True, methods=['get'])
    def pointages_journaliers(self, request, pk=None):
        """
        Endpoint: GET /api/fiches-pointage/{id}/pointages-journaliers/
        Retourner les pointages journaliers de la fiche
        """
        fiche = self.get_object()
        pointages = fiche.pointages_journaliers.all().order_by('date_pointage')
        
        serializer = PointageJournalierSerializer(pointages, many=True)
        return Response({
            'fiche': fiche.numero_fiche,
            'periode': f"{fiche.periode_debut} - {fiche.periode_fin}",
            'pointages_count': pointages.count(),
            'pointages': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def creer_pointages_periode(self, request, pk=None):
        """
        Endpoint: POST /api/fiches-pointage/{id}/creer-pointages-periode/
        Créer des pointages pour toute la période de la fiche
        """
        fiche = self.get_object()
        
        # Vérifier les permissions
        user = request.user
        if not user.is_superuser:
            if not (hasattr(user, 'is_acheteur') and user.is_acheteur):
                if fiche.engagement.mise_a_disposition.demande_location.demandeur != user:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Vous n'avez pas les droits pour créer des pointages sur cette fiche.")
        
        # Générer les dates de la période
        current_date = fiche.periode_debut
        pointages_created = []
        
        while current_date <= fiche.periode_fin:
            # Vérifier si un pointage existe déjà
            if not fiche.pointages_journaliers.filter(date_pointage=current_date).exists():
                pointage = PointageJournalier.objects.create(
                    fiche_pointage=fiche,
                    date_pointage=current_date,
                    heures_travail=0,  # Valeurs par défaut
                    heures_panne=0,
                    heures_arret=0,
                    consommation_carburant=0
                )
                pointages_created.append(pointage)
            
            current_date += timedelta(days=1)
        
        serializer = PointageJournalierSerializer(pointages_created, many=True)
        return Response({
            'message': f'{len(pointages_created)} pointages créés',
            'pointages': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def materiels_disponibles(self, request):
        """
        Endpoint: GET /api/fiches-pointage/materiels-disponibles/
        Retourner les matériels disponibles pour un engagement
        """
        engagement_id = request.query_params.get('engagement_id')
        
        if not engagement_id:
            return Response({
                'error': 'Paramètre engagement_id requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .models import Engagement, MaterielDemande
            engagement = Engagement.objects.get(id=engagement_id)
            materiels = MaterielDemande.objects.filter(
                demande_location=engagement.mise_a_disposition.demande_location
            )
            
            from .serializers import MaterielDemandeSerializer
            serializer = MaterielDemandeSerializer(materiels, many=True)
            
            return Response({
                'engagement': engagement.numero,
                'materiels': serializer.data
            })
            
        except Engagement.DoesNotExist:
            return Response({
                'error': 'Engagement introuvable'
            }, status=status.HTTP_404_NOT_FOUND)

 
class PointageJournalierViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les pointages journaliers
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'date_pointage': ['exact', 'gte', 'lte'],
        'jour_semaine': ['exact'],
        'fiche_pointage': ['exact'],
        'fiche_pointage__engagement': ['exact']
    }
    
    search_fields = ['observations', 'fiche_pointage__numero_fiche']
    ordering_fields = ['date_pointage', 'heures_travail', 'montant_journalier']
    ordering = ['-date_pointage']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = PointageJournalier.objects.select_related(
            'fiche_pointage__engagement__mise_a_disposition__demande_location'
        )
        
        if user.is_superuser:
            return queryset.all()
        elif hasattr(user, 'is_acheteur') and user.is_acheteur:
            return queryset.all()
        else:
            return queryset.filter(
                fiche_pointage__engagement__mise_a_disposition__demande_location__demandeur=user
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return PointageJournalierCreateSerializer
        return PointageJournalierSerializer
    
    @action(detail=False, methods=['post'])
    def creation_groupee(self, request):
        """
        Endpoint: POST /api/pointages-journaliers/creation-groupee/
        Créer plusieurs pointages en une fois
        """
        serializer = PointageJournalierBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = serializer.save()
        
        return Response({
            'message': f"{result['count']} pointages créés avec succès",
            'fiche_pointage': result['fiche_pointage'].numero_fiche,
            'pointages': PointageJournalierSerializer(result['pointages_created'], many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def rapport_mensuel(self, request):
        """Rapport mensuel des pointages"""
        mois = request.query_params.get('mois')  # Format: YYYY-MM
        
        if not mois:
            return Response({
                'error': 'Paramètre mois requis (format: YYYY-MM)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            annee, mois_num = mois.split('-')
            pointages = self.get_queryset().filter(
                date_pointage__year=int(annee),
                date_pointage__month=int(mois_num)
            )
            
            # Statistiques du mois
            stats = {
                'mois': mois,
                'total_pointages': pointages.count(),
                'total_heures_travail': pointages.aggregate(
                    total=Sum('heures_travail')
                )['total'] or 0,
                'total_heures_panne': pointages.aggregate(
                    total=Sum('heures_panne')
                )['total'] or 0,
                'total_heures_arret': pointages.aggregate(
                    total=Sum('heures_arret')
                )['total'] or 0,
                'total_montant': pointages.aggregate(
                    total=Sum('montant_journalier')
                )['total'] or 0,
                'total_carburant': pointages.aggregate(
                    total=Sum('consommation_carburant')
                )['total'] or 0
            }
            
            return Response(stats)
            
        except ValueError:
            return Response({
                'error': 'Format de mois invalide (attendu: YYYY-MM)'
            }, status=status.HTTP_400_BAD_REQUEST)


class FicheVerificationPointageViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les fiches de vérification
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = {
        'conforme': ['exact'],
        'date_verification': ['exact', 'gte', 'lte'],
        'fiche_pointage__engagement': ['exact']
    }
    
    search_fields = ['chantier_verification', 'verificateur', 'mois_annee']
    ordering_fields = ['date_verification', 'created_at']
    ordering = ['-date_verification']
    
    def get_queryset(self):
        """Filtrage selon les rôles"""
        user = self.request.user
        queryset = FicheVerificationPointage.objects.select_related(
            'fiche_pointage__engagement__mise_a_disposition__demande_location'
        )
        
        if user.is_superuser:
            return queryset.all()
        else:
            # Tous les utilisateurs authentifiés peuvent voir les vérifications
            # mais filtré par leurs engagements/demandes
            return queryset.filter(
                Q(fiche_pointage__engagement__responsable=user) |
                Q(fiche_pointage__engagement__mise_a_disposition__demande_location__demandeur=user)
            )
    
    def get_serializer_class(self):
        """Serializer selon l'action"""
        if self.action == 'create':
            return FicheVerificationPointageCreateSerializer
        return FicheVerificationPointageSerializer
