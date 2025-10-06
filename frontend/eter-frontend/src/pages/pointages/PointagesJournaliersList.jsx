// pages/pointages/PointagesJournaliersList.jsx
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
  Select,
  DatePicker,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  CalendarOutlined,
  ToolOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import '@ant-design/v5-patch-for-react-19';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePointagesStore } from '../../store/pointagesStore';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';


const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PointagesJournaliersList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    pointagesJournaliers,
    loading,
    pagination,
    fetchPointagesJournaliers,
    deletePointageJournalier
  } = usePointagesStore();

  const [filters, setFilters] = useState({
    search: '',
    fiche_pointage: searchParams.get('fiche_id') || null,
    date_range: null,
    jour_semaine: null,
  });

  useEffect(() => {
    loadPointages();
  }, []);

  const loadPointages = async (params = {}) => {
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

    // Traiter la plage de dates
    if (searchParams.date_range && Array.isArray(searchParams.date_range)) {
      searchParams.date_pointage__gte = searchParams.date_range[0].format('YYYY-MM-DD');
      searchParams.date_pointage__lte = searchParams.date_range[1].format('YYYY-MM-DD');
      delete searchParams.date_range;
    }

    await fetchPointagesJournaliers(searchParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadPointages({ search: value, page: 1 });
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadPointages({ ...newFilters, page: 1 });
  };

  const handleTableChange = (pagination, tableFilters, sorter) => {
    loadPointages({
      page: pagination.current,
      page_size: pagination.pageSize,
      ordering: sorter.order ? 
        `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : 
        undefined
    });
  };

  const handleDelete = async (pointage) => {
    Modal.confirm({
      title: 'Supprimer le pointage',
      content: `Êtes-vous sûr de vouloir supprimer le pointage du ${formatDate(pointage.date_pointage)} ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deletePointageJournalier(pointage.id);
        if (result.success) {
          message.success('Pointage supprimé avec succès');
          loadPointages();
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const getJourColor = (jour) => {
    const colors = {
      'LUNDI': 'blue',
      'MARDI': 'green',
      'MERCREDI': 'orange',
      'JEUDI': 'purple',
      'VENDREDI': 'cyan',
      'SAMEDI': 'gold',
      'DIMANCHE': 'red'
    };
    return colors[jour] || 'default';
  };

  const getActionMenu = (pointage) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/pointages/journaliers/${pointage.id}`)}
      >
        Voir détail
      </Menu.Item>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/pointages/journaliers/${pointage.id}/edit`)}
      >
        Modifier
      </Menu.Item>
      <Menu.Item
        key="fiche"
        icon={<CalendarOutlined />}
        onClick={() => navigate(`/pointages/fiches/${pointage.fiche_pointage?.id}`)}
      >
        Voir la fiche
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDelete(pointage)}
      >
        Supprimer
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date_pointage',
      key: 'date_pointage',
      width: 120,
      sorter: true,
      render: (date, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {formatDate(date)}
          </div>
          <Tag color={getJourColor(record.jour_semaine)} size="small">
            {record.jour_semaine?.substring(0, 3)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Fiche',
      key: 'fiche',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/pointages/fiches/${record.fiche_pointage?.id}`)}
            style={{ padding: 0 }}
          >
            {record.fiche_pointage?.numero_fiche}
          </Button>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.fiche_pointage?.materiel_type}
          </div>
        </div>
      ),
    },
    {
      title: 'Engagement',
      key: 'engagement',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/engagements/${record.fiche_pointage?.engagement?.id}`)}
          style={{ padding: 0 }}
        >
          {record.fiche_pointage?.engagement?.numero}
        </Button>
      ),
    },
    {
      title: 'Compteurs',
      key: 'compteurs',
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {record.compteur_debut && record.compteur_fin ? (
            <span>{record.compteur_debut} → {record.compteur_fin}</span>
          ) : (
            <span style={{ color: '#ccc' }}>Non renseigné</span>
          )}
        </div>
      ),
    },
    {
      title: 'Heures',
      key: 'heures',
      width: 150,
      render: (_, record) => (
        <div>
          <Space size="small">
            <Tooltip title="Heures de travail">
              <Tag color="green" icon={<ToolOutlined />}>
                {record.heures_travail || 0}h
              </Tag>
            </Tooltip>
            {(record.heures_panne > 0) && (
              <Tooltip title="Heures de panne">
                <Tag color="orange" icon={<ClockCircleOutlined />}>
                  {record.heures_panne}h
                </Tag>
              </Tooltip>
            )}
            {(record.heures_arret > 0) && (
              <Tooltip title="Heures d'arrêt">
                <Tag color="red" icon={<ClockCircleOutlined />}>
                  {record.heures_arret}h
                </Tag>
              </Tooltip>
            )}
          </Space>
          <div style={{ fontSize: '11px', color: '#666', marginTop: 2 }}>
            Total : {record.total_heures}
            {/* Total: {((record.heures_travail || 0) + (record.heures_panne || 0) + (record.heures_arret || 0)).toFixed(1)}h */}
          </div>
        </div>
      ),
    },
    {
      title: 'Carburant',
      dataIndex: 'consommation_carburant',
      key: 'consommation_carburant',
      width: 100,
      align: 'right',
      render: (value) => (
        <div>
          {value > 0 ? `${value}L` : '-'}
        </div>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant_journalier',
      key: 'montant_journalier',
      align: 'right',
      sorter: true,
      render: (montant) => (
        <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {formatCurrency(montant || 0)} MRU
        </div>
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
    total: pointagesJournaliers.length,
    heuresTotal: pointagesJournaliers.reduce((sum, p) => sum + (p.heures_travail || 0), 0),
    montantTotal: pointagesJournaliers.reduce((sum, p) => sum + (p.montant_journalier || 0), 0),
    carburantTotal: pointagesJournaliers.reduce((sum, p) => sum + (p.consommation_carburant || 0), 0),
  };

  return (
    <div>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total pointages"
              value={pagination.total || stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Heures travail"
              value={stats.heuresTotal}
              suffix="h"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Montant total"
              value={stats.montantTotal}
              suffix="MRU"
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/pointages/journaliers/create')}
              size="large"
            >
              Nouveau pointage
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Filtres et recherche */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="Rechercher par fiche, engagement..."
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Jour de la semaine"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('jour_semaine', value)}
            >
              <Option value="LUNDI">Lundi</Option>
              <Option value="MARDI">Mardi</Option>
              <Option value="MERCREDI">Mercredi</Option>
              <Option value="JEUDI">Jeudi</Option>
              <Option value="VENDREDI">Vendredi</Option>
              <Option value="SAMEDI">Samedi</Option>
              <Option value="DIMANCHE">Dimanche</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Date début', 'Date fin']}
              style={{ width: '100%' }}
              onChange={(dates) => handleFilterChange('date_range', dates)}
            />
          </Col>
          <Col span={8}>
            <Space>
              <Button
                onClick={() => {
                  setFilters({ search: '', fiche_pointage: null, date_range: null, jour_semaine: null });
                  loadPointages({ page: 1 });
                }}
              >
                Réinitialiser
              </Button>
              <Button
                type="primary"
                ghost
                icon={<CalendarOutlined />}
                onClick={() => navigate('/pointages/fiches')}
              >
                Toutes les fiches
              </Button>
              <Button
                icon={<CalendarOutlined />}
                onClick={() => navigate('/pointages/rapports')}
              >
                Rapports
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table des pointages */}
      <Card title="Pointages journaliers">
        <Table
          columns={columns}
          dataSource={pointagesJournaliers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} pointages`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          summary={(pageData) => {
            const totalHeures = pageData.reduce((sum, record) => sum + (record.heures_travail || 0), 0);
            const totalMontant = pageData.reduce((sum, record) => sum + (record.montant_journalier || 0), 0);
            
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>Total page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <Tag color="green">{formatNumber(totalHeures, 1)}h</Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <strong style={{ color: '#1890ff' }}>
                    {formatCurrency(totalMontant)} MRU
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>-</Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default PointagesJournaliersList;
