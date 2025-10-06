import api from './api';

export const pointagesAPI = {
  // Fiches de pointage
  listFiches: (params = {}) => api.get('/fiches-pointage/', { params }),
  getFiche: (id) => api.get(`/fiches-pointage/${id}/`),
  createFiche: (data) => api.post('/fiches-pointage/', data),
  updateFiche: (id, data) => api.patch(`/fiches-pointage/${id}/`, data),
  deleteFiche: (id) => api.delete(`/fiches-pointage/${id}/`),
  
  // Pointages journaliers
  listPointages: (params = {}) => api.get('/pointages-journaliers/', { params }),
  getPointage: (id) => api.get(`/pointages-journaliers/${id}/`),
  createPointageJournalier: (data) => api.post('/pointages-journaliers/', data),
  updatePointageJournalier: (id, data) => api.patch(`/pointages-journaliers/${id}/`, data),
  deletePointageJournalier: (id) => api.delete(`/pointages-journaliers/${id}/`),
  
  // Actions spécifiques
  materielsDisponibles: (engagementId) => api.get(`/fiches-pointage/materiels_disponibles/?engagement_id=${engagementId}`),
  creerPointagesPeriode: (ficheId) => api.post(`/fiches-pointage/${ficheId}/creer-pointages-periode/`),
  creationGroupee: (data) => api.post('/pointages-journaliers/creation-groupee/', data),
  rapportMensuel: (mois) => api.get(`/pointages-journaliers/rapport_mensuel/?mois=${mois}`),
  // rapportMensuel: (mois) => api.get(`/pointages-journaliers/rapport-mensuel/?mois=${mois}`),
  
  getEngagementsActifs: () => api.get('/engagements/'),

  getFicheForPDF: (id) => api.get(`/fiches-pointage/${id}/pdf_data/`),

  // Vérifications
  listVerifications: (params = {}) => api.get('/verification-pointage/', { params }),
  createVerification: (data) => api.post('/verification-pointage/', data),
};
