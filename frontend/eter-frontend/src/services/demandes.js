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
  
  // Valider une demande
  
  soumettre: (id) => api.post(`/demandes-location/${id}/soumettre/`),
  
  retirerSoumission: (id) => api.post(`/demandes-location/${id}/retirer-soumission/`),
  
  valider: (id, data) => api.post(`/demandes-location/${id}/valider/`, data),
  // Statistiques
  stats: () => api.get('/demandes-location/statistiques/'),
  mesdemandes: () => api.get('/demandes-location/mes_demandes/'),
  enAttenteValidation: () => api.get('/demandes-location/en_attente_validation/'),
  statistiques: () => api.get('/demandes-location/statistiques/'),
  // Matériels disponibles
  materiels: () => api.get('/materiels-location/'),
};
