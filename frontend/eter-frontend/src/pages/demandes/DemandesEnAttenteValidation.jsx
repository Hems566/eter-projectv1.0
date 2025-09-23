import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Card,
  Row,
  Col,
  message,
  Modal,
  Form,
  Statistic
} from 'antd';
import { 
  EyeOutlined, 
  CheckOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { demandesAPI } from '../../services/demandes';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

const { Search } = Input;
const { TextArea } = Input;

const DemandesEnAttenteValidation = () => {
  const navigate = useNavigate();
  const { canValidateDL } = usePermissions();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [validationAction, setValidationAction] = useState('');
  const [validationForm] = Form.useForm();

  useEffect(() => {
    if (!canValidateDL) {
      message.error('Vous n\'avez pas les permissions pour accéder à cette page');
      navigate('/demandes');
      return;
    }
    loadDemandes();
  }, [canValidateDL, navigate]);

  const loadDemandes = async () => {
    setLoading(true);
    try {
      const response = await demandesAPI.enAttenteValidation();
      setDemandes(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async () => {
    try {
      const values = await validationForm.validateFields();
      
      await demandesAPI.valider(selectedDemande.id, {
        action: validationAction,
        observations: values.observations
      });
      
      message.success(
        validationAction === 'valider' 
          ? 'Demande validée avec succès' 
          : 'Demande rejetée'
      );
      
      setValidationModalVisible(false);
      setSelectedDemande(null);
      validationForm.resetFields();
      loadDemandes(); // Recharger la liste
    } catch (error) {
      console.error('Erreur validation:', error);
      message.error('Erreur lors de la validation');
    }
  };

  const openValidationModal = (demande, action) => {
    setSelectedDemande(demande);
    setValidationAction(action);
    setValidationModalVisible(true);
    validationForm.resetFields();
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      width: 140,
      fixed: 'left',
    },
    {
      title: 'Demandeur',
      key: 'demandeur',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.demandeur?.first_name} {record.demandeur?.last_name}</div>
          <small style={{ color: '#666' }}>{record.departement}</small>
        </div>
      ),
    },
    {
      title: 'Chantier',
      dataIndex: 'chantier',
      key: 'chantier',
      ellipsis: true,
    },
    {
      title: 'Durée',
      dataIndex: 'duree_mois',
      key: 'duree',
      width: 80,
      align: 'center',
      render: (duree) => `${duree} mois`,
    },
    {
      title: 'Budget (MRU)',
      dataIndex: 'budget_previsionnel_mru',
      key: 'budget',
      width: 140,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Date soumission',
      dataIndex: 'updated_at',
      key: 'date_soumission',
      width: 120,
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
    },
    {
      title: 'Matériels',
      key: 'materiels_count',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <span>{record.materiels_demandes?.length || 0}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/demandes/${record.id}`)}
          >
            Voir
          </Button>
          <Button
            icon={<CheckOutlined />}
            size="small"
            style={{ color: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => openValidationModal(record, 'valider')}
          >
            Valider
          </Button>
          <Button
            icon={<CloseOutlined />}
            size="small"
            danger
            onClick={() => openValidationModal(record, 'rejeter')}
          >
            Rejeter
          </Button>
        </Space>
      ),
    },
  ];

  // Statistiques rapides
  const stats = {
    total: demandes.length,
    montant_total: demandes.reduce((sum, d) => sum + parseFloat(d.budget_previsionnel_mru || 0), 0),
    par_departement: demandes.reduce((acc, d) => {
      acc[d.departement] = (acc[d.departement] || 0) + 1;
      return acc;
    }, {}),
  };

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
                  <ClockCircleOutlined style={{ marginRight: 8 }} />
                  Demandes en attente de validation
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {stats.total} demande(s) soumise(s) en attente de votre validation
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total en attente"
              value={stats.total}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Budget total (MRU)"
              value={stats.montant_total}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <div>
              <strong>Par département:</strong>
              <div style={{ marginTop: 8 }}>
                {Object.entries(stats.par_departement).map(([dept, count]) => (
                  <Tag key={dept} style={{ marginBottom: 4 }}>
                    {dept}: {count}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Message si aucune demande */}
      {demandes.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <CheckOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            <h3>Aucune demande en attente</h3>
            <p>Toutes les demandes soumises ont été traitées.</p>
            <Button 
              type="primary" 
              onClick={() => navigate('/demandes')}
            >
              Voir toutes les demandes
            </Button>
          </div>
        </Card>
      )}

      {/* Tableau */}
      {demandes.length > 0 && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Search
              placeholder="Rechercher par numéro, demandeur, chantier..."
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => {
                // Filtrage côté client pour simplifier
                const filtered = demandes.filter(d => 
                  d.numero.toLowerCase().includes(value.toLowerCase()) ||
                  d.chantier.toLowerCase().includes(value.toLowerCase()) ||
                  `${d.demandeur?.first_name} ${d.demandeur?.last_name}`.toLowerCase().includes(value.toLowerCase())
                );
                setDemandes(filtered);
              }}
            />
          </div>

          <Table
            columns={columns}
            dataSource={demandes}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} sur ${total} demandes`,
            }}
          />
        </Card>
      )}

      {/* Modal de validation */}
      <Modal
        title={`${validationAction === 'valider' ? 'Valider' : 'Rejeter'} la demande ${selectedDemande?.numero}`}
        open={validationModalVisible}
        onOk={handleValidation}
        onCancel={() => {
          setValidationModalVisible(false);
          setSelectedDemande(null);
          validationForm.resetFields();
        }}
        okText="Confirmer"
        cancelText="Annuler"
        okButtonProps={{ 
          danger: validationAction === 'rejeter',
          type: validationAction === 'valider' ? 'primary' : 'default'
        }}
      >
        {selectedDemande && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>Demandeur:</strong> {selectedDemande.demandeur?.first_name} {selectedDemande.demandeur?.last_name}</p>
            <p><strong>Chantier:</strong> {selectedDemande.chantier}</p>
            <p><strong>Budget:</strong> {formatCurrency(selectedDemande.budget_previsionnel_mru)} MRU</p>
            <p><strong>Matériels:</strong> {selectedDemande.materiels_demandes?.length || 0} type(s)</p>
          </div>
        )}

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

export default DemandesEnAttenteValidation;
