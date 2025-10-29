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
  DollarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import '@ant-design/v5-patch-for-react-19';
import { useEngagementsStore } from '../../store/engagementsStore';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EngagementsList = () => {
  const navigate = useNavigate();
  const {
    engagements,
    loading,
    pagination,
    statistiques,
    fetchEngagements,
    deleteEngagement,
    fetchStatistiques
  } = useEngagementsStore();

  const [filters, setFilters] = useState({
    search: '',
    statut: null,
    date_range: null,
  });

  useEffect(() => {
    loadEngagements();
    loadStatistiques();
  }, []);

  const loadEngagements = async (params = {}) => {
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
      searchParams.date_debut__gte = searchParams.date_range[0].format('YYYY-MM-DD');
      searchParams.date_fin__lte = searchParams.date_range[1].format('YYYY-MM-DD');
      delete searchParams.date_range;
    }

    await fetchEngagements(searchParams);
  };

  const loadStatistiques = async () => {
    await fetchStatistiques();
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    loadEngagements({ search: value, page: 1 });
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadEngagements({ ...newFilters, page: 1 });
  };

  const handleTableChange = (pagination, tableFilters, sorter) => {
    loadEngagements({
      page: pagination.current,
      page_size: pagination.pageSize,
      ordering: sorter.order ? 
        `${sorter.order === 'descend' ? '-' : ''}${sorter.field}` : 
        undefined
    });
  };

  const handleDelete = async (engagement) => {
    Modal.confirm({
      title: 'Supprimer l\'engagement',
      content: `Êtes-vous sûr de vouloir supprimer l'engagement "${engagement.numero}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteEngagement(engagement.id);
        if (result.success) {
          message.success('Engagement supprimé avec succès');
          loadEngagements();
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const getStatutEngagement = (engagement) => {
    const today = moment();
    const dateFin = moment(engagement.date_fin);
    const dateDebut = moment(engagement.date_debut);
    
    if (today.isBefore(dateDebut)) {
      return { status: 'À venir', color: 'blue', icon: <ClockCircleOutlined /> };
    } else if (today.isAfter(dateFin)) {
      return { status: 'Expiré', color: 'red', icon: <ExclamationCircleOutlined /> };
    } else {
      return { status: 'En cours', color: 'green', icon: <CheckCircleOutlined /> };
    }
  };

  const getProgressDuree = (engagement) => {
    const today = moment();
    const dateDebut = moment(engagement.date_debut);
    const dateFin = moment(engagement.date_fin);
    
    if (today.isBefore(dateDebut)) return 0;
    if (today.isAfter(dateFin)) return 100;
    
    const totalDays = dateFin.diff(dateDebut, 'days');
    const elapsedDays = today.diff(dateDebut, 'days');
    
    return Math.round((elapsedDays / totalDays) * 100);
  };

  const getActionMenu = (engagement) => (
    <Menu>
      <Menu.Item
        key="view"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/engagements/${engagement.id}`)}
      >
        Voir détail
      </Menu.Item>
      <Menu.Item
        key="fiches"
        icon={<CalendarOutlined />}
        onClick={() => navigate(`/pointages/fiches?engagement=${engagement.id}`)}
      >
        Fiches de pointage
      </Menu.Item>
      <Menu.Divider />
      {/* <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => navigate(`/engagements/${engagement.id}/edit`)}
      >
        Modifier
      </Menu.Item> */}
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => handleDelete(engagement)}
      >
        Supprimer
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      width: 129,
      sorter: true,
      render: (numero) => <code style={{ color: '#1890ff' }}>{numero}</code>,
    },
    {
      title: 'Demande / Chantier',
      key: 'demande_info',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.mise_a_disposition?.demande_location.numero || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.mise_a_disposition?.chantier || 'Chantier non spécifié'}
          </div>
        </div>
      ),
    },
    {
      title: 'Fournisseur',
      key: 'fournisseur',
      render: (_, record) => (
        <div>
          <div>{record.fournisseur_nom || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.mise_a_disposition?.immatriculation || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Période',
      key: 'periode',
      width: 200,
      render: (_, record) => {
        const progress = getProgressDuree(record);
        return (
          <div>
            <div style={{ fontSize: '12px', marginBottom: 4 }}>
              {formatDate(record.date_debut)} → {formatDate(record.date_fin)}
            </div>
            <Progress 
              percent={progress} 
              size="small"
              status={progress === 100 ? 'exception' : 'active'}
              strokeColor={progress > 80 ? '#ff4d4f' : progress > 60 ? '#faad14' : '#52c41a'}
            />
          </div>
        );
      },
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 120,
      filters: [
        { text: 'En cours', value: 'en_cours' },
        { text: 'À venir', value: 'a_venir' },
        { text: 'Expiré', value: 'expire' },
      ],
      render: (_, record) => {
        const statutInfo = getStatutEngagement(record);
        return (
          <Tag color={statutInfo.color} icon={statutInfo.icon}>
            {statutInfo.status}
          </Tag>
        );
      },
    },
    {
      title: 'Montant',
      dataIndex: 'montant_total_estime_mru',
      key: 'montant_total_estime_mru',
      width: 170,
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

  return (
    <div>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total engagements"
              value={statistiques?.total || pagination.total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="En cours"
              value={statistiques?.en_cours || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expirant bientôt"
              value={statistiques?.expirant_bientot || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/engagements/create')}
              size="large"
            >
              Nouvel engagement
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Filtres et recherche */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="Rechercher par numéro, chantier, fournisseur..."
              allowClear
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Statut"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('statut', value)}
            >
              <Option value="en_cours">En cours</Option>
              <Option value="a_venir">À venir</Option>
              <Option value="expire">Expiré</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Date début', 'Date fin']}
              style={{ width: '100%' }}
              onChange={(dates) => handleFilterChange('date_range', dates)}
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button
                onClick={() => {
                  setFilters({ search: '', statut: null, date_range: null });
                  loadEngagements({ page: 1 });
                }}
              >
                Réinitialiser
              </Button>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/engagements/expirants')}
              >
                Engagements expirants
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table des engagements */}
      <Card
        title="Liste des engagements"
        extra={
          <Space>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => navigate('/pointages/fiches')}
            >
              Toutes les fiches
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={engagements}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} sur ${total} engagements`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          rowClassName={(record) => {
            const statutInfo = getStatutEngagement(record);
            if (statutInfo.status === 'Expiré') return 'row-expired';
            if (statutInfo.status === 'À venir') return 'row-upcoming';
            return '';
          }}
        />
      </Card>

      <style jsx>{`
        .row-expired {
          background-color: #fff2f0;
        }
        .row-upcoming {
          background-color: #f0f9ff;
        }
      `}</style>
    </div>
  );
};

export default EngagementsList;


// import React, { useEffect, useState } from 'react';
// import { 
//   Table, 
//   Button, 
//   Space, 
//   Tag, 
//   Input, 
//   Select, 
//   DatePicker,
//   Card,
//   Statistic,
//   Row,
//   Col,
//   Alert,
//   Progress
// } from 'antd';
// import { 
//   PlusOutlined, 
//   EyeOutlined, 
//   EditOutlined,
//   ExclamationCircleOutlined,
//   CalendarOutlined
// } from '@ant-design/icons';
// import { useNavigate } from 'react-router-dom';
// import { useEngagementsStore } from '../../store/engagementsStore';
// import { usePermissions } from '../../hooks/usePermissions';
// import { formatCurrency, formatDate } from '../../utils/formatters';

// const { Search } = Input;
// const { Option } = Select;
// const { RangePicker } = DatePicker;

// const EngagementsList = () => {
//   const navigate = useNavigate();
//   const { 
//     engagements, 
//     loading, 
//     pagination, 
//     fetchEngagements 
//   } = useEngagementsStore();

//   const { 
//     canCreateEngagement, 
//     canAccessResource,
//     user,
//     departement ,
//     isAcheteur,
//   } = usePermissions();

//   const [filters, setFilters] = useState({
//     search: '',
//     fournisseur: '',
//     date_range: null,
//   });

//   useEffect(() => {
//     loadEngagements();
//   }, []);

//   const loadEngagements = (params = {}) => {
//     const queryParams = {
//       page: pagination.current,
//       page_size: pagination.pageSize,
//       ...filters,
//       ...params,
//     };

//     Object.keys(queryParams).forEach(key => {
//       if (!queryParams[key]) {
//         delete queryParams[key];
//       }
//     });

//     fetchEngagements(queryParams);
//   };

//   const handleSearch = (value) => {
//     setFilters(prev => ({ ...prev, search: value }));
//     loadEngagements({ search: value, page: 1 });
//   };

//   const handleFilterChange = (key, value) => {
//     const newFilters = { ...filters, [key]: value };
//     setFilters(newFilters);
//     loadEngagements({ ...newFilters, page: 1 });
//   };

//   const getExpirationStatus = (engagement) => {
//     const jours = engagement.jours_restants;
//     if (jours <= 0) return { status: 'expired', color: 'red', text: 'Expiré' };
//     if (jours <= 10) return { status: 'warning', color: 'orange', text: `${jours} jours` };
//     return { status: 'active', color: 'green', text: `${jours} jours` };
//   };

//   // ✅ Fonction pour vérifier si on peut éditer un engagement
//   const canEditEngagement = (engagement) => {
//     // Seuls ceux qui peuvent créer des engagements peuvent les éditer
//     if (!canCreateEngagement) return false;
    
//     // Admin peut tout éditer
//     if (canCreateEngagement) return true;
    
//     // L'utilisateur peut éditer ses propres engagements
//     return engagement.responsable?.id === user?.id;
//   };

//   // ✅ Fonction pour vérifier si on peut voir un engagement
//   const canViewEngagement = (engagement) => {
//     // Ceux qui peuvent créer des engagements peuvent tout voir
//     if (canCreateEngagement) return true;
    
//     // Les demandeurs peuvent voir les engagements de leurs demandes
//     return engagement.mise_a_disposition?.demande_location?.demandeur?.id === user?.id;
//   };

//   const columns = [
//     {
//       title: 'Numéro',
//       dataIndex: 'numero',
//       key: 'numero',
//       width: 140,
//       fixed: 'left',
//     },
//     {
//       title: 'Chantier',
//       dataIndex: 'chantier',
//       key: 'chantier',
//       ellipsis: true,
//       render: (_, record) => record.mise_a_disposition?.demande_location?.chantier,
//     },
//     {
//       title: 'Demandeur', // ✅ Ajouter colonne demandeur pour les acheteurs
//       key: 'demandeur',
//       width: 150,
//       render: (_, record) => {
//         const demandeur = record.mise_a_disposition?.demande_location?.demandeur;
//         if (!demandeur) return '-';
//         return (
//           <div>
//             <div>{demandeur.first_name} {demandeur.last_name}</div>
//             <small style={{ color: '#666' }}>
//               {record.mise_a_disposition?.demande_location?.departement}
//             </small>
//           </div>
//         );
//       },
//       // ✅ Masquer cette colonne pour les demandeurs (ils ne voient que leurs engagements)
//       hidden: !canCreateEngagement,
//     },
//     {
//       title: 'Fournisseur',
//       dataIndex: 'fournisseur_nom',
//       key: 'fournisseur',
//       ellipsis: true,
//     },
//     {
//       title: 'Période',
//       key: 'periode',
//       width: 200,
//       render: (_, record) => (
//         <div>
//           <div>{formatDate(record.date_debut)} →</div>
//           <div>{formatDate(record.date_fin)}</div>
//         </div>
//       ),
//     },
//     {
//       title: 'Montant (MRU)',
//       dataIndex: 'montant_total_estime_mru',
//       key: 'montant',
//       width: 150,
//       align: 'right',
//       render: (value) => formatCurrency(value),
//     },
//     {
//       title: 'Expiration',
//       key: 'expiration',
//       width: 120,
//       align: 'center',
//       render: (_, record) => {
//         const status = getExpirationStatus(record);
//         return (
//           <Tag color={status.color} icon={<CalendarOutlined />}>
//             {status.text}
//           </Tag>
//         );
//       },
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       width: 120,
//       fixed: 'right',
//       render: (_, record) => (
//         <Space>
//           {/* ✅ Vérifier les permissions pour chaque action */}
//           {canViewEngagement(record) && (
//             <Button
//               type="primary"
//               icon={<EyeOutlined />}
//               size="small"
//               onClick={() => navigate(`/engagements/${record.id}`)}
//             />
//           )}
//           {canEditEngagement(record) && (
//             <Button
//               icon={<EditOutlined />}
//               size="small"
//               onClick={() => navigate(`/engagements/${record.id}/edit`)}
//             />
//           )}
//         </Space>
//       ),
//     },
//   ].filter(col => !col.hidden); // ✅ Filtrer les colonnes masquées

//   // Statistiques rapides
//   const stats = {
//     total: engagements.length,
//     actifs: engagements.filter(e => e.jours_restants > 0).length,
//     expires: engagements.filter(e => e.jours_restants <= 0).length,
//     expirant_bientot: engagements.filter(e => e.jours_restants > 0 && e.jours_restants <= 10).length,
//     montant_total: engagements.reduce((sum, e) => sum + parseFloat(e.montant_total_estime_mru || 0), 0),
//   };

//   // ✅ Message personnalisé selon les permissions
//   const getPageTitle = () => {
//     if (canCreateEngagement) {
//       return 'Gestion des engagements';
//     }
//     return 'Mes engagements';
//   };

//   const getPageDescription = () => {
//     if (canCreateEngagement) {
//       return 'Suivi de tous les engagements contractuels';
//     }
//     return 'Engagements liés à vos demandes de location';
//   };

//   return (
//     <div>
//       {/* Header avec titre adapté */}
//       <Card style={{ marginBottom: 24 }}>
//         <Row align="middle" justify="space-between">
//           <Col>
//             <h2 style={{ margin: 0 }}>{getPageTitle()}</h2>
//             <p style={{ margin: 0, color: '#666' }}>
//               {getPageDescription()}
//               {departement && ` - Département ${departement}`}
//             </p>
//           </Col>
//           <Col>
//             <Space>
//               {/* ✅ Bouton créer seulement si permission */}
//               {canCreateEngagement && (
//                 <Button
//                   type="primary"
//                   icon={<PlusOutlined />}
//                   onClick={() => navigate('/engagements/create')}
//                 >
//                   Nouvel engagement
//                 </Button>
//               )}
//               {/* ✅ Boutons d'actions selon permissions */}
//               {canAccessResource('engagements', 'create') && stats.expirant_bientot > 0 && (
//                 <Button
//                   icon={<ExclamationCircleOutlined />}
//                   onClick={() => navigate('/engagements?expiration=bientot')}
//                 >
//                   Expirant bientôt ({stats.expirant_bientot})
//                 </Button>
//               )}
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       {/* ✅ Alertes adaptées selon les permissions */}
//       {stats.expirant_bientot > 0 && (
//         <Alert
//           message={
//             canCreateEngagement 
//               ? "Engagements expirant bientôt" 
//               : "Vos engagements expirant bientôt"
//           }
//           description={`${stats.expirant_bientot} engagement(s) expire(nt) dans moins de 10 jours`}
//           type="warning"
//           showIcon
//           style={{ marginBottom: 16 }}
//           action={
//             <Button size="small" onClick={() => navigate('/engagements?expiration=bientot')}>
//               Voir
//             </Button>
//           }
//         />
//       )}

//       {/* Statistiques */}
//       <Row gutter={16} style={{ marginBottom: 24 }}>
//         <Col span={6}>
//           <Card>
//             <Statistic
//               title={canCreateEngagement ? "Total engagements" : "Mes engagements"}
//               value={stats.total}
//               valueStyle={{ color: '#3f8600' }}
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic
//               title="Actifs"
//               value={stats.actifs}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic
//               title="Expirant bientôt"
//               value={stats.expirant_bientot}
//               valueStyle={{ color: '#cf1322' }}
//               prefix={<ExclamationCircleOutlined />}
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic
//               title="Montant total (MRU)"
//               value={stats.montant_total}
//               precision={0}
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Filtres et actions */}
//       <Card style={{ marginBottom: 16 }}>
//         <Row gutter={16} align="middle">
//           <Col flex="auto">
//             <Space size="middle">
//               <Search
//                 placeholder={
//                   canCreateEngagement 
//                     ? "Rechercher par numéro, chantier, demandeur..." 
//                     : "Rechercher par numéro, chantier..."
//                 }
//                 allowClear
//                 style={{ width: 300 }}
//                 onSearch={handleSearch}
//               />
              
//               {/* ✅ Filtre fournisseur pour tous */}
//               <Select
//                 placeholder="Fournisseur"
//                 allowClear
//                 style={{ width: 200 }}
//                 onChange={(value) => handleFilterChange('fournisseur', value)}
//               >
//                 {[...new Set(engagements.map(e => e.fournisseur_nom))].map(nom => (
//                   <Option key={nom} value={nom}>{nom}</Option>
//                 ))}
//               </Select>

//               {/* ✅ Filtre département seulement pour les acheteurs */}
//               {canCreateEngagement && (
//                 <Select
//                   placeholder="Département"
//                   allowClear
//                   style={{ width: 150 }}
//                   onChange={(value) => handleFilterChange('departement', value)}
//                 >
//                   {[...new Set(engagements.map(e => 
//                     e.mise_a_disposition?.demande_location?.departement
//                   ))].filter(Boolean).map(dept => (
//                     <Option key={dept} value={dept}>{dept}</Option>
//                   ))}
//                 </Select>
//               )}

//               <RangePicker
//                 placeholder={['Date début', 'Date fin']}
//                 onChange={(dates) => handleFilterChange('date_range', dates)}
//               />
//             </Space>
//           </Col>
          
//           <Col>
//             <Space>
//               {/* ✅ Actions selon permissions */}
//               {canCreateEngagement && (
//                 <Button
//                   type="primary"
//                   icon={<PlusOutlined />}
//                   onClick={() => navigate('/engagements/create')}
//                 >
//                   Nouvel engagement
//                 </Button>
//               )}
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       {/* ✅ Message d'information pour les demandeurs */}
//       {!canCreateEngagement && engagements.length === 0 && (
//         <Card>
//           <div style={{ textAlign: 'center', padding: '50px' }}>
//             <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
//             <h3>Aucun engagement trouvé</h3>
//             <p>
//               Vous n'avez pas encore d'engagement créé pour vos demandes de location validées.
//               <br />
//               Les engagements sont créés par les acheteurs après validation de vos demandes.
//             </p>
//             <Button 
//               type="primary" 
//               onClick={() => navigate('/demandes')}
//             >
//               Voir mes demandes
//             </Button>
//           </div>
//         </Card>
//       )}

//       {/* Tableau */}
//       {engagements.length > 0 && (
//         <Card>
//           <Table
//             columns={columns}
//             dataSource={engagements}
//             rowKey="id"
//             loading={loading}
//             scroll={{ x: canCreateEngagement ? 1400 : 1200 }}
//             pagination={{
//               current: pagination.current,
//               pageSize: pagination.pageSize,
//               total: pagination.total,
//               showSizeChanger: true,
//               showQuickJumper: true,
//               showTotal: (total, range) =>
//                 `${range[0]}-${range[1]} sur ${total} engagements`,
//               onChange: (page, pageSize) => {
//                 loadEngagements({ page, page_size: pageSize });
//               },
//             }}
//             rowClassName={(record) => {
//               const status = getExpirationStatus(record);
//               if (status.status === 'expired') return 'row-expired';
//               if (status.status === 'warning') return 'row-warning';
//               return '';
//             }}
//           />
//         </Card>
//       )}

//       {/* ✅ Styles CSS pour les lignes colorées */}
//       <style jsx>{`
//         .row-expired {
//           background-color: #fff2f0 !important;
//         }
//         .row-warning {
//           background-color: #fff7e6 !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default EngagementsList;
