from rest_framework import permissions


class IsOwnerOrAcheteur(permissions.BasePermission):
    """
    Permission pour les propriétaires ou les acheteurs
    Utilisé pour les DL : le demandeur peut modifier ses propres DL,
    les acheteurs peuvent modifier toutes les DL
    """
    
    def has_object_permission(self, request, view, obj):
        # Lecture autorisée pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Admin a tous les droits
        if request.user.is_admin:
            return True
        
        # Acheteur peut modifier
        if request.user.is_acheteur:
            return True
        
        # Propriétaire peut modifier ses propres objets
        if hasattr(obj, 'demandeur'):
            return obj.demandeur == request.user
        
        return False


class CanCreateDL(permissions.BasePermission):
    """
    Permission pour créer des demandes de location
    Autorisé a tous les departements
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_create_dl()


class CanValidateDL(permissions.BasePermission):
    """
    Permission pour valider des demandes de location
    Autorisé aux ACHETEUR et ADMIN
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_validate_dl()


class CanCreateEngagement(permissions.BasePermission):
    """
    Permission pour créer des engagements
    Autorisé aux ACHETEUR et ADMIN
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_create_engagement()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission pour les propriétaires en lecture/écriture, autres en lecture seule
    """
    
    def has_object_permission(self, request, view, obj):
        # Lecture autorisée pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Admin a tous les droits
        if (request.user.is_admin | request.user.is_acheteur ):
            return True
        
        # Propriétaire peut modifier
        if hasattr(obj, 'demandeur'):
            return obj.demandeur == request.user
        
        if hasattr(obj, 'responsable'):
            return obj.responsable == request.user
        
        if hasattr(obj, 'responsable_pointage'):
            return obj.responsable_pointage == request.user
        
        return False


class DepartmentPermission(permissions.BasePermission):
    """
    Permission basée sur les départements
    Utilisé pour filtrer l'accès aux données par département
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin a accès à tout
        if user.is_admin:
            return True
        
        # Acheteur DAL peut accéder aux objets liés au département DAL
        if user.is_acheteur and user.departement == 'DAL':
            return True
        
        # Demandeur ne peut accéder qu'à ses propres objets
        if user.is_demandeur:
            if hasattr(obj, 'demandeur'):
                return obj.demandeur == user
            elif hasattr(obj, 'departement'):
                return obj.departement == user.departement
        
        return False


class ReadOnlyForDemandeur(permissions.BasePermission):
    """
    Les demandeurs ont accès en lecture seule,
    les acheteurs et admins peuvent modifier
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin et acheteur ont tous les droits
        if user.is_admin or user.is_acheteur:
            return True
        
        # Demandeur en lecture seule
        if user.is_demandeur:
            if request.method in permissions.SAFE_METHODS:
                # Vérifier que c'est son objet
                if hasattr(obj, 'demandeur'):
                    return obj.demandeur == user
                elif hasattr(obj, 'engagement') and hasattr(obj.engagement, 'mise_a_disposition'):
                    return obj.engagement.mise_a_disposition.demande_location.demandeur == user
            return False
        
        return False


class PointagePermission(permissions.BasePermission):
    """
    Permission spécifique pour les pointages
    - Demandeurs : lecture seule de leurs pointages
    - Acheteurs : lecture/écriture de leurs engagements
    - Admin : tous droits
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin a tous les droits
        if user.is_admin:
            return True
        
        # Acheteur peut gérer les pointages de ses engagements
        if user.is_acheteur:
            return obj.engagement.responsable == user
        
        # Demandeur peut voir ses pointages
        if user.is_demandeur:
            if request.method in permissions.SAFE_METHODS:
                return obj.engagement.mise_a_disposition.demande_location.demandeur == user
            return False
        
        return False