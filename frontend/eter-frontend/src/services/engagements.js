import api from './api';

export const engagementsAPI = {
  list: (params = {}) => api.get('/engagements/', { params }),
  get: (id) => api.get(`/engagements/${id}/`),
  create: (data) => api.post('/engagements/', data),
  update: (id, data) => api.patch(`/engagements/${id}/`, data),
  delete: (id) => api.delete(`/engagements/${id}/`),
  
  // Actions spécifiques
  misesADispositionDisponibles: () => api.get('/engagements/mises_a_disposition_disponibles/'),
  expirantBientot: () => api.get('/engagements/expirant-bientot/'),
  expires: () => api.get('/engagements/expires/'),
  fichesPointage: (id) => api.get(`/engagements/${id}/fiches-pointage/`),
  statistiques: () => api.get('/engagements/statistiques/'),
  actifs: (params = {}) => {
    const today = new Date().toISOString().split('T')[0];
    return api.get('/engagements/', { 
      params: {
        date_fin__gte: today, // Filtrer les engagements non expirés
        page_size: 100,
        ...params
      }
    });
  },
};