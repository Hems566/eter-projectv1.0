import { create } from 'zustand';
import { misesADispositionAPI } from '../services/misesADisposition';

export const useMisesADispositionStore = create((set, get) => ({
  misesADisposition: [],
  currentMiseADisposition: null, // <-- pour stocker l'élément en cours d'édition
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  fetchMisesADisposition: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await misesADispositionAPI.list(params);
      set({ 
        misesADisposition: response.data.results,
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

  // 🔹 Nouvelle méthode : récupérer une MAD par ID
  fetchMiseADispositionById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await misesADispositionAPI.get(id);
      set({ 
        currentMiseADisposition: response.data,
        loading: false 
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false,
        currentMiseADisposition: null
      });
      return { success: false, error: error.response?.data };
    }
  },

  // 🔹 Méthode de mise à jour
  updateMiseADisposition: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await misesADispositionAPI.update(id, data);
      // Mettre à jour la liste si nécessaire
      const updated = response.data;
      set((state) => ({
        misesADisposition: state.misesADisposition.map(m => m.id === id ? updated : m),
        currentMiseADisposition: updated,
        loading: false
      }));
      return { success: true, data: updated };
    } catch (error) {
      set({ 
        error: error.response?.data || 'Erreur lors de la mise à jour',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  createMiseADisposition: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await misesADispositionAPI.create(data);
      set((state) => ({ 
        misesADisposition: [response.data, ...state.misesADisposition],
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

  // 🔹 Nettoyer l'élément courant (utile au démontage)
  clearCurrentMiseADisposition: () => set({ currentMiseADisposition: null }),
}));