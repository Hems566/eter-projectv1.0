import { create } from 'zustand';
import { demandesAPI } from '../services/demandes';

export const useDemandesStore = create((set, get) => ({
  demandes: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  fetchDemandes: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await demandesAPI.list(params);
      set({ 
        demandes: response.data.results,
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

  createDemande: async (data) => {
    set({ loading: true, error: null });
    try {
      console.log('Store - Envoi des données:', data);
      const response = await demandesAPI.create(data);
      console.log('Store - Réponse reçue:', response.data);
      set((state) => ({ 
        demandes: [response.data, ...state.demandes],
        loading: false 
      }));
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Store - Erreur complète:', error);
      console.error('Store - Réponse erreur:', error.response?.data);
      set({ 
        error: error.response?.data || 'Erreur lors de la création',
        loading: false 
      });
      return { success: false, error: error.response?.data };
    }
  },

  updateDemande: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await demandesAPI.update(id, data);
      set((state) => ({
        demandes: state.demandes.map(d => 
          d.id === id ? response.data : d
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
}));
