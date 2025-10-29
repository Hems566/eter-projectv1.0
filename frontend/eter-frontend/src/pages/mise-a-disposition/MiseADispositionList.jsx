import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  DatePicker,
  Card,
  Row,
  Col,
  Statistic,
  Dropdown,
  Tooltip,
  Menu,
  Modal,
  message
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MoreOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import '@ant-design/v5-patch-for-react-19';
import { useNavigate } from 'react-router-dom';
import { useMisesADispositionStore } from '../../store/misesADispositionStore';
import { misesADispositionAPI } from '../../services/misesADisposition';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';
import { usePermissions } from '../../hooks/usePermissions';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MiseADispositionsList = () => {
  const navigate = useNavigate();
  const { 
        canManageMAD,
        canManageEngagements,
        canAccessResource,
        isAcheteur,
        user 
      } = usePermissions();
  const { 
    misesADisposition, 
    loading, 
    pagination, 
    fetchMisesADisposition 
  } = useMisesADispositionStore();

  const [filters, setFilters] = useState({
    search: '',
    conforme: '',
    fournisseur: '',
    date_range: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
  console.log('MisesADisposition from store:', misesADisposition);
}, [misesADisposition]);

  const loadData = (params = {}) => {
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

    fetchMisesADisposition(queryParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadData({ search: value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadData({ ...newFilters, page: 1 });
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: 'Supprimer la mise à disposition',
      content: `Êtes-vous sûr de vouloir supprimer la mise à disposition "${record.demande_location_numero}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await misesADispositionAPI.delete(record.id);
          message.success('Mise à disposition supprimée avec succès');
          loadData(); // Recharger la liste
        } catch (error) {
          message.error('Erreur lors de la suppression');
          console.error('Erreur de suppression:', error);
        }
      },
    });
  };

  const getActionMenu = (record) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/mises-a-disposition/${record.id}`)}
      >
        Voir détail
      </Menu.Item>
      
      {canEdit(record) && (
        <>
          <Menu.Item
            key="edit"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mises-a-disposition/${record.id}/edit`)}
          >
            Modifier
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            key="delete"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record)}
          >
            Supprimer
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  const columns = [
    {
      title: 'Demande',
      dataIndex: 'demande_location_numero',
      key: 'demande_numero',
      width: 120,
      fixed: 'left',
      render: (numero, record) => (
        <div>
          <strong>{numero}</strong>
          <br />
          <small style={{ color: '#666' }}>
            {record.demande_location?.departement}
          </small>
        </div>
      ),
    },
    {
      title: 'Chantier',
      dataIndex: 'chantier',
      key: 'chantier',
      width: 140,
      ellipsis: true,
      render: (chantier) => (
        <Tooltip title={chantier}>
          {chantier}
        </Tooltip>
      ),
    },
    {
      title: 'Fournisseur',
      dataIndex: 'fournisseur_nom',
      key: 'fournisseur',
      width: 140,
      render: (raison_sociale, record) => (
        <div>
          <strong>{raison_sociale}</strong>
        </div>
      ),
    },
    {
      title: 'Date MAD',
      dataIndex: 'date_mise_disposition',
      key: 'date_mad',
      width: 110,
      render: (date) => formatDate(date),
      sorter: true,
    },
    {
      title: 'Immatriculation',
      dataIndex: 'immatriculation',
      key: 'immatriculation',
      width: 140,
    },
    {
      title: 'Conformité',
      dataIndex: 'conforme',
      key: 'conforme',
      width: 100,
      align: 'center',
      render: (conforme) => (
        <Tag 
          icon={conforme ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          color={conforme ? 'success' : 'warning'}
        >
          {conforme ? 'Conforme' : 'Non conforme'}
        </Tag>
      ),
    },
    {
      title: 'Engagement',
      key: 'engagement',
      width: 100,
      align: 'center',
      render: (_, record) => (
        record.a_engagement ? (
          <Tag color="success">
            <FileTextOutlined /> Créé
          </Tag>
        ) : (
          <Tag color="default">En attente</Tag>
        )
      ),
    },
    {
      title: 'Responsable',
      dataIndex: 'responsable_nom', 
      key: 'responsable',
      width: 120,
      render: (nom) => (nom)
      
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 85,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          overlay={getActionMenu(record)}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    }
  ];

  const canEdit = (record) => {
    return canManageMAD && 
           (user?.is_admin || record.responsable?.id === user?.id);
  };

  const canCreate = () => {
    return canManageMAD;
  };

  // Statistiques
  const stats = {
    total: misesADisposition.length,
    conformes: misesADisposition.filter(mad => mad.conforme).length,
    non_conformes: misesADisposition.filter(mad => !mad.conforme).length,
    avec_engagement: misesADisposition.filter(mad => mad.a_engagement).length,
  };

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <h2 style={{ margin: 0 }}>Mises à disposition</h2>
            <p style={{ margin: 0, color: '#666' }}>
              Gestion des mises à disposition de matériel
            </p>
          </Col>
          <Col>
            <Space>
              {canCreate() && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/mises-a-disposition/create')}
                >
                  Nouvelle MAD
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total MAD"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Conformes"
              value={stats.conformes}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Non conformes"
              value={stats.non_conformes}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avec engagement"
              value={stats.avec_engagement}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtres et tableau */}
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="Rechercher par demande, chantier, fournisseur..."
              allowClear
              onSearch={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Conformité"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('conforme', value)}
            >
              <Option value="true">Conforme</Option>
              <Option value="false">Non conforme</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Date début', 'Date fin']}
              style={{ width: '100%' }}
              onChange={(dates) => handleFilterChange('date_range', dates)}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={misesADisposition}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} mises à disposition`,
            onChange: (page, pageSize) => {
              loadData({ page, page_size: pageSize });
            },
          }}
        />
      </Card>
    </div>
  );
};

export default MiseADispositionsList;