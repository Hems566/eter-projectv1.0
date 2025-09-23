import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Modal, 
  Form,
  Input,
  message,
  Divider,
  Row,
  Col,
  Steps,
  Timeline,
  Statistic
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CheckOutlined, 
  CloseOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { demandesAPI } from '../../services/demandes';
import { formatCurrency, getStatusColor, formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

const { TextArea } = Input;
const { Step } = Steps;

const DemandeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [validationAction, setValidationAction] = useState('');
  const [validationForm] = Form.useForm();

  useEffect(() => {
    loadDemande();
  }, [id]);

  const loadDemande = async () => {
    setLoading(true);
    try {
      const response = await demandesAPI.get(id);
      setDemande(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement de la demande');
      navigate('/demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    try {
      const values = await validationForm.validateFields();
      const response = await demandesAPI.validate(id, {
        action: validationAction,
        observations: values.observations
      });
      
      message.success(
        validationAction === 'valider' 
          ? 'Demande validée avec succès' 
          : 'Demande rejetée'
      );
      
      setValidationModalVisible(false);
      loadDemande(); // Recharger les données
    } catch (error) {
      message.error('Erreur lors de la validation');
    }
  };

  const canEdit = () => {
    return demande && 
           (demande.statut === 'BROUILLON' || demande.statut === 'REJETEE') &&
           (user?.id === demande.demandeur?.id || user?.is_admin);
  };

  const canValidate = () => {
    return demande && 
           demande.statut === 'SOUMISE' &&
           (user?.is_admin || user?.is_acheteur);
  };

  const getStatusStep = (statut) => {
    const steps = {
      'BROUILLON': 0,
      'SOUMISE': 1,
      'VALIDEE': 2,
      'REJETEE': 1,
      'MISE_A_DISPOSITION': 3,
      'ENGAGEMENT_CREE': 4
    };
    return steps[statut] || 0;
  };

  const materielsColumns = [
    {
      title: 'Type de matériel',
      dataIndex: ['materiel', 'type_materiel'],
      key: 'type_materiel',
    },
    {
      title: 'Type facturation',
      dataIndex: ['materiel', 'type_facturation'],
      key: 'type_facturation',
      render: (type) => {
        const colors = {
          'PAR_JOUR': 'blue',
          'PAR_HEURE': 'green',
          'FORFAITAIRE': 'orange'
        };
        const labels = {
          'PAR_JOUR': 'Par jour',
          'PAR_HEURE': 'Par heure',
          'FORFAITAIRE': 'Forfaitaire'
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      }
    },
    {
      title: 'Prix unitaire (MRU)',
      dataIndex: ['materiel', 'prix_unitaire_mru'],
      key: 'prix_unitaire',
      align: 'right',
      render: (prix) => formatCurrency(prix),
    },
    {
      title: 'Quantité',
      dataIndex: 'quantite',
      key: 'quantite',
      align: 'center',
    },
    {
      title: 'Sous-total (MRU)',
      dataIndex: 'sous_total',
      key: 'sous_total',
      align: 'right',
      render: (montant) => formatCurrency(montant),
    },
    {
      title: 'Observations',
      dataIndex: 'observations',
      key: 'observations',
      ellipsis: true,
    },
  ];

  if (loading) {
    return <Card loading={true} />;
  }

  if (!demande) {
    return <Card>Demande non trouvée</Card>;
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
                onClick={() => navigate('/demandes')}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Demande {demande.numero}
                  <Tag 
                    color={getStatusColor(demande.statut)} 
                    style={{ marginLeft: 16 }}
                  >
                    {demande.statut_display}
                  </Tag>
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Créée le {formatDateTime(demande.created_at)}
                </p>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {canEdit() && (
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/demandes/${id}/edit`)}
                >
                  Modifier
                </Button>
              )}
              
              {canValidate() && (
                <>
                  <Button 
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => {
                      setValidationAction('valider');
                      setValidationModalVisible(true);
                    }}
                  >
                    Valider
                  </Button>
                  <Button 
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setValidationAction('rejeter');
                      setValidationModalVisible(true);
                    }}
                  >
                    Rejeter
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Progression */}
      <Card style={{ marginBottom: 24 }}>
        <Steps 
          current={getStatusStep(demande.statut)} 
          status={demande.statut === 'REJETEE' ? 'error' : 'process'}
        >
          <Step title="Brouillon" icon={<FileTextOutlined />} />
          <Step title="Soumise" icon={<UserOutlined />} />
          <Step title="Validée" icon={<CheckOutlined />} />
          <Step title="Mise à disposition" />
          <Step title="Engagement créé" />
        </Steps>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations principales */}
          <Card title="Informations générales" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro" span={1}>
                {demande.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={1}>
                <Tag color={getStatusColor(demande.statut)}>
                  {demande.statut_display}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Chantier" span={2}>
                {demande.chantier}
              </Descriptions.Item>
              
              <Descriptions.Item label="Demandeur" span={1}>
                {demande.demandeur?.first_name} {demande.demandeur?.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Département" span={1}>
                {demande.departement}
              </Descriptions.Item>
              
              <Descriptions.Item label="Durée" span={1}>
                {demande.duree_mois} mois
              </Descriptions.Item>
              <Descriptions.Item label="Budget prévisionnel" span={1}>
                <strong style={{ color: '#1890ff' }}>
                  {formatCurrency(demande.budget_previsionnel_mru)} MRU
                </strong>
              </Descriptions.Item>
              
              <Descriptions.Item label="Date de création" span={1}>
                {formatDateTime(demande.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="Dernière modification" span={1}>
                {formatDateTime(demande.updated_at)}
              </Descriptions.Item>
              
              {demande.validateur && (
                <>
                  <Descriptions.Item label="Validateur" span={1}>
                    {demande.validateur.first_name} {demande.validateur.last_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date validation" span={1}>
                    {formatDateTime(demande.date_validation)}
                  </Descriptions.Item>
                </>
              )}
              
              {demande.observations && (
                <Descriptions.Item label="Observations" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {demande.observations}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Matériels demandés */}
          <Card 
            title={`Matériels demandés (${demande.materiels_demandes?.length || 0})`}
            style={{ marginBottom: 24 }}
          >
            <Table
              columns={materielsColumns}
              dataSource={demande.materiels_demandes}
              rowKey="id"
              pagination={false}
              size="middle"
              summary={(pageData) => {
                const total = pageData.reduce((sum, record) => sum + parseFloat(record.sous_total), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={4} index={0}>
                        <strong>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong style={{ color: '#1890ff' }}>
                          {formatCurrency(total)} MRU
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques */}
          <Card style={{ marginBottom: 24 }}>
            <Statistic
              title="Budget total estimé"
              value={demande.budget_previsionnel_mru}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600' }}
            />
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Matériels"
                  value={demande.materiels_demandes?.length || 0}
                  suffix="types"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Durée"
                  value={demande.duree_mois}
                  suffix="mois"
                />
              </Col>
            </Row>
          </Card>

          {/* Historique */}
          <Card title="Historique">
            <Timeline>
              <Timeline.Item color="blue">
                <div>
                  <strong>Création</strong>
                  <br />
                  <small>{formatDateTime(demande.created_at)}</small>
                  <br />
                  <small>Par {demande.demandeur?.first_name} {demande.demandeur?.last_name}</small>
                </div>
              </Timeline.Item>
              
              {demande.date_validation && (
                <Timeline.Item 
                  color={demande.statut === 'VALIDEE' ? 'green' : 'red'}
                >
                  <div>
                    <strong>
                      {demande.statut === 'VALIDEE' ? 'Validation' : 'Rejet'}
                    </strong>
                    <br />
                    <small>{formatDateTime(demande.date_validation)}</small>
                    <br />
                    <small>Par {demande.validateur?.first_name} {demande.validateur?.last_name}</small>
                  </div>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* Modal de validation */}
      <Modal
        title={`${validationAction === 'valider' ? 'Valider' : 'Rejeter'} la demande`}
        open={validationModalVisible}
        onOk={handleValidation}
        onCancel={() => setValidationModalVisible(false)}
        okText="Confirmer"
        cancelText="Annuler"
        okButtonProps={{ 
          danger: validationAction === 'rejeter',
          type: validationAction === 'valider' ? 'primary' : 'default'
        }}
      >
        <Form form={validationForm} layout="vertical">
          <Form.Item
            name="observations"
            label="Observations"
            rules={[
              { 
                required: validationAction === 'rejeter', 
                message: 'Veuillez préciser le motif du rejet' 
              }
            ]}
          >
            <TextArea
              rows={4}
              placeholder={
                validationAction === 'valider' 
                  ? "Commentaires sur la validation (optionnel)"
                  : "Motif du rejet (obligatoire)"
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DemandeDetail;
