from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from .serializers import (
    CustomTokenObtainPairSerializer, 
    UserRegistrationSerializer, 
    UserProfileSerializer,
    PasswordChangeSerializer
)
from .models import CustomUser


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour l'obtention de tokens JWT avec informations utilisateur
    """
    serializer_class = CustomTokenObtainPairSerializer


class UserRegistrationView(APIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur
    Accessible uniquement aux administrateurs
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Vérifier que l'utilisateur est admin
        if not request.user.is_admin and not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent créer des utilisateurs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'Utilisateur créé avec succès.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'departement': user.departement
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    Vue pour consulter et modifier le profil utilisateur
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Récupérer le profil de l'utilisateur connecté
        """
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """
        Modifier le profil de l'utilisateur connecté
        """
        serializer = UserProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profil mis à jour avec succès.',
                'user': serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """
    Vue pour changer le mot de passe de l'utilisateur
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Mot de passe changé avec succès.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================
# NOUVEAUX ENDPOINTS POUR AUTHENTIFICATION HTTPONLY COOKIES
# =============================================

@method_decorator(csrf_exempt, name='dispatch')
class SecureLoginView(APIView):
    """
    Vue de connexion sécurisée avec cookies httpOnly
    Remplace l'authentification JWT par des sessions Django
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
                # Connexion avec session Django (cookies httpOnly automatiques)
                login(request, user)
                
                # Sérialiser les données utilisateur
                serializer = UserProfileSerializer(user)
                
                # Définir un token CSRF pour les requêtes futures si nécessaire
                csrf_token = get_token(request)
                
                response = Response({
                    'message': 'Connexion réussie.',
                    'user': serializer.data
                }, status=status.HTTP_200_OK)
                
                # Optionnel : Ajouter le token CSRF en header
                response['X-CSRFToken'] = csrf_token
                
                return response
            else:
                return Response({
                    'error': 'Compte désactivé.'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                'error': 'Identifiants invalides.'
            }, status=status.HTTP_401_UNAUTHORIZED)


class SecureLogoutView(APIView):
    """
    Vue de déconnexion sécurisée qui nettoie les cookies de session
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            # Déconnexion Django (nettoie automatiquement les cookies de session)
            logout(request)
            
            response = Response({
                'message': 'Déconnexion réussie.'
            }, status=status.HTTP_200_OK)
            
            # S'assurer que les cookies sont nettoyés côté client
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')
            
            return response
            
        except Exception as e:
            return Response({
                'error': 'Erreur lors de la déconnexion.'
            }, status=status.HTTP_400_BAD_REQUEST)


class SecureAuthStatusView(APIView):
    """
    Endpoint optimisé pour vérifier l'authentification avec cookies httpOnly
    Supporte la mise en cache intelligente côté client
    """
    permission_classes = [permissions.AllowAny]  # On vérifie manuellement
    
    def get(self, request):
        if request.user.is_authenticated:
            # Utilisateur authentifié via session cookie
            serializer = UserProfileSerializer(request.user)
            
            # Ajouter des headers de cache pour optimiser les performances
            response = Response({
                'authenticated': True,
                'user': serializer.data
            })
            
            # Cache de 5 minutes côté navigateur
            response['Cache-Control'] = 'private, max-age=300'
            
            return response
        else:
            # Utilisateur non authentifié
            response = Response({
                'authenticated': False,
                'user': None
            }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Pas de cache pour les réponses non authentifiées
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            
            return response


class SecureRefreshView(APIView):
    """
    Endpoint pour rafraîchir la session (renouvelage automatique)
    Avec les sessions Django, c'est géré automatiquement mais on peut
    étendre la durée de la session si nécessaire
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.is_authenticated:
            # La session est automatiquement renouvelée par Django
            # On peut forcer la mise à jour ici si besoin
            request.session.modified = True
            
            serializer = UserProfileSerializer(request.user)
            
            return Response({
                'message': 'Session renouvelée.',
                'user': serializer.data
            })
        else:
            return Response({
                'error': 'Session expirée.'
            }, status=status.HTTP_401_UNAUTHORIZED)


# =============================================
# VUES JWT LEGACY (gardées pour compatibilité)
# =============================================

class LogoutView(APIView):
    """
    Vue pour la déconnexion (blacklist du refresh token)
    LEGACY - Utilisez SecureLogoutView à la place
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'message': 'Déconnexion réussie.'
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'error': 'Erreur lors de la déconnexion.'
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_permissions(request):
    """
    Endpoint pour récupérer les permissions de l'utilisateur connecté
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
    }
    
    return Response(permissions_data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def users_list(request):
    """
    Liste des utilisateurs (accessible aux admin seulement)
    """
    if not request.user.is_admin and not request.user.is_staff:
        return Response(
            {'error': 'Accès non autorisé.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    users = CustomUser.objects.all().order_by('-date_joined')
    serializer = UserProfileSerializer(users, many=True)
    
    return Response({
        'count': users.count(),
        'users': serializer.data
    })


@api_view(['GET'])
def auth_status(request):
    """
    Endpoint public pour vérifier le statut d'authentification
    LEGACY - Utilisez SecureAuthStatusView à la place
    """
    if request.user.is_authenticated:
        serializer = UserProfileSerializer(request.user)
        return Response({
            'authenticated': True,
            'user': serializer.data
        })
    
    return Response({
        'authenticated': False,
        'user': None
    })