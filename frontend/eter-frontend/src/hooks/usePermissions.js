import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
  const { user } = useAuthStore();

  return {
    // Permissions de base
    canCreateDL: user?.permissions?.can_create_dl || false,
    canValidateDL: user?.permissions?.can_validate_dl || false,
    canCreateEngagement: user?.permissions?.can_create_engagement || false,
    
    // Permissions dérivées
    isAdmin: user?.role === 'ADMIN',
    isAcheteur: user?.role === 'ACHETEUR',
    isDemandeur: user?.role === 'DEMANDEUR',
    
    // Permissions combinées
    canManageMAD: user?.permissions?.can_validate_dl || user?.permissions?.can_create_engagement || false,
    canManageEngagements: user?.permissions?.can_create_engagement || false,
    canManagePointages: user?.permissions?.can_create_engagement || false,
    
    // Permissions par département
    departement: user?.departement,
    
    // Vérifier si l'utilisateur peut accéder à une ressource
    canAccessResource: (resource, action = 'read') => {
      switch (resource) {
        case 'demandes':
          if (action === 'create') return user?.permissions?.can_create_dl;
          if (action === 'validate') return user?.permissions?.can_validate_dl;
          return true; // Tout le monde peut voir ses demandes
          
        case 'mises-a-disposition':
          if (action === 'create') return user?.permissions?.can_validate_dl;
          if (action === 'edit') return user?.permissions?.can_validate_dl;
          return true; // Tout le monde peut voir les MAD de ses demandes
          
        case 'engagements':
          if (action === 'create') return user?.permissions?.can_create_engagement;
          if (action === 'edit') return user?.permissions?.can_create_engagement;
          return user?.permissions?.can_create_engagement || user?.permissions?.can_create_dl;
          
        case 'pointages':
          return user?.permissions?.can_create_engagement || user?.permissions?.can_create_dl;
          
        case 'fournisseurs':
          if (action === 'create' || action === 'edit') return user?.permissions?.can_validate_dl;
          return user?.permissions?.can_validate_dl || user?.permissions?.can_create_engagement;
          
        case 'materiels':
          if (action === 'create' || action === 'edit') return user?.permissions?.can_create_dl;
          return true; // Tout le monde peut voir les matériels
          
        default:
          return false;
      }
    },
    
    // Informations utilisateur
    user
  };
};
