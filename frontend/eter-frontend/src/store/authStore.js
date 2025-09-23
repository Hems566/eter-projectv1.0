import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false,

      // Initialiser l'authentification au démarrage
      initAuth: async () => {
        try {
          const response = await api.get('/auth/status/');
          if (response.data.authenticated) {
            set({ 
              user: response.data.user, 
              isAuthenticated: true 
            });
          }
        } catch (error) {
          console.log('Pas de session active');
          set({ user: null, isAuthenticated: false });
        }
      },

      login: async (credentials) => {
        set({ loading: true });
        try {
          const response = await api.post('/auth/login/', credentials);
          const { user } = response.data;
          
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
          
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return { 
            success: false, 
            error: error.response?.data?.error || 'Erreur de connexion' 
          };
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout/');
        } catch (error) {
          console.error('Erreur lors de la déconnexion:', error);
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        try {
          const response = await api.get('/auth/status/');
          if (response.data.authenticated) {
            set({ 
              user: response.data.user, 
              isAuthenticated: true 
            });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        // Ne pas persister les données sensibles, juste l'état
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
