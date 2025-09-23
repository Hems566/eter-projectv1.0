import { create } from 'zustand';
import { misesADispositionAPI } from '../services/misesADisposition';

export const useMisesADispositionStore = create((set, get) => ({
  misesADisposition: [],
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
}));
