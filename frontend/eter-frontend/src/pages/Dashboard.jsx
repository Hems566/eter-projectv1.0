import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Button, 
  Space,
  Alert,
  Progress,
  List,
  Avatar
} from 'antd';
import { 
  FileTextOutlined,
  ContainerOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { demandesAPI } from '../services/demandes';
import { formatCurrency, getStatusColor, formatDate } from '../utils/formatters';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({});
  const [recentDemandes, setRecentDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques
      const statsResponse = await demandesAPI.stats();
      setStats(statsResponse.data);

      // Charger les demandes récentes
      const demandesResponse = await demandesAPI.list({ 
        page_size: 5, 
        ordering: '-created_at' 
      });
      setRecentDemandes(demandesResponse.data.results);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
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
      title: 'Pointages',
      icon: <BarChartOutlined />,
      action: () => navigate('/pointages'),
      color: '#fa8c16',
      show: true
    }
  ].filter(action => action.show);

  const recentColumns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      width: 120,
    },
    {
      title: 'Chantier',
      dataIndex: 'chantier',
      key: 'chantier',
      ellipsis: true,
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 120,
      render: (statut, record) => (
        <Tag color={getStatusColor(statut)}>
          {record.statut_display}
        </Tag>
      ),
    },
    {
      title: 'Budget (MRU)',
      dataIndex: 'budget_previsionnel_mru',
      key: 'budget',
      width: 130,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate(`/demandes/${record.id}`)}
        >
          Voir
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Bienvenue */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle">
          <Col flex="auto">
            <h1 style={{ margin: 0 }}>
              Bonjour {user?.first_name} {user?.last_name} 👋
            </h1>
            <p style={{ margin: 0, color: '#666' }}>
              Voici un aperçu de votre activité de location de matériel
            </p>
          </Col>
          <Col>
            <Avatar size={64} icon={<UserOutlined />} />
          </Col>
        </Row>
      </Card>

      {/* Actions rapides */}
      <Card title="Actions rapides" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {quickActions.map((action, index) => (
            <Col span={6} key={index}>
              <Card
                hoverable
                style={{ textAlign: 'center', borderColor: action.color }}
                onClick={action.action}
              >
                <div style={{ fontSize: '24px', color: action.color, marginBottom: 8 }}>
                  {action.icon}
                </div>
                <div style={{ fontWeight: 'bold' }}>{action.title}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Statistiques principales */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total demandes"
                  value={stats.total_demandes || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="En attente"
                  value={stats.demandes_en_attente || 0}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Validées"
                  value={stats.demandes_validees || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Budget total (MRU)"
                  value={stats.budget_total || 0}
                  precision={0}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Demandes récentes */}
          <Card 
            title="Demandes récentes" 
            extra={
              <Button type="link" onClick={() => navigate('/demandes')}>
                Voir toutes
              </Button>
            }
            style={{ marginBottom: 24 }}
          >
            <Table
              columns={recentColumns}
              dataSource={recentDemandes}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Alertes et notifications */}
          {stats.demandes_en_attente > 0 && (user?.is_acheteur || user?.is_admin) && (
            <Alert
              message="Demandes en attente"
              description={`${stats.demandes_en_attente} demande(s) nécessite(nt) votre validation`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={() => navigate('/demandes?statut=SOUMISE')}>
                  Voir
                </Button>
              }
            />
          )}

          {/* Répartition par statut */}
          <Card title="Répartition des demandes" style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Brouillon</span>
                <span>{stats.demandes_brouillon || 0}</span>
              </div>
              <Progress 
                percent={((stats.demandes_brouillon || 0) / (stats.total_demandes || 1)) * 100} 
                strokeColor="#d9d9d9"
                showInfo={false}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Soumises</span>
                <span>{stats.demandes_en_attente || 0}</span>
              </div>
              <Progress 
                percent={((stats.demandes_en_attente || 0) / (stats.total_demandes || 1)) * 100} 
                strokeColor="#faad14"
                showInfo={false}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Validées</span>
                <span>{stats.demandes_validees || 0}</span>
              </div>
              <Progress 
                percent={((stats.demandes_validees || 0) / (stats.total_demandes || 1)) * 100} 
                strokeColor="#52c41a"
                showInfo={false}
              />
            </div>
          </Card>

          {/* Activité récente */}
          <Card title="Activité récente">
            <List
              size="small"
              dataSource={[
                {
                  title: 'Demande DL-2024-0123 créée',
                  description: 'Il y a 2 heures',
                  avatar: <Avatar icon={<FileTextOutlined />} size="small" />
                },
                {
                  title: 'Engagement CTL-2024-0089 signé',
                  description: 'Il y a 1 jour',
                  avatar: <Avatar icon={<ContainerOutlined />} size="small" />
                },
                {
                  title: 'Pointage complété',
                  description: 'Il y a 2 jours',
                  avatar: <Avatar icon={<BarChartOutlined />} size="small" />
                }
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.avatar}
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
