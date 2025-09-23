import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Row,
  Col,
  Statistic,
  Timeline,
  Progress,
  Alert
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { engagementsAPI } from '../../services/engagements';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

const EngagementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagement();
  }, [id]);

  const loadEngagement = async () => {
    setLoading(true);
    try {
      const response = await engagementsAPI.get(id);
      setEngagement(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement de l\'engagement');
      navigate('/engagements');
    } finally {
      setLoading(false);
    }
  };

  const getExpirationStatus = () => {
    if (!engagement) return null;
    const jours = engagement.jours_restants;
    if (jours <= 0) return { status: 'expired', color: 'red', text: 'Expiré' };
    if (jours <= 10) return { status: 'warning', color: 'orange', text: `Expire dans ${jours} jours` };
    return { status: 'active', color: 'green', text: `${jours} jours restants` };
  };

  if (loading) {
    return <Card loading={true} />;
  }

  if (!engagement) {
    return <Card>Engagement non trouvé</Card>;
  }

  const expirationStatus = getExpirationStatus();

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
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Engagement {engagement.numero}
                  <Tag 
                    color={expirationStatus.color} 
                    style={{ marginLeft: 16 }}
                  >
                    {expirationStatus.text}
                  </Tag>
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Créé le {formatDateTime(engagement.created_at)}
                </p>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate(`/engagements/${id}/edit`)}
              >
                Modifier
              </Button>
              <Button 
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/engagements/${id}/fiches-pointage`)}
              >
                Fiches pointage
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Alerte expiration */}
      {expirationStatus.status !== 'active' && (
        <Alert
          message={expirationStatus.status === 'expired' ? 'Engagement expiré' : 'Engagement expirant bientôt'}
          description={`Cet engagement ${expirationStatus.status === 'expired' ? 'a expiré' : 'expire bientôt'}. Vérifiez les actions nécessaires.`}
          type={expirationStatus.status === 'expired' ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations principales */}
          <Card title="Informations de l'engagement" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro" span={1}>
                {engagement.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={1}>
                <Tag color={expirationStatus.color}>
                  {expirationStatus.text}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Date début" span={1}>
                {formatDate(engagement.date_debut)}
              </Descriptions.Item>
              <Descriptions.Item label="Date fin" span={1}>
                {formatDate(engagement.date_fin)}
              </Descriptions.Item>
              
              <Descriptions.Item label="Montant estimé" span={2}>
                <strong style={{ color: '#1890ff', fontSize: '18px' }}>
                  {formatCurrency(engagement.montant_total_estime_mru)} MRU
                </strong>
              </Descriptions.Item>
              
              {engagement.conditions_particulieres && (
                <Descriptions.Item label="Conditions particulières" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {engagement.conditions_particulieres}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Informations mise à disposition */}
          <Card title="Mise à disposition" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Demande N°" span={1}>
                {engagement.mise_a_disposition?.demande_location?.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Chantier" span={1}>
                {engagement.mise_a_disposition?.demande_location?.chantier}
              </Descriptions.Item>
              
              <Descriptions.Item label="Fournisseur" span={2}>
                {engagement.mise_a_disposition?.fournisseur?.raison_sociale}
                <br />
                <small>NIF: {engagement.mise_a_disposition?.fournisseur?.nif}</small>
              </Descriptions.Item>
              
              <Descriptions.Item label="Immatriculation" span={1}>
                {engagement.mise_a_disposition?.immatriculation}
              </Descriptions.Item>
              <Descriptions.Item label="Date mise à disposition" span={1}>
                {formatDate(engagement.mise_a_disposition?.date_mise_disposition)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Matériels */}
          <Card title="Matériels concernés">
            <Table
              columns={[
                {
                  title: 'Type de matériel',
                  dataIndex: ['materiel', 'type_materiel'],
                  key: 'type_materiel',
                },
                {
                  title: 'Quantité',
                  dataIndex: 'quantite',
                  key: 'quantite',
                  align: 'center',
                },
                {
                  title: 'Prix unitaire (MRU)',
                  dataIndex: ['materiel', 'prix_unitaire_mru'],
                  key: 'prix_unitaire',
                  align: 'right',
                  render: (prix) => formatCurrency(prix),
                },
              ]}
              dataSource={engagement.materiels_demandes || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques */}
          <Card style={{ marginBottom: 24 }}>
            <Statistic
              title="Montant total estimé"
              value={engagement.montant_total_estime_mru}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarOutlined />}
            />
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Jours restants"
                  value={Math.max(0, engagement.jours_restants)}
                  suffix="jours"
                  valueStyle={{ 
                    color: engagement.jours_restants <= 10 ? '#cf1322' : '#3f8600' 
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Fiches pointage"
                  value={engagement.fiches_pointage_count || 0}
                  suffix="fiches"
                />
              </Col>
            </Row>
          </Card>

          {/* Progression temporelle */}
          <Card title="Progression" style={{ marginBottom: 24 }}>
            {(() => {
              const debut = new Date(engagement.date_debut);
              const fin = new Date(engagement.date_fin);
              const maintenant = new Date();
              const dureeTotal = fin.getTime() - debut.getTime();
              const dureeEcoulee = maintenant.getTime() - debut.getTime();
              const pourcentage = Math.min(100, Math.max(0, (dureeEcoulee / dureeTotal) * 100));
              
              return (
                <Progress
                  percent={pourcentage}
                  status={engagement.jours_restants <= 0 ? 'exception' : 'active'}
                  format={() => `${Math.round(pourcentage)}%`}
                />
              );
            })()}
            <p style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Du {formatDate(engagement.date_debut)} au {formatDate(engagement.date_fin)}
            </p>
          </Card>

          {/* Historique */}
          <Card title="Historique">
            <Timeline size="small">
              <Timeline.Item color="blue">
                <div>
                  <strong>Engagement créé</strong>
                  <br />
                  <small>{formatDateTime(engagement.created_at)}</small>
                </div>
              </Timeline.Item>
              
              <Timeline.Item color="green">
                <div>
                  <strong>Mise à disposition</strong>
                  <br />
                  <small>{formatDate(engagement.mise_a_disposition?.date_mise_disposition)}</small>
                </div>
              </Timeline.Item>
              
              {engagement.fiches_pointage_count > 0 && (
                <Timeline.Item color="orange">
                  <div>
                    <strong>Pointages en cours</strong>
                    <br />
                    <small>{engagement.fiches_pointage_count} fiche(s)</small>
                  </div>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EngagementDetail;
