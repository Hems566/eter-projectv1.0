import { create } from 'zustand';
import { engagementsAPI } from '../services/engagements';

export const useEngagementsStore = create((set, get) => ({
  engagements: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },

  fetchEngagements: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await engagementsAPI.list(params);
      set({ 
        engagements: response.data.results,
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
}));