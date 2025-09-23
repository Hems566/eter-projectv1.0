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
  Col,
  Tabs,
  Progress
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePointagesStore } from '../../store/pointagesStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PointagesList = () => {
  const navigate = useNavigate();
  const { 
    fichesPointage, 
    pointagesJournaliers,
    loading, 
    pagination, 
    fetchFichesPointage,
    fetchPointagesJournaliers
  } = usePointagesStore();

  const [activeTab, setActiveTab] = useState('fiches');
  const [filters, setFilters] = useState({
    search: '',
    engagement: '',
    materiel: '',
    date_range: null,
  });

  useEffect(() => {
    if (activeTab === 'fiches') {
      loadFichesPointage();
    } else {
      loadPointagesJournaliers();
    }
  }, [activeTab]);

  const loadFichesPointage = (params = {}) => {
    const queryParams = {
      page: pagination.current,
      page_size: pagination.pageSize,
      ...filters,
      ...params,
    };

    Object.keys(queryParams).forEach(key => {
      if (!queryParams[key]) {
        delete queryParams[key];
      }
    });

    fetchFichesPointage(queryParams);
  };

  const loadPointagesJournaliers = (params = {}) => {
    const queryParams = {
      page: pagination.current,
      page_size: pagination.pageSize,
      ...filters,
      ...params,
    };

    Object.keys(queryParams).forEach(key => {
      if (!queryParams[key]) {
        delete queryParams[key];
      }
    });

    fetchPointagesJournaliers(queryParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    const loadFunction = activeTab === 'fiches' ? loadFichesPointage : loadPointagesJournaliers;
    loadFunction({ search: value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const loadFunction = activeTab === 'fiches' ? loadFichesPointage : loadPointagesJournaliers;
    loadFunction({ ...newFilters, page: 1 });
  };

  // Colonnes pour les fiches de pointage
  const fichesColumns = [
    {
      title: 'N° Fiche',
      dataIndex: 'numero_fiche',
      key: 'numero_fiche',
      width: 100,
      fixed: 'left',
    },
    {
      title: 'Engagement',
      dataIndex: 'engagement_numero',
      key: 'engagement',
      width: 100,
    },
    {
      title: 'Matériel',
      dataIndex: 'materiel_type',
      key: 'materiel',
      width: 120,
    },
    {
      title: 'Période',
      key: 'periode',
      width: 120,
      render: (_, record) => (
        <div>
          <div>{formatDate(record.periode_debut)}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            → {formatDate(record.periode_fin)}
          </div>
        </div>
      ),
    },
    {
      title: 'Jours pointés',
      dataIndex: 'total_jours_pointes',
      key: 'jours_pointes',
      width: 80,
      align: 'center',
    },
    {
      title: 'Heures travail',
      dataIndex: 'total_heures_travail',
      key: 'heures_travail',
      width: 90,
      align: 'center',
      render: (heures) => `${heures || 0}h`,
    },
    {
      title: 'Montant (MRU)',
      dataIndex: 'montant_total_calcule',
      key: 'montant',
      width: 100,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/pointages/fiches/${record.id}`)}
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/pointages/fiches/${record.id}/edit`)}
          />
        </Space>
      ),
    },
  ];

  // Colonnes pour les pointages journaliers
  const pointagesColumns = [
    {
      title: 'Date',
      dataIndex: 'date_pointage',
      key: 'date_pointage',
      width: 100,
      render: (date) => formatDate(date),
      sorter: true,
    },
    {
      title: 'Jour',
      dataIndex: 'jour_semaine',
      key: 'jour_semaine',
      width: 80,
      render: (jour) => jour?.substring(0, 3),
    },
    {
      title: 'Fiche',
      dataIndex: ['fiche_pointage', 'numero_fiche'],
      key: 'fiche',
      width: 100,
    },
    {
      title: 'Matériel',
      dataIndex: 'materiel_display',
      key: 'materiel',
      ellipsis: true,
    },
    {
      title: 'Heures',
      key: 'heures',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ color: '#52c41a' }}>
            Travail: {record.heures_travail || 0}h
          </div>
          <div style={{ color: '#faad14' }}>
            Panne: {record.heures_panne || 0}h | Arrêt: {record.heures_arret || 0}h
          </div>
        </div>
      ),
    },
    {
      title: 'Carburant (L)',
      dataIndex: 'consommation_carburant',
      key: 'carburant',
      width: 100,
      align: 'right',
      render: (value) => {const numValue = parseFloat(value);
    return !isNaN(numValue) ? numValue.toFixed(2) : '0.00';},
    },
    {
      title: 'Montant (MRU)',
      dataIndex: 'montant_journalier',
      key: 'montant',
      width: 120,
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space>
      <Button
        type="primary"
        icon={<EyeOutlined />}
        size="small"
        onClick={() => navigate(`/pointages/journaliers/${record.id}`)}
      >
      </Button>
      <Button
        icon={<EditOutlined />}
        size="small"
        onClick={() => navigate(`/pointages/journaliers/${record.id}/edit`)}
      >
      </Button>
    </Space>
      ),
    },
  ];

  // Statistiques des fiches
  const fichesStats = {
    total: fichesPointage.length,
    montant_total: fichesPointage.reduce((sum, f) => sum + parseFloat(f.montant_total_calcule || 0), 0),
    jours_total: fichesPointage.reduce((sum, f) => sum + (f.total_jours_pointes || 0), 0),
    heures_total: fichesPointage.reduce((sum, f) => sum + (f.total_heures_travail || 0), 0),
  };

  // Statistiques des pointages journaliers
  const pointagesStats = {
    total: pointagesJournaliers.length,
    heures_travail: pointagesJournaliers.reduce((sum, p) => sum + (p.heures_travail || 0), 0),
    heures_panne: pointagesJournaliers.reduce((sum, p) => sum + (p.heures_panne || 0), 0),
    carburant_total: pointagesJournaliers.reduce((sum, p) => sum + (p.consommation_carburant || 0), 0),
  };

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <h2 style={{ margin: 0 }}>Gestion des pointages</h2>
            <p style={{ margin: 0, color: '#666' }}>
              Suivi des fiches de pointage et pointages journaliers
            </p>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/pointages/fiches/create')}
              >
                Nouvelle fiche
              </Button>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => navigate('/pointages/rapports')}
              >
                Rapports
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Onglets avec statistiques */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              <Search
                placeholder="Rechercher..."
                allowClear
                style={{ width: 200 }}
                onSearch={handleSearch}
              />
            </Space>
          }
        >
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                Fiches de pointage ({fichesStats.total})
              </span>
            } 
            key="fiches"
          >
            {/* Statistiques fiches */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="Total fiches"
                  value={fichesStats.total}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Jours pointés"
                  value={fichesStats.jours_total}
                  suffix="jours"
                  prefix={<CalendarOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Heures travail"
                  value={fichesStats.heures_total}
                  suffix="h"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Montant total"
                  value={fichesStats.montant_total}
                  suffix="MRU"
                  precision={0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>

            <Table
              columns={fichesColumns}
              dataSource={fichesPointage}
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
                  `${range[0]}-${range[1]} sur ${total} fiches`,
                onChange: (page, pageSize) => {
                  loadFichesPointage({ page, page_size: pageSize });
                },
              }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined />
                Pointages journaliers ({pointagesStats.total})
              </span>
            } 
            key="pointages"
          >
            {/* Statistiques pointages */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="Total pointages"
                  value={pointagesStats.total}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Heures travail"
                  value={pointagesStats.heures_travail}
                  suffix="h"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Heures panne"
                  value={pointagesStats.heures_panne}
                  suffix="h"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Carburant total"
                  value={pointagesStats.carburant_total}
                  suffix="L"
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>

            <Table
              columns={pointagesColumns}
              dataSource={pointagesJournaliers}
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
                  `${range[0]}-${range[1]} sur ${total} pointages`,
                onChange: (page, pageSize) => {
                  loadPointagesJournaliers({ page, page_size: pageSize });
                },
              }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default PointagesList;
