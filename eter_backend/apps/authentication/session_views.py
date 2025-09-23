"""
Vues d'authentification basées sur les sessions Django avec cookies httpOnly
Remplace l'authentification JWT pour une sécurité améliorée
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from .serializers import UserProfileSerializer
import logging

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class SessionLoginView(APIView):
    """
    Vue pour l'authentification par session avec cookies httpOnly
    CSRF exempt pour le login initial, puis CSRF requis pour les autres actions
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Nom d\'utilisateur et mot de passe requis.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authentifier l'utilisateur
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                # Créer la session (cookies httpOnly automatiques)
                login(request, user)
                
                # Générer un nouveau token CSRF pour les requêtes futures
                csrf_token = get_token(request)
                
                # Sérialiser les données utilisateur
                serializer = UserProfileSerializer(user)
                
                logger.info(f"Connexion réussie pour l'utilisateur: {username}")
                
                response = Response({
                    'message': 'Connexion réussie.',
                    'user': serializer.data,
                    'authenticated': True,
                    'csrf_token': csrf_token  # Renvoyer le token pour les futures requêtes
                }, status=status.HTTP_200_OK)
                
                # S'assurer que le cookie CSRF est défini
                response.set_cookie(
                    'csrftoken', 
                    csrf_token,
                    max_age=None,
                    path='/',
                    secure=False,  # True en production HTTPS
                    httponly=False,  # Le frontend doit pouvoir le lire
                    samesite='Lax'
                )
                
                return response
            else:
                return Response({
                    'error': 'Compte utilisateur désactivé.'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            logger.warning(f"Tentative de connexion échouée pour: {username}")
            return Response({
                'error': 'Nom d\'utilisateur ou mot de passe incorrect.'
            }, status=status.HTTP_401_UNAUTHORIZED)


class SessionLogoutView(APIView):
    """
    Vue pour la déconnexion (suppression de la session)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        username = request.user.username if request.user.is_authenticated else "Utilisateur inconnu"
        
        # Supprimer la session
        logout(request)
        
        logger.info(f"Déconnexion réussie pour l'utilisateur: {username}")
        
        response = Response({
            'message': 'Déconnexion réussie.',
            'authenticated': False
        }, status=status.HTTP_200_OK)
        
        # Nettoyer les cookies côté serveur
        response.delete_cookie('sessionid', path='/')
        response.delete_cookie('csrftoken', path='/')
        
        return response


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def session_status(request):
    """
    Endpoint pour vérifier le statut d'authentification de la session
    Inclut automatiquement le token CSRF dans les cookies
    """
    if request.user.is_authenticated:
        serializer = UserProfileSerializer(request.user)
        return Response({
            'authenticated': True,
            'user': serializer.data,
            'csrf_token': get_token(request)  # Token CSRF pour les requêtes POST/PUT/DELETE
        })
    
    return Response({
        'authenticated': False,
        'user': None,
        'csrf_token': get_token(request)  # Token CSRF même pour les utilisateurs non connectés
    })


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Endpoint dédié pour récupérer le token CSRF
    Utile pour l'initialisation côté frontend
    Accepte GET et POST pour flexibilité
    """
    csrf_token = get_token(request)
    
    response = Response({
        'csrf_token': csrf_token
    })
    
    # S'assurer que le cookie est défini
    response.set_cookie(
        'csrftoken', 
        csrf_token,
        max_age=None,
        path='/',
        secure=False,  # True en production HTTPS
        httponly=False,  # Le frontend doit pouvoir le lire
        samesite='Lax'
    )
    
    return response


class SessionUserProfileView(APIView):
    """
    Vue pour consulter et modifier le profil utilisateur (version session)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Récupérer le profil de l'utilisateur connecté
        """
        serializer = UserProfileSerializer(request.user)
        return Response({
            'user': serializer.data,
            'authenticated': True
        })
    
    def put(self, request):
        """
        Modifier le profil de l'utilisateur connecté
        """
        from .serializers import UserProfileSerializer
        
        serializer = UserProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profil mis à jour avec succès.',
                'user': serializer.data,
                'authenticated': True
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def session_user_permissions(request):
    """
    Endpoint pour récupérer les permissions de l'utilisateur connecté (version session)
    """
    user = request.user
    permissions_data = {
        'role': user.role,
        'departement': user.departement,
        'permissions': {
            'can_create_dl': user.can_create_dl(),
            'can_validate_dl': user.can_validate_dl(),
            'can_create_engagement': user.can_create_engagement(),
        },
        'is_admin': user.is_admin,
        'is_demandeur': user.is_demandeur,
        'is_acheteur': user.is_acheteur,
        'authenticated': True
    }
    
    return Response(permissions_data)


class SessionRefreshView(APIView):
    """
    Endpoint pour rafraîchir la session utilisateur
    Avec Django sessions, le rafraîchissement est automatique,
    mais on peut forcer le renouvellement ici
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.is_authenticated:
            # Forcer la modification de la session pour la renouveler
            request.session.modified = True
            
            # Retourner les données utilisateur actualisées
            serializer = UserProfileSerializer(request.user)
            
            logger.info(f"Session rafraîchie pour l'utilisateur: {request.user.username}")
            
            return Response({
                'message': 'Session renouvelée avec succès.',
                'user': serializer.data,
                'authenticated': True
            })
        else:
            return Response({
                'error': 'Session expirée.',
                'authenticated': False
            }, status=status.HTTP_401_UNAUTHORIZED)