import { create } from 'zustand';
import { pointagesAPI } from '../services/pointages';

export const usePointagesStore = create((set, get) => ({
  fichesPointage: [],
  pointagesJournaliers: [],
  loading: false,
  fichePointage: null,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  // === Fiches de pointage ===
  fetchFichesPointage: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.listFiches(params);
      set({ 
        fichesPointage: response.data.results,
        pagination: {
          current: params.page || 1,
          pageSize: params.page_size || 10,
          total: response.data.count,
        },
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false 
      });
    }
  },

  getFichePointage: async (id) => {
    set({ loading: true, error: null , fichePointage: null,});
    try {
    const response = await pointagesAPI.getFiche(id);
    set({ loading: false, fichePointage: response.data });
    return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  createFiche: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.createFiche(data);
      set((state) => ({ 
        fichesPointage: [response.data, ...state.fichesPointage],
        loading: false 
      }));
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la création',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  updateFiche: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.updateFiche(id, data);
      set((state) => ({
        fichesPointage: state.fichesPointage.map(f => 
          f.id === id ? response.data : f
        ),
        loading: false
      }));
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la modification',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  deleteFiche: async (id) => {
    set({ loading: true, error: null });
    try {
      await pointagesAPI.deleteFiche(id);
      set((state) => ({
        fichesPointage: state.fichesPointage.filter(f => f.id != id),
        loading: false
      }));
      return { success: true };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la suppression',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  creerPointagesPeriode: async (ficheId) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.creerPointagesPeriode(ficheId);
      set({ loading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la création de la période',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  // === Pointages journaliers ===
  fetchPointagesJournaliers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.listPointages(params);
      set({ 
        pointagesJournaliers: response.data.results,
        pagination: {
          current: params.page || 1,
          pageSize: params.page_size || 10,
          total: response.data.count,
        },
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false 
      });
    }
  },

  createPointageJournalier: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.createPointageJournalier(data);
      set((state) => ({ 
        pointagesJournaliers: [response.data, ...state.pointagesJournaliers],
        loading: false 
      }));
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la création',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  updatePointageJournalier: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.updatePointageJournalier(id, data);
      set((state) => ({
        pointagesJournaliers: state.pointagesJournaliers.map(p => 
          p.id === id ? response.data : p
        ),
        loading: false
      }));
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la mise à jour',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  deletePointageJournalier: async (id) => {
    set({ loading: true, error: null });
    try {
      await pointagesAPI.deletePointageJournalier(id);
      set((state) => ({
        pointagesJournaliers: state.pointagesJournaliers.filter(p => p.id != id),
        loading: false
      }));
      return { success: true };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la suppression',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  getPointageJournalier: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.getPointage(id);
      set({ loading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  createPointagesGroupes: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.creationGroupee(data);
      const { fetchPointagesJournaliers } = get();
      await fetchPointagesJournaliers({ fiche_pointage: data.fiche_pointage_id });
      
      set({ loading: false });
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la création groupée',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  clearError: () => set({ error: null }),
}));