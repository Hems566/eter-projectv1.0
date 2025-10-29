import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Modal,
  message,
  Divider,
  Empty,
  Table,
  Progress,
  Statistic,
  Timeline,
  Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useEngagementsStore } from '../../store/engagementsStore';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import moment from 'moment';

const { confirm } = Modal;

const EngagementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    engagement,
    loading,
    getEngagement,
    deleteEngagement,
    getFichesPointage,
    clearEngagement
  } = useEngagementsStore();

  const [fichesPointage, setFichesPointage] = useState([]);
  const [loadingFiches, setLoadingFiches] = useState(false);

  useEffect(() => {
    if (id) {
      loadEngagement();
      loadFichesPointage();
    }
    return () => clearEngagement();
  }, [id]);

  const loadEngagement = async () => {
    const result = await getEngagement(id);
    if (!result.success) {
      message.error('Engagement non trouvé');
      navigate('/engagements');
    }
  };

  const loadFichesPointage = async () => {
    setLoadingFiches(true);
    try {
      const result = await getFichesPointage(id);
      if (result.success) {
        setFichesPointage(result.data);
      }
    } catch (error) {
      console.error('Erreur chargement fiches:', error);
    } finally {
      setLoadingFiches(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Supprimer l\'engagement',
      content: `Êtes-vous sûr de vouloir supprimer l'engagement "${engagement.numero}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteEngagement(engagement.id);
        if (result.success) {
          message.success('Engagement supprimé avec succès');
          navigate('/engagements');
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const getStatutEngagement = () => {
    if (!engagement) return null;
    
    const today = moment();
    const dateFin = moment(engagement.date_fin);
    
    if (today.isAfter(dateFin)) {
      return { status: 'Expiré', color: 'red', icon: <ExclamationCircleOutlined /> };
    } else {
      return { status: 'En cours', color: 'green', icon: <CheckCircleOutlined /> };
    }
  };

  const getProgressDuree = () => {
    if (!engagement) return 0;
    
    const today = moment();
    const dateDebut = moment(engagement.date_debut);
    const dateFin = moment(engagement.date_fin);
    
    if (today.isBefore(dateDebut)) return 0;
    if (today.isAfter(dateFin)) return 100;
    
    const totalDays = dateFin.diff(dateDebut, 'days');
    const elapsedDays = today.diff(dateDebut, 'days');
    
    return Math.round((elapsedDays / totalDays) * 100);
  };

  const getJoursRestants = () => {
    if (!engagement) return 0;
    
    const today = moment();
    const dateFin = moment(engagement.date_fin);
    
    if (today.isAfter(dateFin)) return 0;
    
    return dateFin.diff(today, 'days');
  };

  const ficheColumns = [
    {
      title: 'Numéro fiche',
      dataIndex: 'numero_fiche',
      key: 'numero_fiche',
      render: (numero, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/pointages/fiches/${record.id}`)}
        >
          {numero}
        </Button>
      ),
    },
    {
      title: 'Matériel',
      key: 'materiel',
      render: (_, record) => (
        <div>
          <div>{record.materiel_type}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.immatriculation}
          </div>
        </div>
      ),
    },
    {
      title: 'Période',
      key: 'periode',
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {formatDate(record.periode_debut)} - {formatDate(record.periode_fin)}
        </div>
      ),
    },
    {
      title: 'Jours pointés',
      dataIndex: 'total_jours_pointes',
      key: 'total_jours_pointes',
      align: 'center',
      render: (jours) => (
        <Tag color={jours > 0 ? 'green' : 'default'}>
          {jours || 0} jours
        </Tag>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant_total_calcule',
      key: 'montant_total_calcule',
      align: 'right',
      render: (montant) => (
        <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {formatCurrency(montant || 0)} MRU
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/pointages/fiches/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/pointages/journaliers/create?fiche_id=${record.id}`)}
          />
        </Space>
      ),
    },
  ];

  if (loading || !engagement) {
    return <Card loading={true} />;
  }

  const statutInfo = getStatutEngagement();
  const progress = getProgressDuree();
  const joursRestants = getJoursRestants();
  const budgetConsommePercent = engagement.budget_previsionnel_mru > 0 ? Math.round(((engagement.montant_actuel_mru || 0) / engagement.budget_previsionnel_mru) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/engagements')}
              >
                Retour à la liste
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Engagement {engagement.numero}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {engagement.mise_a_disposition?.demande_location_numero} - {engagement.mise_a_disposition?.chantier}
                  {statutInfo && (
                    <Tag
                      color={statutInfo.color}
                      icon={statutInfo.icon}
                      style={{ marginLeft: 8 }}
                    >
                      {statutInfo.status}
                    </Tag>
                  )}
                </p>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Nouvelle fiche
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/engagements/${id}/edit`)}
              >
                Modifier
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations principales */}
          <Card title="Informations de l\'engagement" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro d'engagement">
                <code style={{ 
                  fontSize: '16px', 
                  color: '#1890ff',
                  background: '#f0f9ff',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {engagement.numero}
                </code>
              </Descriptions.Item>

              <Descriptions.Item label="Statut">
                {statutInfo && (
                  <Tag
                    color={statutInfo.color}
                    icon={statutInfo.icon}
                    style={{ fontSize: '14px', padding: '4px 12px' }}
                  >
                    {statutInfo.status}
                  </Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Date de début">
                <Space>
                  <CalendarOutlined />
                  {formatDate(engagement.date_debut)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Date de fin">
                <Space>
                  <CalendarOutlined />
                  {formatDate(engagement.date_fin)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Durée" span={2}>
                <div>
                  <Progress 
                    percent={progress} 
                    status={progress === 100 ? 'exception' : 'active'}
                    strokeColor={progress > 80 ? '#ff4d4f' : progress > 60 ? '#faad14' : '#52c41a'}
                  />
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    {progress}% écoulé - {joursRestants > 0 ? `${joursRestants} jours restants` : 'Expiré'}
                  </div>
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Fiches de pointage">
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/pointages/fiches?engagement=${id}`)}
                >
                  {engagement.fiches_pointage_count || 0} fiche(s)
                </Button>
              </Descriptions.Item>

              {engagement.conditions_particulieres && (
                <Descriptions.Item label="Conditions particulières" span={2}>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    background: '#f9f9f9', 
                    padding: '12px', 
                    borderRadius: '6px',
                    border: '1px solid #e8e8e8'
                  }}>
                    {engagement.conditions_particulieres}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="Suivi Budgétaire" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Statistic title="Budget Prévisionnel" value={formatCurrency(engagement.budget_previsionnel_mru)} suffix="MRU" />
                </Col>
                <Col span={8}>
                    <Statistic title="Montant Actuel Pointé" value={formatCurrency(engagement.montant_actuel_mru)} suffix="MRU" valueStyle={{ color: budgetConsommePercent > 100 ? '#f5222d' : '#52c41a' }} />
                </Col>
                <Col span={8}>
                    <Statistic title="Budget Restant" value={formatCurrency((engagement.budget_previsionnel_mru || 0) - (engagement.montant_actuel_mru || 0))} suffix="MRU" valueStyle={{ color: ((engagement.budget_previsionnel_mru || 0) - (engagement.montant_actuel_mru || 0)) < 0 ? '#f5222d' : '#3f8600'}} />
                </Col>
            </Row>
            <Progress percent={budgetConsommePercent} strokeColor={budgetConsommePercent > 100 ? '#f5222d' : (budgetConsommePercent > 80 ? '#faad14' : '#52c41a')} style={{ marginTop: 16 }} />
          </Card>

          {/* Mise à disposition */}
          <Card title="Mise à disposition" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Numéro demande">
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/demandes/${engagement.mise_a_disposition?.demande_location_id}`)}
                >
                  {engagement.mise_a_disposition.demande_location?.numero}
                </Button>
              </Descriptions.Item>

              <Descriptions.Item label="Chantier">
                {engagement.mise_a_disposition?.chantier}
              </Descriptions.Item>

              <Descriptions.Item label="Fournisseur">
                {engagement.mise_a_disposition.fournisseur?.raison_sociale}
              </Descriptions.Item>

              <Descriptions.Item label="Immatriculation">
                <code>{engagement.mise_a_disposition?.immatriculation}</code>
              </Descriptions.Item>

              <Descriptions.Item label="Durée MAD">
                {engagement.mise_a_disposition?.duree_mois} mois
              </Descriptions.Item>

              <Descriptions.Item label="Conforme">
                <Tag color={engagement.mise_a_disposition?.conforme ? 'green' : 'red'}>
                  {engagement.mise_a_disposition?.conforme ? '✅ Oui' : '❌ Non'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Fiches de pointage */}
          <Card 
            title="Fiches de pointage" 
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Nouvelle fiche
              </Button>
            }
          >
            <Table
              columns={ficheColumns}
              dataSource={fichesPointage}
              rowKey="id"
              loading={loadingFiches}
              pagination={false}
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Aucune fiche de pointage"
                  />
                )
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Fiches créées"
                  value={engagement.fiches_pointage_count || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Jours restants"
                  value={joursRestants}
                  valueStyle={{ 
                    color: joursRestants <= 7 ? '#cf1322' : joursRestants <= 30 ? '#faad14' : '#52c41a' 
                  }}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={24}>
                <Statistic
                  title="Progression de la durée"
                  value={progress}
                  suffix="%"
                  valueStyle={{ 
                    color: progress >= 100 ? '#cf1322' : progress >= 80 ? '#faad14' : '#52c41a' 
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* Actions rapides */}
          <Card title="Actions rapides" size="small" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Créer une fiche de pointage
              </Button>

              <Button
                block
                icon={<CalendarOutlined />}
                onClick={() => navigate(`/pointages/fiches?engagement=${id}`)}
              >
                Voir toutes les fiches
              </Button>

              <Button
                block
                icon={<EditOutlined />}
                onClick={() => navigate(`/engagements/${id}/edit`)}
              >
                Modifier l'engagement
              </Button>

              <Divider style={{ margin: '12px 0' }} />

              <Button
                block
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer l'engagement
              </Button>
            </Space>
          </Card>

          {/* Timeline */}
          <Card title="Chronologie" size="small">
            <Timeline size="small">
              <Timeline.Item color="blue">
                <div style={{ fontSize: '12px' }}>
                  <strong>Engagement créé</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDateTime(engagement.created_at)}
                  </span>
                </div>
              </Timeline.Item>

              <Timeline.Item color="green">
                <div style={{ fontSize: '12px' }}>
                  <strong>Début d'engagement</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDate(engagement.date_debut)}
                  </span>
                </div>
              </Timeline.Item>

              {engagement.fiches_pointage_count > 0 && (
                <Timeline.Item color="orange">
                  <div style={{ fontSize: '12px' }}>
                    <strong>Fiches créées</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {engagement.fiches_pointage_count} fiche(s)
                    </span>
                  </div>
                </Timeline.Item>
              )}

              <Timeline.Item 
                color={statutInfo?.status === 'Expiré' ? 'red' : 'gray'}
              >
                <div style={{ fontSize: '12px' }}>
                  <strong>Fin d'engagement</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDate(engagement.date_fin)}
                  </span>
                </div>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EngagementDetail;