// store/materielsStore.js
import { create } from 'zustand';
import { materielsAPI } from '../services/materiels';

export const useMaterielsStore = create((set, get) => ({
  materiels: [],
  materiel: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  // Lister les matériels
  fetchMateriels: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await materielsAPI.list(params);
      set({
        materiels: response.data.results || response.data,
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

  // Récupérer un matériel
  getMateriel: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await materielsAPI.get(id);
      set({
        materiel: response.data,
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

  // Créer un matériel
  createMateriel: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await materielsAPI.create(data);
      set((state) => ({
        materiels: [response.data, ...state.materiels],
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

  // Mettre à jour un matériel
  updateMateriel: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await materielsAPI.update(id, data);
      set((state) => ({
        materiels: state.materiels.map(m =>
          m.id === id ? response.data : m
        ),
        materiel: response.data,
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

  // Supprimer un matériel
  deleteMateriel: async (id) => {
    set({ loading: true, error: null });
    try {
      await materielsAPI.delete(id);
      set((state) => ({
        materiels: state.materiels.filter(m => m.id !== id),
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

  // Matériels par type
  fetchMaterielsByType: async (type) => {
    try {
      const response = await materielsAPI.byType(type);
      return { success: true, data: response.data.results || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Réinitialiser les erreurs
  clearError: () => set({ error: null }),

  // Réinitialiser le matériel sélectionné
  clearMateriel: () => set({ materiel: null }),
}));
