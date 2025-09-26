// pages/materiels/MaterielDetail.jsx
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
  Statistic
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaterielsStore } from '../../store/materielsStore';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const { confirm } = Modal;

// Constantes pour l'affichage
const TYPE_MATERIEL_INFO = {
  'NIVELEUSE': { label: 'Niveleuse', color: 'blue', icon: '🚜' },
  'BULLDOZER': { label: 'Bulldozer', color: 'orange', icon: '🚛' },
  'EXCAVATRICE': { label: 'Excavatrice', color: 'green', icon: '🚧' },
  'COMPACTEUR': { label: 'Compacteur', color: 'purple', icon: '🛣️' },
  'CAMION': { label: 'Camion', color: 'red', icon: '🚚' },
  'VEHICULE_LEGER': { label: 'Véhicule léger', color: 'cyan', icon: '🚗' },
  'GROUPE_ELECTROGENE': { label: 'Groupe électrogène', color: 'gold', icon: '⚡' },
  'AUTRE': { label: 'Autre équipement', color: 'default', icon: '🔧' },
};

const TYPE_FACTURATION_INFO = {
  'PAR_JOUR': { label: 'Prix Unitaire × Nombre Jours', icon: '📅', description: 'Facturation quotidienne' },
  'PAR_HEURE': { label: 'Prix Unitaire × Total des Heures', icon: '⏰', description: 'Facturation horaire' },
  'FORFAITAIRE': { label: 'Prix Forfaitaire', icon: '💰', description: 'Prix fixe pour toute la période' },
};

const MaterielDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    materiel,
    loading,
    getMateriel,
    deleteMateriel,
    clearMateriel
  } = useMaterielsStore();

  useEffect(() => {
    if (id) {
      loadMateriel();
    }
    return () => clearMateriel();
  }, [id]);

  const loadMateriel = async () => {
    const result = await getMateriel(id);
    if (!result.success) {
      message.error('Matériel non trouvé');
      navigate('/materiels');
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Supprimer le matériel',
      content: `Êtes-vous sûr de vouloir supprimer ce matériel "${materiel.type_materiel}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteMateriel(materiel.id);
        if (result.success) {
          message.success('Matériel supprimé avec succès');
          navigate('/materiels');
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  if (loading) {
    return <Card loading={true} />;
  }

  if (!materiel) {
    return (
      <Card>
        <Empty
          description="Matériel non trouvé"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const typeInfo = TYPE_MATERIEL_INFO[materiel.type_materiel] || 
    { label: materiel.type_materiel, color: 'default', icon: '🔧' };
  
  const facturationInfo = TYPE_FACTURATION_INFO[materiel.type_facturation] || 
    { label: materiel.type_facturation, icon: '💰', description: '' };

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/materiels')}
              >
                Retour à la liste
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  {typeInfo.icon} {typeInfo.label}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {formatCurrency(materiel.prix_unitaire_mru)} MRU
                  <Tag
                    color={materiel.actif ? 'green' : 'red'}
                    style={{ marginLeft: 8 }}
                  >
                    {materiel.actif ? 'Disponible' : 'Non disponible'}
                  </Tag>
                </p>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/materiels/${id}/edit`)}
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
          <Card title="Informations du matériel" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Type de matériel" span={2}>
                <Tag color={typeInfo.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                  <ToolOutlined style={{ marginRight: 8 }} />
                  {typeInfo.icon} {typeInfo.label}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Prix unitaire" span={1}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  {formatCurrency(materiel.prix_unitaire_mru)} MRU
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Type de facturation" span={1}>
                <div>
                  <Tag color="blue" style={{ marginBottom: 4 }}>
                    {facturationInfo.icon} {facturationInfo.label}
                  </Tag>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {facturationInfo.description}
                  </div>
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Statut de disponibilité" span={2}>
                <Tag
                  color={materiel.actif ? 'green' : 'red'}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {materiel.actif ? '✅ Disponible à la location' : '❌ Non disponible'}
                </Tag>
              </Descriptions.Item>

              {materiel.observations && (
                <Descriptions.Item label="Observations" span={2}>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    background: '#f9f9f9', 
                    padding: '12px', 
                    borderRadius: '6px',
                    border: '1px solid #e8e8e8'
                  }}>
                    {materiel.observations}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Exemples de calcul */}
          <Card title="Exemples de calcul de prix">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#f0f9ff' }}>
                  <Statistic
                    title="1 jour"
                    value={materiel.type_facturation === 'PAR_JOUR' ? materiel.prix_unitaire_mru : 
                           materiel.type_facturation === 'PAR_HEURE' ? materiel.prix_unitaire_mru * 8 :
                           materiel.prix_unitaire_mru}
                    suffix="MRU"
                    precision={3}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    {materiel.type_facturation === 'PAR_HEURE' && '(8h de travail)'}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                  <Statistic
                    title="1 semaine"
                    value={materiel.type_facturation === 'PAR_JOUR' ? materiel.prix_unitaire_mru * 7 : 
                           materiel.type_facturation === 'PAR_HEURE' ? materiel.prix_unitaire_mru * 56 :
                           materiel.prix_unitaire_mru}
                    suffix="MRU"
                    precision={3}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    {materiel.type_facturation === 'PAR_HEURE' && '(56h de travail)'}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: 'center', background: '#fff2e8' }}>
                  <Statistic
                    title="1 mois"
                    value={materiel.type_facturation === 'PAR_JOUR' ? materiel.prix_unitaire_mru * 30 : 
                           materiel.type_facturation === 'PAR_HEURE' ? materiel.prix_unitaire_mru * 240 :
                           materiel.prix_unitaire_mru}
                    suffix="MRU"
                    precision={3}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    {materiel.type_facturation === 'PAR_HEURE' && '(240h de travail)'}
                  </div>
                </Card>
              </Col>
            </Row>
            <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Note :</strong> Ces calculs sont indicatifs. 
                {materiel.type_facturation === 'PAR_HEURE' && ' Le prix final dépendra du nombre d\'heures réellement travaillées.'}
                {materiel.type_facturation === 'FORFAITAIRE' && ' Le prix forfaitaire s\'applique quelle que soit la durée d\'utilisation.'}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations système */}
          <Card title="Informations système" style={{ marginBottom: 24 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="ID">
                <code>{materiel.id}</code>
              </Descriptions.Item>
              
              <Descriptions.Item label="Créé le">
                <Space>
                  <CalendarOutlined />
                  {formatDateTime(materiel.created_at)}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Actions rapides */}
          <Card title="Actions rapides" size="small" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<EditOutlined />}
                onClick={() => navigate(`/materiels/${id}/edit`)}
              >
                Modifier les informations
              </Button>

              <Button
                block
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/demandes/create?materiel=${id}`)}
              >
                Créer une demande avec ce matériel
              </Button>

              <Divider style={{ margin: '12px 0' }} />

              <Button
                block
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer ce matériel
              </Button>
            </Space>
          </Card>

          {/* Statistiques d'utilisation */}
          <Card title="Statistiques d'utilisation" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p>• Demandes en cours: 0</p>
              <p>• Total locations: 0</p>
              <p>• Revenus générés: 0 MRU</p>
              <p>• Dernière utilisation: N/A</p>
            </div>
            <div style={{ marginTop: 12, padding: 8, background: '#f0f9ff', borderRadius: 4 }}>
              <div style={{ fontSize: '11px', color: '#1890ff' }}>
                💡 Ces statistiques seront disponibles prochainement
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MaterielDetail;
