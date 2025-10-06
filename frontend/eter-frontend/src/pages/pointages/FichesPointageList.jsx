// pages/pointages/FichesPointageList.jsx
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
  Progress,
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
  FileTextOutlined,
  FilePdfOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import '@ant-design/v5-patch-for-react-19';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePointagesStore } from '../../store/pointagesStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import moment from 'moment';
import { generatePointagePDF } from '../../services/pdfGenerator';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const FichesPointageList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    fichesPointage,
    loading,
    pagination,
    fetchFichesPointage,
    deleteFiche,
    creerPointagesPeriode
  } = usePointagesStore();

  const [filters, setFilters] = useState({
    search: '',
    engagement: searchParams.get('engagement') || null,
    date_range: null,
  });

  useEffect(() => {
    loadFiches();
  }, []);

  const loadFiches = async (params = {}) => {
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
      searchParams.periode_debut__gte = searchParams.date_range[0].format('YYYY-MM-DD');
      searchParams.periode_fin__lte = searchParams.date_range[1].format('YYYY-MM-DD');
      delete searchParams.date_range;
    }

    await fetchFichesPointage(searchParams);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadFiches({ search: value, page: 1 });
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadFiches({ ...newFilters, page: 1 });
  };

  const handleTableChange = (pagination, tableFilters, sorter) => {
    loadFiches({
      page: pagination.current,
      page_size: pagination.pageSize,
      ordering: sorter.order ? 
        `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : 
        undefined
    });
  };

  const handleDelete = async (fiche) => {
    console.log(fiche);
    Modal.confirm({
      title: 'Supprimer la fiche de pointage',
      content: `Êtes-vous sûr de vouloir supprimer la fiche "${fiche.numero_fiche}" ? Tous les pointages journaliers associés seront également supprimés.`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteFiche(fiche.id);
        if (result.success) {
          message.success('Fiche de pointage supprimée avec succès');
          loadFiches();
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const handleCreerPointagesPeriode = async (fiche) => {
    confirm({
      title: 'Créer les pointages pour toute la période',
      content: `Créer automatiquement un pointage journalier pour chaque jour de la période (${formatDate(fiche.periode_debut)} - ${formatDate(fiche.periode_fin)}) ?`,
      okText: 'Créer',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await creerPointagesPeriode(fiche.id);
        if (result.success) {
          message.success(`${result.data.count || 0} pointages créés avec succès`);
          loadFiches();
        } else {
          message.error('Erreur lors de la création des pointages');
        }
      },
    });
  };

  const getProgressPointages = (fiche) => {
    const debut = moment(fiche.periode_debut);
    const fin = moment(fiche.periode_fin);
    const totalJours = fin.diff(debut, 'days') + 1;
    const joursPointes = fiche.total_jours_pointes || 0;
    
    return Math.round((joursPointes / totalJours) * 100);
  };

  const getActionMenu = (fiche) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/pointages/fiches/${fiche.id}`)}
      >
        Voir détail
      </Menu.Item>
      <Menu.Item
        key="add-pointage"
        icon={<PlusOutlined />}
        onClick={() => navigate(`/pointages/journaliers/create?fiche_id=${fiche.id}`)}
      >
        Nouveau pointage
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="pdf"
        icon={<FilePdfOutlined />}
        onClick={() => generatePointagePDF(fiche)}
      >
        Générer PDF
      </Menu.Item>
      {/* <Menu.Item
        key="create-period"
        icon={<ThunderboltOutlined />}
        onClick={() => handleCreerPointagesPeriode(fiche)}
      >
        Créer toute la période
      </Menu.Item> */}
      <Menu.Divider />
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/pointages/fiches/${fiche.id}/edit`)}
      >
        Modifier
      </Menu.Item>
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDelete(fiche)}
      >
        Supprimer
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Numéro fiche',
      dataIndex: 'numero_fiche',
      key: 'numero_fiche',
      width: 150,
      sorter: true,
      render: (numero, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/pointages/fiches/${record.id}`)}
          style={{ padding: 0, fontWeight: 'bold' }}
        >
          {numero}
        </Button>
      ),
    },
    {
      title: 'Engagement',
      key: 'engagement',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/engagements/${record.engagement?.id}`)}
            style={{ padding: 0 }}
          >
            {record.engagement_numero}
            
          </Button>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.chantier}
          </div>
        </div>
      ),
    },
    {
      title: 'Matériel',
      key: 'materiel',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.materiel_type}
          </div>
        </div>
      ),
    },
    {
      title: 'Période',
      key: 'periode',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: 4 }}>
            {formatDate(record.periode_debut)} - {formatDate(record.periode_fin)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {moment(record.periode_fin).diff(moment(record.periode_debut), 'days') + 1} jours
          </div>
        </div>
      ),
    },
    {
      title: 'Pointages',
      key: 'pointages',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const progress = getProgressPointages(record);
        const totalJours = moment(record.periode_fin).diff(moment(record.periode_debut), 'days') + 1;
        
        return (
          <div>
            <div style={{ marginBottom: 4 }}>
              <Tag color={progress === 100 ? 'green' : progress > 50 ? 'orange' : 'red'}>
                {record.total_jours_pointes || 0} / {totalJours}
              </Tag>
            </div>
            <Progress
              percent={progress}
              size="small"
              status={progress === 100 ? 'success' : 'active'}
            />
          </div>
        );
      },
    },
    {
      title: 'Montant',
      dataIndex: 'montant_total_calcule',
      key: 'montant_total_calcule',
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
    total: fichesPointage.length,
    completes: fichesPointage.filter(f => getProgressPointages(f) === 100).length,
    enCours: fichesPointage.filter(f => {
      const progress = getProgressPointages(f);
      return progress > 0 && progress < 100;
    }).length,
    vides: fichesPointage.filter(f => getProgressPointages(f) === 0).length,
  };

  return (
    <div>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total fiches"
              value={pagination.total || stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Complètes"
              value={stats.completes}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={stats.enCours}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/pointages/fiches/create')}
              size="large"
            >
              Nouvelle fiche
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Filtres et recherche */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="Rechercher par numéro, engagement, matériel..."
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Début période', 'Fin période']}
              style={{ width: '100%' }}
              onChange={(dates) => handleFilterChange('date_range', dates)}
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button
                onClick={() => {
                  setFilters({ search: '', engagement: null, date_range: null });
                  loadFiches({ page: 1 });
                }}
              >
                Réinitialiser
              </Button>
              <Button
                type="primary"
                ghost
                icon={<CalendarOutlined />}
                onClick={() => navigate('/pointages/journaliers')}
              >
                Tous les pointages
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table des fiches */}
      <Card
        title="Fiches de pointage"
        extra={
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/pointages/creation-groupee')}
            >
              Création groupée
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={fichesPointage}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} fiches`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default FichesPointageList;
