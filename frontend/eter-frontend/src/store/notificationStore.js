// store/notificationStore.js
import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  expiredCount: 0,
  criticalCount: 0,
  urgentCount: 0,
  totalCount: 0,
  loading: false,
  error: null,

  // Fetch notifications (engagements expirants)
  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { engagementsAPI } = await import('../services/engagements');

      const result = await engagementsAPI.expirantBientot();
      const engagements = result.data.results || result.data || [];

      const expiredCount = engagements.filter(e => {
        const joursRestants = getJoursRestants(e.date_fin);
        return joursRestants < 0;
      }).length;

      const criticalCount = engagements.filter(e => {
        const joursRestants = getJoursRestants(e.date_fin);
        return joursRestants >= 0 && joursRestants <= 7;
      }).length;

      const urgentCount = engagements.filter(e => {
        const joursRestants = getJoursRestants(e.date_fin);
        return joursRestants > 7 && joursRestants <= 15;
      }).length;
      
      const totalCount = engagements.length;

      set({
        notifications: engagements,
        expiredCount,
        criticalCount,
        urgentCount,
        totalCount,
        loading: false
      });
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      set({
        error: error.response?.data?.message || error.message || 'Erreur lors du chargement des notifications',
        loading: false
      });
    }
  },

  // Clear notifications
  clearNotifications: () => set({
    notifications: [],
    expiredCount: 0,
    criticalCount: 0,
    urgentCount: 0,
    totalCount: 0
  }),

  // Clear error
  clearError: () => set({ error: null }),
}));

// Helper function to calculate jours restants
const getJoursRestants = (dateFin) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for consistent comparison
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999); // Set to end of day for dateFin
  return Math.ceil((fin - today) / (1000 * 60 * 60 * 24));
};