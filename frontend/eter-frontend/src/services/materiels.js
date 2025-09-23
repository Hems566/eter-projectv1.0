import api from './api';

export const materielsAPI = {
  // Lister tous les matériels actifs
  list: (params = {}) => api.get('/materiels-location/', { params }),
  
  // Détail d'un matériel
  get: (id) => api.get(`/materiels-location/${id}/`),
  
  // Créer un matériel (admin seulement)
  create: (data) => api.post('/materiels-location/', data),
  
  // Modifier un matériel
  update: (id, data) => api.patch(`/materiels-location/${id}/`, data),
  
  // Supprimer un matériel
  delete: (id) => api.delete(`/materiels-location/${id}/`),
  
  // Matériels par type
  byType: (type) => api.get('/materiels-location/', { 
    params: { type_materiel: type } 
  }),
};
