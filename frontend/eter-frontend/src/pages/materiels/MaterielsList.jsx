// pages/materiels/MaterielsList.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Dropdown,
  Menu,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Switch,
  Select,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ToolOutlined,
  DollarOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import '@ant-design/v5-patch-for-react-19';
import { useMaterielsStore } from '../../store/materielsStore';
import { formatCurrency } from '../../utils/formatters';

const { Search } = Input;
const { Option } = Select;

// Constantes pour les types de matériel
const TYPE_MATERIEL_OPTIONS = [
  { value: 'NIVELEUSE', label: 'Niveleuse', color: 'blue' },
  { value: 'BULLDOZER', label: 'Bulldozer', color: 'orange' },
  { value: 'EXCAVATRICE', label: 'Excavatrice', color: 'green' },
  { value: 'COMPACTEUR', label: 'Compacteur', color: 'purple' },
  { value: 'CAMION', label: 'Camion', color: 'red' },
  { value: 'VEHICULE_LEGER', label: 'Véhicule léger', color: 'cyan' },
  { value: 'GROUPE_ELECTROGENE', label: 'Groupe électrogène', color: 'gold' },
  { value: 'AUTRE', label: 'Autre équipement', color: 'default' },
];

const TYPE_FACTURATION_OPTIONS = [
  { value: 'PAR_JOUR', label: 'Par jour', icon: '📅' },
  { value: 'PAR_HEURE', label: 'Par heure', icon: '⏰' },
  { value: 'FORFAITAIRE', label: 'Forfaitaire', icon: '💰' },
];

const MaterielsList = () => {
  const navigate = useNavigate();
  const {
    materiels,
    loading,
    pagination,
    fetchMateriels,
    deleteMateriel,
    updateMateriel
  } = useMaterielsStore();

  const [filters, setFilters] = useState({
    search: '',
    type_materiel: null,
    type_facturation: null,
    actif: null,
  });

  useEffect(() => {
    loadMateriels();
  }, []);

  const loadMateriels = async (params = {}) => {
    const searchParams = {
      page: pagination.current,
      page_size: pagination.pageSize,
      ...filters,
      ...params
    };

    // Nettoyer les paramètres vides
    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] === '' || searchParams[key] === null) {
        delete searchParams[key];
      }
    });

    await fetchMateriels(searchParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadMateriels({ search: value, page: 1 });
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadMateriels({ ...newFilters, page: 1 });
  };

  const handleTableChange = (pagination, tableFilters, sorter) => {
    loadMateriels({
      page: pagination.current,
      page_size: pagination.pageSize,
      ordering: sorter.order ? 
        `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : 
        undefined
    });
  };

  const handleDelete = async (materiel) => {
    Modal.confirm({
      title: 'Supprimer le matériel',
      content: `Êtes-vous sûr de vouloir supprimer "${materiel.type_materiel}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteMateriel(materiel.id);
        if (result.success) {
          message.success('Matériel supprimé avec succès');
          loadMateriels();
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const handleToggleActif = async (materiel) => {
    const result = await updateMateriel(materiel.id, {
      actif: !materiel.actif
    });
    
    if (result.success) {
      message.success(`Matériel ${materiel.actif ? 'désactivé' : 'activé'} avec succès`);
      loadMateriels();
    } else {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const getTypeColor = (type) => {
    const option = TYPE_MATERIEL_OPTIONS.find(opt => opt.value === type);
    return option ? option.color : 'default';
  };

  const getTypeLabel = (type) => {
    const option = TYPE_MATERIEL_OPTIONS.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getFacturationInfo = (type) => {
    const option = TYPE_FACTURATION_OPTIONS.find(opt => opt.value === type);
    return option ? { label: option.label, icon: option.icon } : { label: type, icon: '💰' };
  };

  const getActionMenu = (materiel) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/materiels/${materiel.id}`)}
      >
        Voir détail
      </Menu.Item>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/materiels/${materiel.id}/edit`)}
      >
        Modifier
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDelete(materiel)}
      >
        Supprimer
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Type de matériel',
      dataIndex: 'type_materiel',
      key: 'type_materiel',
      sorter: true,
      render: (type) => (
        <Tag color={getTypeColor(type)} icon={<ToolOutlined />}>
          {getTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: 'Prix unitaire',
      dataIndex: 'prix_unitaire_mru',
      key: 'prix_unitaire_mru',
      sorter: true,
      align: 'right',
      render: (prix, record) => {
        const facturationInfo = getFacturationInfo(record.type_facturation);
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
              {formatCurrency(prix)} MRU
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {facturationInfo.icon} {facturationInfo.label}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Type de facturation',
      dataIndex: 'type_facturation',
      key: 'type_facturation',
      width: 150,
      filters: TYPE_FACTURATION_OPTIONS.map(opt => ({
        text: opt.label,
        value: opt.value
      })),
      render: (type) => {
        const info = getFacturationInfo(type);
        return (
          <Tag color="blue">
            {info.icon} {info.label}
          </Tag>
        );
      },
    },
    {
      title: 'Observations',
      dataIndex: 'observations',
      key: 'observations',
      ellipsis: {
        showTitle: false,
      },
      render: (observations) => (
        observations ? (
          <Tooltip title={observations}>
            <span style={{ color: '#666' }}>
              {observations.substring(0, 50)}
              {observations.length > 50 && '...'}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: '#ccc' }}>Aucune observation</span>
        )
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'actif',
      width: 120,
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false },
      ],
      render: (actif, record) => (
        <Switch
          checked={actif}
          onChange={() => handleToggleActif(record)}
          checkedChildren="Actif"
          unCheckedChildren="Inactif"
          size="small"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Statistiques rapides
  const stats = {
    total: materiels.length,
    actifs: materiels.filter(m => m.actif).length,
    inactifs: materiels.filter(m => !m.actif).length,
    prixMoyen: materiels.length > 0 
      ? materiels.reduce((sum, m) => sum + parseFloat(m.prix_unitaire_mru), 0) / materiels.length 
      : 0
  };

  return (
    <div>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total matériels"
              value={pagination.total || stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Actifs"
              value={stats.actifs}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Prix moyen"
              value={stats.prixMoyen}
              precision={2}
              suffix="MRU"
              valueStyle={{ color: '#722ed1' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/materiels/create')}
              size="large"
            >
              Nouveau matériel
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Filtres et recherche */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="Rechercher par type, observations..."
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Type de matériel"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('type_materiel', value)}
            >
              {TYPE_MATERIEL_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Facturation"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('type_facturation', value)}
            >
              {TYPE_FACTURATION_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Statut"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('actif', value)}
            >
              <Option value={true}>Actif</Option>
              <Option value={false}>Inactif</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setFilters({ search: '', type_materiel: null, type_facturation: null, actif: null });
                loadMateriels({ page: 1 });
              }}
            >
              Réinitialiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table des matériels */}
      <Card title="Liste des matériels">
        <Table
          columns={columns}
          dataSource={materiels}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} matériels`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default MaterielsList;
