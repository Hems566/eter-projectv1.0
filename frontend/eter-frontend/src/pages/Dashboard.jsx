import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Alert,
  Typography,
  Spin,
  Avatar,
} from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ContainerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Bar, Line as ChartjsLine } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { demandesAPI } from '../services/demandes';
import { pointagesAPI } from '../services/pointages';
import NotificationPanel from '../components/dashboard/NotificationPanel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend
);

const { Title: AntTitle, Text, Paragraph } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({});
  const [recentDemandes, setRecentDemandes] = useState([]);
  const [fichesPointage, setFichesPointage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadFichesPointage();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsResponse = await demandesAPI.stats();
      setStats(statsResponse.data);
      const demandesResponse = await demandesAPI.list({ page_size: 5, ordering: '-created_at' });
      setRecentDemandes(demandesResponse.data.results);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFichesPointage = async () => {
    setLoadingCharts(true);
    try {
      const response = await pointagesAPI.listFiches({ page_size: 100 });
      setFichesPointage(response.data.results || []);
    } catch (error) {
      console.error('Erreur chargement fiches pointage:', error);
      setFichesPointage([]);
    } finally {
      setLoadingCharts(false);
    }
  };

  const heuresData = useMemo(() => {
    if (!fichesPointage.length) return { labels: [], datasets: [] };

    const grouped = fichesPointage.reduce((acc, fiche) => {
      const label = fiche.chantier || fiche.engagement?.numero || 'Inconnu';
      if (!acc[label]) {
        acc[label] = { prevues: 0, reelles: 0 };
      }
      acc[label].prevues += fiche.total_heures_prevues || 0;
      acc[label].reelles += fiche.total_heures_travail || 0;
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
  }, [fichesPointage]);

  const budgetData = useMemo(() => {
    if (!fichesPointage.length) return { labels: [], datasets: [] };

    const grouped = fichesPointage.reduce((acc, fiche) => {
      const engagement = fiche.engagement?.numero || 'Inconnu';
      if (!acc[engagement]) {
        acc[engagement] = { prevu: 0, reel: 0 };
      }
      acc[engagement].prevu += fiche.budget_prevu || fiche.montant_total_calcule || 0;
      acc[engagement].reel += fiche.montant_total_calcule || 0;
      return acc;
    }, {});

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Budget Prévu',
          data: Object.values(grouped).map(g => g.prevu),
          borderColor: 'rgba(37, 99, 235, 0.8)',
          fill: false,
        },
        {
          label: 'Dépenses Réelles',
          data: Object.values(grouped).map(g => g.reel),
          borderColor: 'rgba(16, 185, 129, 0.8)',
          fill: false,
        },
      ],
    };
  }, [fichesPointage]);

  const heuresOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Heures Planifiées vs Réelles' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
    },
  };

  const budgetOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Budget Prévu vs Réel (MRU)' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Budget (MRU)' } },
    },
  };

  const quickActions = [
    {
      title: 'Nouvelle demande',
      icon: <FileTextOutlined />,
      action: () => navigate('/demandes/create'),
      color: '#1890ff',
      show: user?.is_demandeur || user?.is_admin
    },
    {
      title: 'Voir les demandes',
      icon: <FileTextOutlined />,
      action: () => navigate('/demandes'),
      color: '#52c41a',
      show: true
    },
    {
      title: 'Engagements',
      icon: <ContainerOutlined />,
      action: () => navigate('/engagements'),
      color: '#722ed1',
      show: user?.is_acheteur || user?.is_admin
    },
    {
      title: 'Contrats expirants',
      icon: <ExclamationCircleOutlined />,
      action: () => navigate('/engagements/expirants'),
      color: '#fa541c',
      show: user?.is_acheteur || user?.is_admin
    },
    {
      title: 'Pointages',
      icon: <BarChartOutlined />,
      action: () => navigate('/pointages'),
      color: '#fa8c16',
      show: true
    }
  ].filter(action => action.show);

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      <Card style={{ marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <Row align="middle" justify="space-between">
          <Col flex="auto">
            <AntTitle level={2} style={{ margin: 0, color: '#1890ff' }}>
              Bonjour {user?.first_name} {user?.last_name} 👋
            </AntTitle>
            <Paragraph style={{ margin: 0, color: '#666', fontSize: '16px' }}>
              Voici la synthèse de l'activité de location de matériel.
            </Paragraph>
          </Col>
          <Col>
            <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title={<AntTitle level={4} style={{ margin: 0 }}>Vue d'ensemble</AntTitle>} style={{ borderRadius: '8px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Total Demandes" value={stats.demandes?.total || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Demandes en Attente" value={stats.demandes?.par_statut?.SOUMISE?.count || 0} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#faad14' }} />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Engagements Actifs" value={stats.engagements?.actifs || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Engagements Expirés" value={stats.engagements?.expires || 0} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#f5222d' }} />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Fournisseurs" value={stats.fournisseurs?.actifs || 0} prefix={<TeamOutlined />} valueStyle={{ color: '#722ed1' }} />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic title="Matériels Disponibles" value={stats.materiels?.disponibles || 0} prefix={<ToolOutlined />} valueStyle={{ color: '#eb2f96' }} />
              </Col>
            </Row>
          </Card>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <NotificationPanel />
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Actions rapides" style={{ height: '100%', borderRadius: '8px' }}>
                <Row gutter={[16, 16]}>
                  {quickActions.map((action, index) => (
                    <Col span={12} key={index}>
                      <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }} onClick={action.action} bodyStyle={{ padding: '16px' }}>
                        <div style={{ fontSize: '28px', color: action.color, marginBottom: 12 }}>{action.icon}</div>
                        <Text strong style={{ fontSize: '14px' }}>{action.title}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {loadingCharts ? (
            <Card><div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /><p>Chargement des graphiques...</p></div></Card>
          ) : (
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title="Heures Planifiées vs Réelles" style={{ borderRadius: '8px' }}>
                  <div style={{ height: '300px' }}><Bar data={heuresData} options={heuresOptions} /></div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Budget Prévu vs Réel" style={{ borderRadius: '8px' }}>
                  <div style={{ height: '300px' }}><ChartjsLine data={budgetData} options={budgetOptions} /></div>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
