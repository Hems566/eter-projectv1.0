// pages/fournisseurs/FournisseurDetail.jsx
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
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useFournisseursStore } from '../../store/fournisseursStore';
import { formatDateTime } from '../../utils/formatters';

const { confirm } = Modal;

const FournisseurDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    fournisseur,
    loading,
    getFournisseur,
    deleteFournisseur,
    clearFournisseur
  } = useFournisseursStore();

  useEffect(() => {
    if (id) {
      loadFournisseur();
    }
    return () => clearFournisseur();
  }, [id]);

  const loadFournisseur = async () => {
    const result = await getFournisseur(id);
    if (!result.success) {
      message.error('Fournisseur non trouvé');
      navigate('/fournisseurs');
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Supprimer le fournisseur',
      content: `Êtes-vous sûr de vouloir supprimer "${fournisseur.raison_sociale}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteFournisseur(fournisseur.id);
        if (result.success) {
          message.success('Fournisseur supprimé avec succès');
          navigate('/fournisseurs');
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  if (loading) {
    return <Card loading={true} />;
  }

  if (!fournisseur) {
    return (
      <Card>
        <Empty
          description="Fournisseur non trouvé"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/fournisseurs')}
              >
                Retour à la liste
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  {fournisseur.raison_sociale}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  NIF: {fournisseur.nif}
                  <Tag
                    color={fournisseur.actif ? 'green' : 'red'}
                    style={{ marginLeft: 8 }}
                  >
                    {fournisseur.actif ? 'Actif' : 'Inactif'}
                  </Tag>
                </p>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/fournisseurs/${id}/edit`)}
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
          <Card title="Informations du fournisseur">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Raison sociale">
                <div style={{ fontSize: '16px', fontWeight: 500 }}>
                  {fournisseur.raison_sociale}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="NIF">
                <code style={{ 
                  fontSize: '16px', 
                  color: '#1890ff',
                  background: '#f0f9ff',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {fournisseur.nif}
                </code>
              </Descriptions.Item>

              {fournisseur.telephone && (
                <Descriptions.Item label="Téléphone">
                  <Space>
                    <PhoneOutlined style={{ color: '#52c41a' }} />
                    <a href={`tel:${fournisseur.telephone}`}>
                      {fournisseur.telephone}
                    </a>
                  </Space>
                </Descriptions.Item>
              )}

              {fournisseur.email && (
                <Descriptions.Item label="Email">
                  <Space>
                    <MailOutlined style={{ color: '#1890ff' }} />
                    <a href={`mailto:${fournisseur.email}`}>
                      {fournisseur.email}
                    </a>
                  </Space>
                </Descriptions.Item>
              )}

              {fournisseur.adresse && (
                <Descriptions.Item label="Adresse">
                  <Space align="start">
                    <HomeOutlined style={{ color: '#666', marginTop: 4 }} />
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {fournisseur.adresse}
                    </div>
                  </Space>
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Statut">
                <Tag
                  color={fournisseur.actif ? 'green' : 'red'}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  {fournisseur.actif ? 'Actif' : 'Inactif'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations système */}
          <Card title="Informations système" style={{ marginBottom: 24 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Créé le">
                <Space>
                  <CalendarOutlined />
                  {formatDateTime(fournisseur.created_at)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Modifié le">
                <Space>
                  <CalendarOutlined />
                  {formatDateTime(fournisseur.updated_at)}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Actions rapides */}
          <Card title="Actions rapides" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<EditOutlined />}
                onClick={() => navigate(`/fournisseurs/${id}/edit`)}
              >
                Modifier les informations
              </Button>

              {fournisseur.telephone && (
                <Button
                  block
                  icon={<PhoneOutlined />}
                  href={`tel:${fournisseur.telephone}`}
                >
                  Appeler
                </Button>
              )}

              {fournisseur.email && (
                <Button
                  block
                  icon={<MailOutlined />}
                  href={`mailto:${fournisseur.email}`}
                >
                  Envoyer un email
                </Button>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <Button
                block
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer ce fournisseur
              </Button>
            </Space>
          </Card>

          {/* Statistiques */}
          <Card title="Statistiques" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p>• Matériels fournis: 0</p>
              <p>• Contrats actifs: 0</p>
              <p>• Dernière activité: N/A</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FournisseurDetail;
