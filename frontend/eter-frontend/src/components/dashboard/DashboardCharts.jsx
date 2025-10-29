import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { usePointagesStore } from '../../store/pointagesStore';
import { pointagesAPI } from '../../services/pointages';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const DashboardCharts = () => {
  const { fichesPointage, fetchFichesPointage } = usePointagesStore();

  useEffect(() => {
    // Charger les fiches de pointage pour les graphiques
    fetchFichesPointage({ page_size: 100 }); // Récupérer suffisamment de données
  }, [fetchFichesPointage]);

  // 🔥 Calculer les données pour les graphiques à partir des fiches de pointage
  const heuresData = () => {
    // Grouper les données par chantier ou engagement
    const grouped = fichesPointage.reduce((acc, fiche) => {
      const chantier = fiche.chantier || fiche.engagement?.numero || 'Inconnu';
      if (!acc[chantier]) {
        acc[chantier] = { prevues: 0, reelles: 0 };
      }
      acc[chantier].prevues += fiche.total_heures_prevues || 0;
      acc[chantier].reelles += fiche.total_heures_travail || 0;
      return acc;
    }, {});

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Heures Planifiées',
          data: Object.values(grouped).map(g => g.prevues),
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
        },
        {
          label: 'Heures Réelles',
          data: Object.values(grouped).map(g => g.reelles),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
        },
      ],
    };
  };

  const budgetData = () => {
    // Ici, vous pourriez grouper par période (ex: semaine ou mois) et cumuler les budgets
    // Pour simplifier, on va simuler des données basées sur les engagements
    const engagements = {};
    fichesPointage.forEach(fiche => {
      const engagement = fiche.engagement?.numero || 'Inconnu';
      if (!engagements[engagement]) {
        engagements[engagement] = { prevu: 0, reel: 0 };
      }
      // Ici, vous pourriez avoir des montants prévus et réels par engagement
      engagements[engagement].prevu += fiche.montant_total_calcule || 0;
      engagements[engagement].reel += fiche.montant_total_calcule || 0; // Pour l'exemple, même valeur
    });

    const labels = Object.keys(engagements);
    const prevu = Object.values(engagements).map(e => e.prevu);
    const reel = Object.values(engagements).map(e => e.reel);

    return {
      labels,
      datasets: [
        {
          label: 'Budget Prévu',
          data: prevu,
          borderColor: 'rgba(37, 99, 235, 0.8)',
          fill: false,
        },
        {
          label: 'Dépenses Réelles',
          data: reel,
          borderColor: 'rgba(16, 185, 129, 0.8)',
          fill: false,
        },
      ],
    };
  };

  const heuresOptions = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Heures',
        },
      },
    },
  };

  const budgetOptions = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Budget (MRU)',
        },
      },
    },
  };

  return (
    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
      <div style={{ flex: 1, height: '300px' }}>
        <h3>Heures Planifiées vs Réelles</h3>
        <Bar data={heuresData()} options={heuresOptions} />
      </div>
      <div style={{ flex: 1, height: '300px' }}>
        <h3>Budget Prévu vs Réel</h3>
        <Line data={budgetData()} options={budgetOptions} />
      </div>
    </div>
  );
};

export default DashboardCharts;