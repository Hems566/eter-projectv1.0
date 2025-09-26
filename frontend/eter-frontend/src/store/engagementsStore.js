// store/engagementsStore.js
import { create } from 'zustand';
import { engagementsAPI } from '../services/engagements';

export const useEngagementsStore = create((set, get) => ({
  engagements: [],
  engagement: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  statistiques: null,

  // Lister les engagements
  fetchEngagements: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await engagementsAPI.list(params);
      set({
        engagements: response.data.results || response.data,
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

  // Récupérer un engagement
  getEngagement: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await engagementsAPI.get(id);
      set({
        engagement: response.data,
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

  // Créer un engagement
  createEngagement: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await engagementsAPI.create(data);
      set((state) => ({
        engagements: [response.data, ...state.engagements],
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

  // Mettre à jour un engagement
  updateEngagement: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await engagementsAPI.update(id, data);
      set((state) => ({
        engagements: state.engagements.map(e =>
          e.id === id ? response.data : e
        ),
        engagement: response.data,
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

  // Supprimer un engagement
  deleteEngagement: async (id) => {
    set({ loading: true, error: null });
    try {
      await engagementsAPI.delete(id);
      set((state) => ({
        engagements: state.engagements.filter(e => e.id !== id),
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

  // Engagements actifs
  fetchEngagementsActifs: async (params = {}) => {
    try {
      const response = await engagementsAPI.actifs(params);
      return { success: true, data: response.data.results || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Engagements expirant bientôt
  fetchEngagementsExpirants: async () => {
    try {
      const response = await engagementsAPI.expirantBientot();
      return { success: true, data: response.data.results || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Statistiques
  fetchStatistiques: async () => {
    try {
      const response = await engagementsAPI.statistiques();
      set({ statistiques: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Fiches de pointage d'un engagement
  getFichesPointage: async (id) => {
    try {
      const response = await engagementsAPI.fichesPointage(id);
      return { success: true, data: response.data.results || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  // Réinitialiser les erreurs
  clearError: () => set({ error: null }),

  // Réinitialiser l'engagement sélectionné
  clearEngagement: () => set({ engagement: null }),
}));


// import { create } from 'zustand';
// import { engagementsAPI } from '../services/engagements';

// export const useEngagementsStore = create((set, get) => ({
//   engagements: [],
//   loading: false,
//   error: null,
//   pagination: {
//     current: 1,
//     pageSize: 10,
//     total: 0,
//   },

//   fetchEngagements: async (params = {}) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await engagementsAPI.list(params);
//       set({ 
//         engagements: response.data.results,
//         pagination: {
//           current: params.page || 1,
//           pageSize: params.page_size || 10,
//           total: response.data.count,
//         },
//         loading: false 
//       });
//     } catch (error) {
//       set({ 
//         error: error.response?.data?.message || 'Erreur lors du chargement',
//         loading: false 
//       });
//     }
//   },

//   createEngagement: async (data) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await engagementsAPI.create(data);
//       set((state) => ({ 
//         engagements: [response.data, ...state.engagements],
//         loading: false 
//       }));
//       return { success: true, data: response.data };
//     } catch (error) {
//       set({ 
//         error: error.response?.data || 'Erreur lors de la création',
//         loading: false 
//       });
//       return { success: false, error: error.response?.data };
//     }
//   },
// }));