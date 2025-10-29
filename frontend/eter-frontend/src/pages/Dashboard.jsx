import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row, // On garde Row pour les structures fixes comme "Actions rapides"
  Col,
  Statistic,
  Button,
  Space,
  Alert,
  Typography,
  Spin,
  Avatar,
  Divider // Pour séparer les cartes
} from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
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
import { formatCurrency, formatDate } from '../utils/formatters';
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

  const chartData = useMemo(() => {
    return recentDemandes
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(demand => ({
        date: formatDate(demand.created_at, 'MMM DD'),
        budget: demand.budget_previsionnel_mru || 0,
        numero: demand.numero
      }));
  }, [recentDemandes]);

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      {/* Bienvenue */}
      <Card
        style={{
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'
        }}
      >
        <Row align="middle" justify="space-between">
          <Col flex="auto">
            <AntTitle level={2} style={{ margin: 0, color: '#1890ff' }}>
              Bonjour {user?.first_name} {user?.last_name} 👋
            </AntTitle>
            <Paragraph style={{ margin: 0, color: '#666', fontSize: '16px' }}>
              Voici un aperçu de votre activité de location de matériel
            </Paragraph>
          </Col>
          <Col>
            <Avatar
              size={64}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Actions rapides */}
      <Card
        title={<AntTitle level={4} style={{ margin: 0, color: '#333' }}>Actions rapides</AntTitle>}
        style={{ marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}
      >
        <Row gutter={16}>
          {quickActions.map((action, index) => (
            <Col span={6} key={index}>
              <Card
                hoverable
                style={{
                  textAlign: 'center',
                  borderColor: action.color,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                }}
                onClick={action.action}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ fontSize: '28px', color: action.color, marginBottom: 12 }}>
                  {action.icon}
                </div>
                <Text strong style={{ color: '#333', fontSize: '14px' }}>
                  {action.title}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Conteneur pour les cartes prenant tout l'espace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Statistiques principales - une par ligne */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <Card
            style={{
              flex: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)'
            }}
          >
            <Statistic
              title="Total demandes"
              value={stats.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600', fontSize: '24px' }}
            />
          </Card>
          <Card
            style={{
              flex: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)'
            }}
          >
            <Statistic
              title="En attente"
              value={stats?.par_statut?.SOUMISE.count || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322', fontSize: '24px' }}
            />
          </Card>
          <Card
            style={{
              flex: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)'
            }}
          >
            <Statistic
              title="Validées"
              value={stats?.par_statut?.VALIDEE.count || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '24px' }}
            />
          </Card>
          <Card
            style={{
              flex: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f0eaff 0%, #ffffff 100%)'
            }}
          >
            <Statistic
              title="Budget total (MRU)"
              value={stats?.budget_total || 0}
              precision={0}
              valueStyle={{ color: '#722ed1', fontSize: '24px' }}
            />
          </Card>
        </div>

        {/* Nouveaux graphiques Heures et Budget - une par ligne */}
        {loadingCharts ? (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <p>Chargement des données de pointage...</p>
            </div>
          </Card>
        ) : (
          <>
            <Card
              title="Heures Planifiées vs Réelles"
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <div style={{ height: '300px' }}>
                <Bar data={heuresData} options={heuresOptions} />
              </div>
            </Card>
            <Card
              title="Budget Prévu vs Réel"
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <div style={{ height: '300px' }}>
                <ChartjsLine data={budgetData} options={budgetOptions} />
              </div>
            </Card>
          </>
        )}

        {/* Demandes récentes - Graphique - une par ligne */}
        <Card
          title={
            <Space>
              <FileTextOutlined /> Évolution des demandes récentes
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/demandes')}>
              Voir toutes
            </Button>
          }
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <Spin size="large" />
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <FileTextOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
              <Paragraph>Aucune demande récente</Paragraph>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value, name, props) => [
                    formatCurrency(value),
                    `${name}: ${props.payload.numero}`,
                    props.payload.date
                  ]}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <RechartsLine
                  type="monotone"
                  dataKey="budget"
                  stroke="#1890ff"
                  strokeWidth={3}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Notifications et alertes - une par ligne */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Panel de notifications d'expiration */}
          <div style={{ flex: 1, minWidth: '400px' }}>
            <NotificationPanel />
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 4, fontSize: 12 }}>
                Debug: Dashboard loading stats and notifications
              </div>
            )}
          </div>

          {/* Alertes diverses */}
          <div style={{ flex: 1, minWidth: '400px' }}>
            {stats?.par_statut?.SOUMISE.count > 0 && (user?.is_acheteur || user?.is_admin) && (
              <Alert
                message="Demandes en attente"
                description={`${stats?.par_statut?.SOUMISE.count} demande(s) nécessite(nt) votre validation`}
                type="warning"
                showIcon
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  marginBottom: '16px'
                }}
                action={
                  <Button size="small" onClick={() => navigate('/demandes?statut=SOUMISE')}>
                    Voir
                  </Button>
                }
              />
            )}

            {/* Placeholder for other alerts */}
            <Card
              style={{
                borderRadius: '8px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)'
              }}
            >
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <FileTextOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Système de notifications actif
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;