// pages/fournisseurs/FournisseursList.jsx
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
  Switch
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFournisseursStore } from '../../store/fournisseursStore';
import { formatDateTime } from '../../utils/formatters';

const { Search } = Input;
const { confirm } = Modal;

const FournisseursList = () => {
  const navigate = useNavigate();
  const {
    fournisseurs,
    loading,
    pagination,
    fetchFournisseurs,
    deleteFournisseur,
    updateFournisseur
  } = useFournisseursStore();

  const [filters, setFilters] = useState({
    search: '',
    actif: null,
  });

  useEffect(() => {
    loadFournisseurs();
  }, []);

  const loadFournisseurs = async (params = {}) => {
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

    await fetchFournisseurs(searchParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadFournisseurs({ search: value, page: 1 });
  };

  const handleTableChange = (pagination, tableFilters, sorter) => {
    loadFournisseurs({
      page: pagination.current,
      page_size: pagination.pageSize,
      ordering: sorter.order ? 
        `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : 
        undefined
    });
  };

  const handleDelete = async (fournisseur) => {
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
          loadFournisseurs();
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const handleToggleActif = async (fournisseur) => {
    const result = await updateFournisseur(fournisseur.id, {
      actif: !fournisseur.actif
    });
    
    if (result.success) {
      message.success(`Fournisseur ${fournisseur.actif ? 'désactivé' : 'activé'} avec succès`);
      loadFournisseurs();
    } else {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const getActionMenu = (fournisseur) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/fournisseurs/${fournisseur.id}`)}
      >
        Voir détail
      </Menu.Item>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/fournisseurs/${fournisseur.id}/edit`)}
      >
        Modifier
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDelete(fournisseur)}
      >
        Supprimer
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'NIF',
      dataIndex: 'nif',
      key: 'nif',
      width: 120,
      render: (nif) => <code style={{ color: '#1890ff' }}>{nif}</code>,
    },
    {
      title: 'Raison sociale',
      dataIndex: 'raison_sociale',
      key: 'raison_sociale',
      sorter: true,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          {record.telephone && (
            <div style={{ fontSize: '12px' }}>
              <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              {record.telephone}
            </div>
          )}
          {record.adresse && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              {record.adresse.substring(0, 50)}
              {record.adresse.length > 50 && '...'}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'actif',
      width: 100,
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
      title: 'Créé le',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: true,
      render: (date) => formatDateTime(date),
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
    total: fournisseurs.length,
    actifs: fournisseurs.filter(f => f.actif).length,
    inactifs: fournisseurs.filter(f => !f.actif).length,
  };

  return (
    <div>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total fournisseurs"
              value={pagination.total || stats.total}
              valueStyle={{ color: '#1890ff' }}
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
              title="Inactifs"
              value={stats.inactifs}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/fournisseurs/create')}
              size="large"
            >
              Nouveau fournisseur
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Table des fournisseurs */}
      <Card
        title="Liste des fournisseurs"
        extra={
          <Space>
            <Search
              placeholder="Rechercher par raison sociale, NIF..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 300 }}
              enterButton={<SearchOutlined />}
            />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={fournisseurs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} fournisseurs`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default FournisseursList;
