import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Modal, 
  Form,
  Input,
  message,
  Row,
  Col,
  Tag,
  Timeline,
  Checkbox,
  Popconfirm
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { misesADispositionAPI } from '../../services/misesADisposition';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {usePermissions} from '../../hooks/usePermissions';

const { TextArea } = Input;

const MiseADispositionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
      canManageMAD,
      canManageEngagements,
      canAccessResource,
      isAcheteur,
      user 
    } = usePermissions();
  const [mad, setMad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conformiteModalVisible, setConformiteModalVisible] = useState(false);
  const [conformiteForm] = Form.useForm();

  useEffect(() => {
    loadMiseADisposition();
  }, [id]);

  const loadMiseADisposition = async () => {
    setLoading(true);
    try {
      const response = await misesADispositionAPI.get(id);
      console.log(response);
      setMad(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement de la mise à disposition');
      navigate('/mises-a-disposition');
    } finally {
      setLoading(false);
    }
  };

  const handleConformiteChange = async () => {
    try {
      const values = await conformiteForm.validateFields();
      await misesADispositionAPI.marquerConforme(id, {
        conforme: values.conforme,
        observations: values.observations
      });
      
      message.success('Conformité mise à jour');
      setConformiteModalVisible(false);
      loadMiseADisposition();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const canEdit = () => {
    return mad && 
           canManageMAD &&
           (mad.responsable?.id === user?.id);
  };

  const canCreateEngagement = () => {
    return mad && 
           mad.conforme && 
           !mad.engagement &&
           canManageMAD;
  };

  if (loading) {
    return <Card loading={true} />;
  }

  if (!mad) {
    return <Card>Mise à disposition non trouvée</Card>;
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
                onClick={() => navigate('/mises-a-disposition')}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Mise à disposition - {mad.demande_location.numero}
                  <Tag 
                    icon={mad.conforme ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                    color={mad.conforme ? 'success' : 'warning'}
                    style={{ marginLeft: 16 }}
                  >
                    {mad.conforme ? 'Conforme' : 'Non conforme'}
                  </Tag>
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Créée le {formatDateTime(mad.created_at)}
                </p>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {canEdit() && (
                <>
                  <Button 
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/mises-a-disposition/${id}/edit`)}
                  >
                    Modifier
                  </Button>
                  <Button
                    icon={mad.conforme ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
                    onClick={() => {
                      conformiteForm.setFieldsValue({
                        conforme: !mad.conforme,
                        observations: ''
                      });
                      setConformiteModalVisible(true);
                    }}
                  >
                    Marquer {mad.conforme ? 'non conforme' : 'conforme'}
                  </Button>
                </>
              )}
              
              {canCreateEngagement() && (
                <Button 
                  type="primary"
                  onClick={() => navigate(`/engagements/create?mad_id=${id}`)}
                >
                  Créer engagement
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Alerte si non conforme */}
      {!mad.conforme && (
        <Card style={{ marginBottom: 24, borderColor: '#faad14' }}>
          <Row align="middle">
            <Col flex="auto">
              <div>
                <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                <strong>Matériel non conforme</strong>
                <p style={{ margin: 0, color: '#666' }}>
                  Cette mise à disposition est marquée comme non conforme. 
                  Un engagement ne peut être créé qu'avec du matériel conforme.
                </p>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations principales */}
          <Card title="Informations de la mise à disposition" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Demande de location" span={2}>
                <Space>
                  <Button 
                    type="link" 
                    style={{ padding: 0 }}
                    onClick={() => navigate(`/demandes/${mad.demande_location.id}`)}
                  >
                    {mad.demande_location.numero}
                  </Button>
                  - {mad.demande_location.chantier}
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="Fournisseur" span={2}>
                <div>
                  <strong>{mad.fournisseur.raison_sociale}</strong>
                  <br />
                  <small>NIF: {mad.fournisseur.nif} | Tél: {mad.fournisseur.telephone}</small>
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Date de MAD">
                {formatDate(mad.date_mise_disposition)}
              </Descriptions.Item>
              <Descriptions.Item label="Immatriculation">
                <strong>{mad.immatriculation}</strong>
              </Descriptions.Item>
              
              <Descriptions.Item label="Conformité">
                <Tag 
                  icon={mad.conforme ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                  color={mad.conforme ? 'success' : 'warning'}
                >
                  {mad.conforme ? 'Conforme' : 'Non conforme'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Responsable">
                {mad.responsable.first_name} {mad.responsable.last_name}
              </Descriptions.Item>
              
              {mad.observations && (
                <Descriptions.Item label="Observations" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {mad.observations}
                  </div>
                </Descriptions.Item>
              )}
              
              {mad.engagement && (
                <Descriptions.Item label="Engagement" span={2}>
                  <Space>
                    <Button 
                      type="link" 
                      style={{ padding: 0 }}
                      onClick={() => navigate(`/engagements/${mad.engagement.id}`)}
                    >
                      {mad.engagement.numero}
                    </Button>
                    <Tag color="success">Créé</Tag>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Informations de la demande */}
          <Card title="Détails de la demande de location">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Demandeur">
                {mad.demande_location.demandeur?.first_name} {mad.demande_location.demandeur?.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Département">
                {mad.demande_location.departement}
              </Descriptions.Item>
              
              <Descriptions.Item label="Durée">
                {mad.demande_location.duree_mois} mois
              </Descriptions.Item>
              <Descriptions.Item label="Budget prévisionnel">
                {formatCurrency(mad.demande_location.budget_previsionnel_mru)} MRU
              </Descriptions.Item>
              
              <Descriptions.Item label="Date création">
                {formatDate(mad.demande_location.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="Date validation">
                {mad.demande_location.date_validation ? 
                  formatDate(mad.demande_location.date_validation) : 
                  'Non validée'
                }
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          {/* Historique */}
          <Card title="Historique">
            <Timeline>
              <Timeline.Item color="blue">
                <div>
                  <strong>Création MAD</strong>
                  <br />
                  <small>{formatDateTime(mad.created_at)}</small>
                  <br />
                  <small>Par {mad.responsable.first_name} {mad.responsable.last_name}</small>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color={mad.conforme ? 'green' : 'orange'}
              >
                <div>
                  <strong>
                    {mad.conforme ? 'Marqué conforme' : 'Marqué non conforme'}
                  </strong>
                  <br />
                  <small>{formatDateTime(mad.created_at)}</small>
                </div>
              </Timeline.Item>
              
              {mad.engagement && (
                <Timeline.Item color="purple">
                  <div>
                    <strong>Engagement créé</strong>
                    <br />
                    <small>{formatDateTime(mad.engagement.created_at)}</small>
                    <br />
                    <small>N° {mad.engagement.numero}</small>
                  </div>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* Modal conformité */}
      <Modal
        title="Modifier la conformité"
        open={conformiteModalVisible}
        onOk={handleConformiteChange}
        onCancel={() => setConformiteModalVisible(false)}
        okText="Confirmer"
        cancelText="Annuler"
      >
        <Form form={conformiteForm} layout="vertical">
          <Form.Item
            name="conforme"
            valuePropName="checked"
          >
            <Checkbox>
              Le matériel est conforme aux spécifications
            </Checkbox>
          </Form.Item>
          
          <Form.Item
            name="observations"
            label="Observations"
            rules={[
              { 
                required: true, 
                message: 'Veuillez préciser les observations' 
              }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Précisez les raisons du changement de conformité..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MiseADispositionDetail;
