// import { create } from 'zustand';
// import { pointagesAPI } from '../services/pointages';

// export const usePointagesStore = create((set, get) => ({
//   fichesPointage: [],
//   pointagesJournaliers: [],
//   loading: false,
//   error: null,
//   pagination: {
//     current: 1,
//     pageSize: 10,
//     total: 0,
//   },

//   fetchFichesPointage: async (params = {}) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await pointagesAPI.listFiches(params);
//       set({ 
//         fichesPointage: response.data.results,
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

//   fetchPointagesJournaliers: async (params = {}) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await pointagesAPI.listPointages(params);
//       set({ 
//         pointagesJournaliers: response.data.results,
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

//   createFiche: async (data) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await pointagesAPI.createFiche(data);
//       set((state) => ({ 
//         fichesPointage: [response.data, ...state.fichesPointage],
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
//   createPointageJournalier: async (data) => {
//     set({ loading: true, error: null });
//     try {
//       const response = await pointageJournalierAPI.create(data);
//       set((state) => ({ 
//         pointages: [response.data, ...state.pointages],
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

import { create } from 'zustand';
import { pointagesAPI } from '../services/pointages';

export const usePointagesStore = create((set, get) => ({
  fichesPointage: [],
  pointagesJournaliers: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

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

  // ✅ Correction ici : utiliser pointagesAPI au lieu de pointageJournalierAPI
  createPointageJournalier: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.createPointageJournalier(data);
      set((state) => ({ 
        pointagesJournaliers: [response.data, ...state.pointagesJournaliers], // ✅ Correction : pointagesJournaliers au lieu de pointages
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

  // ✅ Ajout de méthodes utiles
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
        pointagesJournaliers: state.pointagesJournaliers.filter(p => p.id !== id),
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

  // ✅ Méthode pour récupérer un pointage spécifique
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

  // ✅ Méthode pour la création groupée
  createPointagesGroupes: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await pointagesAPI.creationGroupee(data);
      // Recharger les pointages après création groupée
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

  // ✅ Réinitialiser les erreurs
  clearError: () => set({ error: null }),
}));
