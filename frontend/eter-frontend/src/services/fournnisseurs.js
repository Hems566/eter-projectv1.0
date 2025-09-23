import api from './api';

export const fournisseursAPI = {
  list: (params = {}) => api.get('/fournisseurs/', { params }),
  get: (id) => api.get(`/fournisseurs/${id}/`),
  create: (data) => api.post('/fournisseurs/', data),
  update: (id, data) => api.patch(`/fournisseurs/${id}/`, data),
  delete: (id) => api.delete(`/fournisseurs/${id}/`),
  
  // Recherche de fournisseurs actifs
  actifs: (search = '') => api.get('/fournisseurs/', { 
    params: { 
      actif: true,
      search: search
    }
  }),
};
