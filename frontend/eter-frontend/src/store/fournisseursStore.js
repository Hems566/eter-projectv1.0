// store/fournisseursStore.js
import { create } from 'zustand';
import { fournisseursAPI } from '../services/fournisseurs';

export const useFournisseursStore = create((set, get) => ({
  fournisseurs: [],
  fournisseur: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  // Lister les fournisseurs
  fetchFournisseurs: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await fournisseursAPI.list(params);
      console.log('Raw API response:', response.data);
      set({
        fournisseurs: response.data.results || response.data,
        pagination: response.data.count ? {
          current: params.page || 1,
          pageSize: params.page_size || 10,
          total: response.data.count,
        } : get().pagination,
        loading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false
      });
      return { success: false, error: error.response?.data };
    }
  },

  // Récupérer un fournisseur
  getFournisseur: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fournisseursAPI.get(id);
      set({
        fournisseur: response.data,
        loading: false
      });
      return { success: true, data: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Erreur lors du chargement',
        loading: false
      });
      return { success: false, error: error.response?.data };
    }
  },

  // Créer un fournisseur
  createFournisseur: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await fournisseursAPI.create(data);
      set((state) => ({
        fournisseurs: [response.data, ...state.fournisseurs],
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

  // Mettre à jour un fournisseur
  updateFournisseur: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await fournisseursAPI.update(id, data);
      set((state) => ({
        fournisseurs: state.fournisseurs.map(f =>
          f.id === id ? response.data : f
        ),
        fournisseur: response.data,
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

  // Supprimer un fournisseur
  deleteFournisseur: async (id) => {
    set({ loading: true, error: null });
    try {
      await fournisseursAPI.delete(id);
      set((state) => ({
        fournisseurs: state.fournisseurs.filter(f => f.id !== id),
        loading: false
      }));
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Erreur lors de la suppression',
        loading: false
      });
      return { success: false, error: error.response?.data };
    }
  },

  // Rechercher fournisseurs actifs
  searchFournisseursActifs: async (search = '') => {
    try {
      const response = await fournisseursAPI.actifs(search);
      return { success: true, data: response.data.results || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Réinitialiser les erreurs
  clearError: () => set({ error: null }),

  // Réinitialiser le fournisseur sélectionné
  clearFournisseur: () => set({ fournisseur: null }),
}));
