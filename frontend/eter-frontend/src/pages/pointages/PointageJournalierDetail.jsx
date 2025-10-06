import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Timeline,
  Divider,
  message,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatNumberSafe } from '../../utils/formatters';

// Dans PointageJournalierDetail.jsx, ajoutez des vérifications de sécurité :

const PointageJournalierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pointage, setPointage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPointage();
  }, [id]);

  const loadPointage = async () => {
    setLoading(true);
    try {
      const response = await pointagesAPI.getPointage(id);
      console.log('📥 Données reçues:', response.data);
      setPointage(response.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur lors du chargement du pointage');
      navigate('/pointages');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Vérifications de sécurité
  if (loading) {
    return <Card loading={true} />;
  }

  if (!pointage) {
    return <Card>Pointage non trouvé</Card>;
  }

  const handleDelete = async () => {
  try {
    await pointagesAPI.deletePointageJournalier(id);
    message.success('Pointage supprimé avec succès');
    
    // ✅ Navigation sécurisée après suppression
    if (pointage?.fiche_pointage?.id) {
      navigate(`/pointages/fiches/${pointage.fiche_pointage.id}`);
    } else {
      navigate('/pointages');
    }
  } catch (error) {
    console.error('Erreur suppression:', error);
    message.error('Erreur lors de la suppression');
  }
};


  // ✅ Vérifier si les données de la fiche sont disponibles
  const fichePointage = pointage.fiche_pointage || {};
  const hasFicheData = Object.keys(fichePointage).length > 0;

  const totalHeures = (pointage.heures_travail || 0) + 
                     (pointage.heures_panne || 0) + 
                     (pointage.heures_arret || 0);

  const tauxUtilisation = totalHeures > 0 ? 
    ((pointage.heures_travail || 0) / totalHeures * 100) : 0;

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => {
                  // ✅ Navigation sécurisée
                  if (hasFicheData && fichePointage.id) {
                    navigate(`/pointages/fiches/${fichePointage.id}`);
                  } else {
                    navigate('/pointages/fiches');
                  }
                }}
              >
                Retour à la fiche
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Pointage du {formatDate(pointage.date_pointage)}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {pointage.jour_semaine} - Fiche {fichePointage.numero_fiche || 'Non disponible'}
                </p>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate(`/pointages/journaliers/${id}/edit`)}
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
          <Card title="Détail du pointage" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Date" span={1}>
                {formatDate(pointage.date_pointage)}
              </Descriptions.Item>
              <Descriptions.Item label="Jour" span={1}>
                {pointage.jour_semaine}
              </Descriptions.Item>
              
              <Descriptions.Item label="Fiche de pointage" span={2}>
                {hasFicheData && fichePointage.id ? (
                  <Button 
                    type="link" 
                    style={{ padding: 0 }}
                    onClick={() => navigate(`/pointages/fiches/${fichePointage.id}`)}
                  >
                    {fichePointage.numero_fiche || `Fiche #${fichePointage.id}`}
                  </Button>
                ) : (
                  <span style={{ color: '#999' }}>Fiche non disponible</span>
                )}
              </Descriptions.Item>
              
              <Descriptions.Item label="Compteur début" span={1}>
                {pointage.compteur_debut || 'Non renseigné'}
              </Descriptions.Item>
              <Descriptions.Item label="Compteur fin" span={1}>
                {pointage.compteur_fin || 'Non renseigné'}
              </Descriptions.Item>
              
              {pointage.compteur_debut && pointage.compteur_fin && (
                <Descriptions.Item label="Écart compteur" span={2}>
                  <Tag color="blue">
                    {pointage.compteur_fin - pointage.compteur_debut} unités
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Répartition des heures */}
          <Card title="Répartition des heures" style={{ marginBottom: 24 }}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Heures travail"
                    value={pointage.heures_travail || 0}
                    suffix="h"
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<ToolOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Heures panne"
                    value={pointage.heures_panne || 0}
                    suffix="h"
                    valueStyle={{ color: '#faad14' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Heures arrêt"
                    value={pointage.heures_arret || 0}
                    suffix="h"
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Total des heures</span>
                <Tag color={totalHeures > 10 ? 'red' : 'green'}>
                  {formatNumber(totalHeures,1)}h / 10h
                </Tag>
              </div>
              <Progress 
                percent={(totalHeures / 10) * 100} 
                status={totalHeures > 10 ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#52c41a',
                  '80%': '#faad14',
                  '100%': '#cf1322',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Taux d'utilisation</span>
              <Tag color={tauxUtilisation > 80 ? 'green' : tauxUtilisation > 50 ? 'orange' : 'red'}>
                {tauxUtilisation.toFixed(1)}%
              </Tag>
            </div>
            <Progress 
              percent={tauxUtilisation} 
              strokeColor={{
                '0%': '#cf1322',
                '50%': '#faad14',
                '80%': '#52c41a',
              }}
            />
          </Card>

          {/* Consommation et observations */}
          <Card title="Autres informations">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Consommation carburant">
                <Space>
                  <CarOutlined />
                  {formatNumber(pointage.consommation_carburant, 2)} L
                  {pointage.heures_travail > 0 && (
                    <Tag color="blue">
                      {(formatNumberSafe(pointage.consommation_carburant) / formatNumberSafe(pointage.heures_travail)).toFixed(2)} L/h
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Montant journalier">
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  {formatCurrency(pointage.montant_journalier)} MRU
                </div>
              </Descriptions.Item>
              
              {pointage.observations && (
                <Descriptions.Item label="Observations">
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    background: '#f9f9f9', 
                    padding: '12px', 
                    borderRadius: '6px' 
                  }}>
                    {pointage.observations}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          {/* Résumé financier */}
          <Card style={{ marginBottom: 24 }}>
            <Statistic
              title="Montant de ce pointage"
              value={pointage.montant_journalier}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600' }}
            />
            <Divider />
            <div style={{ fontSize: '12px', color: '#666' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Prix unitaire:</span>
                <span>{fichePointage.prix_unitaire ? formatCurrency(fichePointage.prix_unitaire) : 'N/A'} MRU</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Heures facturées:</span>
                <span>{pointage.heures_travail}h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Type facturation:</span>
                <span>{fichePointage.materiel?.materiel?.type_facturation || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Informations du matériel - avec vérifications */}
          {hasFicheData && (
            <Card title="Matériel" style={{ marginBottom: 24 }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Type">
                  {fichePointage.materiel_type || 'Non disponible'}
                </Descriptions.Item>
                <Descriptions.Item label="Quantité">
                  {fichePointage.materiel_quantite || 'Non disponible'}
                </Descriptions.Item>
                <Descriptions.Item label="Engagement">
                  {fichePointage.engagement?.id ? (
                    <Button 
                      type="link" 
                      size="small" 
                      style={{ padding: 0 }}
                      onClick={() => navigate(`/engagements/${fichePointage.engagement.id}`)}
                    >
                      {fichePointage.engagement_numero || `Engagement #${fichePointage.engagement.id}`}
                    </Button>
                  ) : (
                    <span style={{ color: '#999' }}>Non disponible</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Timeline des événements */}
          <Card title="Chronologie" size="small">
            <Timeline size="small">
              <Timeline.Item color="blue">
                <div style={{ fontSize: '12px' }}>
                  <strong>Pointage créé</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {pointage.created_at ? formatDateTime(pointage.created_at) : 'Date inconnue'}
                  </span>
                </div>
              </Timeline.Item>
              
              {pointage.heures_travail > 0 && (
                <Timeline.Item color="green">
                  <div style={{ fontSize: '12px' }}>
                    <strong>Heures de travail</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {pointage.heures_travail}h productives
                    </span>
                  </div>
                </Timeline.Item>
              )}
              
              {pointage.heures_panne > 0 && (
                <Timeline.Item color="orange">
                  <div style={{ fontSize: '12px' }}>
                    <strong>Panne signalée</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {pointage.heures_panne}h d'arrêt technique
                    </span>
                  </div>
                </Timeline.Item>
              )}
              
              {pointage.consommation_carburant > 0 && (
                <Timeline.Item color="blue">
                  <div style={{ fontSize: '12px' }}>
                    <strong>Carburant consommé</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {pointage.consommation_carburant}L
                    </span>
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

export default PointageJournalierDetail;
