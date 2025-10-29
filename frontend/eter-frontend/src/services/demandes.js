import api from './api';

export const demandesAPI = {
  // Lister les demandes avec filtres
  list: (params = {}) => api.get('/demandes-location/', { params }),
  
  // Créer une demande
  create: (data) => api.post('/demandes-location/', data),
  
  // Détail d'une demande
  get: (id) => api.get(`/demandes-location/${id}/`),
  
  // Modifier une demande
  update: (id, data) => api.patch(`/demandes-location/${id}/`, data),
  
  // Supprimer une demande
  delete: (id) => api.delete(`/demandes-location/${id}/`),
  
  // Actions sur les demandes
  soumettre: (id) => api.post(`/demandes-location/${id}/soumettre/`),
  retirerSoumission: (id) => api.post(`/demandes-location/${id}/retirer-soumission/`),
  valider: (id, data) => api.post(`/demandes-location/${id}/valider/`, data),

  // Statistiques globales pour le dashboard
  stats: () => api.get('/dashboard/stats/'),

  // Vues spécifiques pour l'utilisateur
  mesdemandes: () => api.get('/demandes-location/mes_demandes/'),
  enAttenteValidation: () => api.get('/demandes-location/en_attente_validation/'),

  // Matériels disponibles pour la création de demande
  materiels: () => api.get('/materiels-location/'),
};
