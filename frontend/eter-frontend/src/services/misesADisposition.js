import api from './api';

export const misesADispositionAPI = {
  list: (params = {}) => api.get('/mises-a-disposition/', { params }),
  get: (id) => api.get(`/mises-a-disposition/${id}/`),
  create: (data) => api.post('/mises-a-disposition/', data),
  update: (id, data) => api.patch(`/mises-a-disposition/${id}/`, data),
  delete: (id) => api.delete(`/mises-a-disposition/${id}/`),
  
  // Actions spécifiques
  demandesDisponibles: () => api.get('/mises-a-disposition/demandes-disponibles/'),
  fournisseursActifs: () => api.get('/mises-a-disposition/fournisseurs-actifs/'),
  marquerConforme: (id, data) => api.post(`/mises-a-disposition/${id}/marquer-conforme/`, data),
  materiels: (id) => api.get(`/mises-a-disposition/${id}/materiels/`),
  statistiques: () => api.get('/mises-a-disposition/statistiques/'),
};
