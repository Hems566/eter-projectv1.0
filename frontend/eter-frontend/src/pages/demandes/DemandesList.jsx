import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  DatePicker,
  Card,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined,
  ClockCircleOutlined,
  SearchOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDemandesStore } from '../../store/demandesStore';
import { formatCurrency, getStatusColor } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';
import { demandesAPI } from '../../services/demandes';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DemandesList = () => {
  const navigate = useNavigate();
  const { 
    canCreateDL, 
    canValidateDL, 
    canAccessResource,
    isAcheteur,
    user 
  } = usePermissions();
  const { 
    demandes, 
    loading, 
    pagination, 
    fetchDemandes 
  } = useDemandesStore();

  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    departement: '',
    date_range: null,
  });

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = (params = {}) => {
    const queryParams = {
      page: pagination.current,
      page_size: pagination.pageSize,
      ...filters,
      ...params,
    };

    // Nettoyer les paramètres vides
    Object.keys(queryParams).forEach(key => {
      if (!queryParams[key]) {
        delete queryParams[key];
      }
    });

    fetchDemandes(queryParams);
  };

  const goToEnAttenteValidation = () => {
    navigate('/demandes/en-attente-validation');
  };

  const [demandesEnAttente, setDemandesEnAttente] = useState(0);

  useEffect(() => {
    if (canValidateDL) {
      loadDemandesEnAttente();
    }
  }, [canValidateDL]);

  const loadDemandesEnAttente = async () => {
    try {
      const response = await demandesAPI.enAttenteValidation();
      setDemandesEnAttente(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Erreur chargement demandes en attente:', error);
    }
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadDemandes({ search: value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadDemandes({ ...newFilters, page: 1 });
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'Chantier',
      dataIndex: 'chantier',
      key: 'chantier',
      ellipsis: true,
    },
    {
      title: 'Demandeur',
      dataIndex: ['demandeur', 'first_name'],
      key: 'demandeur',
      render: (_, record) => 
        `${record.demandeur?.first_name} ${record.demandeur?.last_name}`,
    },
    {
      title: 'Département',
      dataIndex: 'departement',
      key: 'departement',
      width: 100,
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
      title: 'Matériels',
      dataIndex: 'materiels_count',
      key: 'materiels_count',
      width: 80,
      align: 'center',
    },
    {
      title: 'Date création',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date) => new Date(date).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/demandes/${record.id}`)}
          />
          {canEditDemande(record) && (
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/demandes/${record.id}/edit`)}
            />
          )}
        </Space>
      ),
    },
  ];
  const canEditDemande = (demande) => {
    return (demande.statut === 'BROUILLON' || demande.statut === 'REJETEE') &&
           (demande.demandeur?.id === user?.id || canValidateDL);
  };
  return (
    <div>
      {/* Statistiques rapides */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total demandes"
              value={pagination.total}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En attente"
              value={demandes.filter(d => d.statut === 'SOUMISE').length}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Validées"
              value={demandes.filter(d => d.statut === 'VALIDEE').length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Budget total (MRU)"
              value={demandes.reduce((sum, d) => sum + parseFloat(d.budget_previsionnel_mru || 0), 0)}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtres et actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle">
              <Search
                placeholder="Rechercher par numéro, chantier..."
                allowClear
                style={{ width: 250 }}
                onSearch={handleSearch}
              />
              
              <Select
                placeholder="Statut"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => handleFilterChange('statut', value)}
              >
                <Option value="BROUILLON">Brouillon</Option>
                <Option value="SOUMISE">Soumise</Option>
                <Option value="VALIDEE">Validée</Option>
                <Option value="REJETEE">Rejetée</Option>
              </Select>

              <Select
                placeholder="Département"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange('departement', value)}
              >
                <Option value="DTX">DTX</Option>
                <Option value="DAL">DAL</Option>
                <Option value="CFG">DEM</Option>
              </Select>
            </Space>
          </Col>
          
          <Col>
           <Space>
              {/* ✅ Afficher le bouton seulement si l'utilisateur peut créer */}
              {(canCreateDL || isAcheteur) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/demandes/create')}
                >
                  Nouvelle demande
                </Button>
              )}
              {/* ✅ Afficher les demandes en attente seulement si peut valider */}
              {canValidateDL && (
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={goToEnAttenteValidation}
                  style={{
                    borderColor: demandesEnAttente > 0 ? '#ff4d4f' : undefined,
                    color: demandesEnAttente > 0 ? '#ff4d4f' : undefined,
                  }}
                >
                  En attente validation
                  {demandesEnAttente > 0 && (
                    <span style={{
                      marginLeft: 4,
                      background: '#ff4d4f',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '12px'
                    }}>
                      {demandesEnAttente}
                    </span>
                  )}
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tableau */}
      <Card>
        <Table
          columns={columns}
          dataSource={demandes}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} demandes`,
            onChange: (page, pageSize) => {
              loadDemandes({ page, page_size: pageSize });
            },
          }}
        />
      </Card>
    </div>
  );
};

export default DemandesList;
