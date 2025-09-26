import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Modal,
  message,
  Divider,
  Empty,
  Table,
  Progress,
  Statistic,
  Timeline,
  Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useEngagementsStore } from '../../store/engagementsStore';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import moment from 'moment';

const { confirm } = Modal;

const EngagementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    engagement,
    loading,
    getEngagement,
    deleteEngagement,
    getFichesPointage,
    clearEngagement
  } = useEngagementsStore();

  const [fichesPointage, setFichesPointage] = useState([]);
  const [loadingFiches, setLoadingFiches] = useState(false);

  useEffect(() => {
    if (id) {
      loadEngagement();
      loadFichesPointage();
    }
    return () => clearEngagement();
  }, [id]);

  const loadEngagement = async () => {
    const result = await getEngagement(id);
    if (!result.success) {
      message.error('Engagement non trouvé');
      navigate('/engagements');
    }
  };

  const loadFichesPointage = async () => {
    setLoadingFiches(true);
    try {
      const result = await getFichesPointage(id);
      if (result.success) {
        setFichesPointage(result.data);
      }
    } catch (error) {
      console.error('Erreur chargement fiches:', error);
    } finally {
      setLoadingFiches(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Supprimer l\'engagement',
      content: `Êtes-vous sûr de vouloir supprimer l'engagement "${engagement.numero}" ?`,
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        const result = await deleteEngagement(engagement.id);
        if (result.success) {
          message.success('Engagement supprimé avec succès');
          navigate('/engagements');
        } else {
          message.error('Erreur lors de la suppression');
        }
      },
    });
  };

  const getStatutEngagement = () => {
    if (!engagement) return null;
    
    const today = moment();
    const dateFin = moment(engagement.date_fin);
    const dateDebut = moment(engagement.date_debut);
    
    // if (today.isBefore(dateDebut)) {
    //   return { status: 'À venir', color: 'blue', icon: <ClockCircleOutlined /> };
   if (today.isAfter(dateFin)) {
      return { status: 'Expiré', color: 'red', icon: <ExclamationCircleOutlined /> };
    } else {
      return { status: 'En cours', color: 'green', icon: <CheckCircleOutlined /> };
    }
  };

  const getProgressDuree = () => {
    if (!engagement) return 0;
    
    const today = moment();
    const dateDebut = moment(engagement.date_debut);
    const dateFin = moment(engagement.date_fin);
    
    if (today.isBefore(dateDebut)) return 0;
    if (today.isAfter(dateFin)) return 100;
    
    const totalDays = dateFin.diff(dateDebut, 'days');
    const elapsedDays = today.diff(dateDebut, 'days');
    
    return Math.round((elapsedDays / totalDays) * 100);
  };

  const getJoursRestants = () => {
    if (!engagement) return 0;
    
    const today = moment();
    const dateFin = moment(engagement.date_fin);
    
    if (today.isAfter(dateFin)) return 0;
    
    return dateFin.diff(today, 'days');
  };

  const ficheColumns = [
    {
      title: 'Numéro fiche',
      dataIndex: 'numero_fiche',
      key: 'numero_fiche',
      render: (numero, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/pointages/fiches/${record.id}`)}
        >
          {numero}
        </Button>
      ),
    },
    {
      title: 'Matériel',
      key: 'materiel',
      render: (_, record) => (
        <div>
          <div>{record.materiel_type}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.immatriculation}
          </div>
        </div>
      ),
    },
    {
      title: 'Période',
      key: 'periode',
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          {formatDate(record.periode_debut)} - {formatDate(record.periode_fin)}
        </div>
      ),
    },
    {
      title: 'Jours pointés',
      dataIndex: 'total_jours_pointes',
      key: 'total_jours_pointes',
      align: 'center',
      render: (jours) => (
        <Tag color={jours > 0 ? 'green' : 'default'}>
          {jours || 0} jours
        </Tag>
      ),
    },
    {
      title: 'Montant',
      dataIndex: 'montant_total_calcule',
      key: 'montant_total_calcule',
      align: 'right',
      render: (montant) => (
        <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {formatCurrency(montant || 0)} MRU
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/pointages/fiches/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/pointages/journaliers/create?fiche_id=${record.id}`)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return <Card loading={true} />;
  }

  if (!engagement) {
    return (
      <Card>
        <Empty
          description="Engagement non trouvé"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }
console.log(engagement);
  const statutInfo = getStatutEngagement();
  const progress = getProgressDuree();
  const joursRestants = getJoursRestants();

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/engagements')}
              >
                Retour à la liste
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Engagement {engagement.numero}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {engagement.mise_a_disposition?.demande_location_numero} - {engagement.mise_a_disposition?.chantier}
                  {statutInfo && (
                    <Tag
                      color={statutInfo.color}
                      icon={statutInfo.icon}
                      style={{ marginLeft: 8 }}
                    >
                      {statutInfo.status}
                    </Tag>
                  )}
                </p>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Nouvelle fiche
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/engagements/${id}/edit`)}
              >
                Modifier
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations principales */}
          <Card title="Informations de l'engagement" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro d'engagement">
                <code style={{ 
                  fontSize: '16px', 
                  color: '#1890ff',
                  background: '#f0f9ff',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {engagement.numero}
                </code>
              </Descriptions.Item>

              <Descriptions.Item label="Statut">
                {statutInfo && (
                  <Tag
                    color={statutInfo.color}
                    icon={statutInfo.icon}
                    style={{ fontSize: '14px', padding: '4px 12px' }}
                  >
                    {statutInfo.status}
                  </Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Date de début">
                <Space>
                  <CalendarOutlined />
                  {formatDate(engagement.date_debut)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Date de fin">
                <Space>
                  <CalendarOutlined />
                  {formatDate(engagement.date_fin)}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Durée" span={2}>
                <div>
                  <Progress 
                    percent={progress} 
                    status={progress === 100 ? 'exception' : 'active'}
                    strokeColor={progress > 80 ? '#ff4d4f' : progress > 60 ? '#faad14' : '#52c41a'}
                  />
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    {progress}% écoulé - {joursRestants > 0 ? `${joursRestants} jours restants` : 'Expiré'}
                  </div>
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Montant total estimé">
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  {formatCurrency(engagement.montant_total_estime_mru)} MRU
                </div>
              </Descriptions.Item>

              <Descriptions.Item label="Fiches de pointage">
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/pointages/fiches?engagement=${id}`)}
                >
                  {engagement.fiches_pointage_count || 0} fiche(s)
                </Button>
              </Descriptions.Item>

              {engagement.conditions_particulieres && (
                <Descriptions.Item label="Conditions particulières" span={2}>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    background: '#f9f9f9', 
                    padding: '12px', 
                    borderRadius: '6px',
                    border: '1px solid #e8e8e8'
                  }}>
                    {engagement.conditions_particulieres}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Mise à disposition */}
          <Card title="Mise à disposition" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Numéro demande">
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/demandes/${engagement.mise_a_disposition?.demande_location_id}`)}
                >
                  {engagement.mise_a_disposition.demande_location?.numero}
                </Button>
              </Descriptions.Item>

              <Descriptions.Item label="Chantier">
                {engagement.mise_a_disposition?.chantier}
              </Descriptions.Item>

              <Descriptions.Item label="Fournisseur">
                {/* {engagement.mise_a_disposition?.fournisseur_nom} */}
                {engagement.mise_a_disposition.fournisseur?.raison_sociale}
                {/* {engagement?.fournisseur_nom} */}
              </Descriptions.Item>

              <Descriptions.Item label="Immatriculation">
                <code>{engagement.mise_a_disposition?.immatriculation}</code>
              </Descriptions.Item>

              <Descriptions.Item label="Durée MAD">
                {engagement.mise_a_disposition?.duree_mois} mois
              </Descriptions.Item>

              <Descriptions.Item label="Conforme">
                <Tag color={engagement.mise_a_disposition?.conforme ? 'green' : 'red'}>
                  {engagement.mise_a_disposition?.conforme ? '✅ Oui' : '❌ Non'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Fiches de pointage */}
          <Card 
            title="Fiches de pointage" 
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Nouvelle fiche
              </Button>
            }
          >
            <Table
              columns={ficheColumns}
              dataSource={fichesPointage}
              rowKey="id"
              loading={loadingFiches}
              pagination={false}
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Aucune fiche de pointage"
                  />
                )
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Montant Réel Pointé"
                  value={engagement.montant_reel_pointe}
                  suffix="MRU"
                  precision={0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Fiches créées"
                  value={engagement.fiches_pointage_count || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Jours restants"
                  value={joursRestants}
                  valueStyle={{ 
                    color: joursRestants <= 7 ? '#cf1322' : joursRestants <= 30 ? '#faad14' : '#52c41a' 
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Progression"
                  value={progress}
                  suffix="%"
                  valueStyle={{ 
                    color: progress >= 100 ? '#cf1322' : progress >= 80 ? '#faad14' : '#52c41a' 
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* Actions rapides */}
          <Card title="Actions rapides" size="small" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/pointages/fiches/create?engagement=${id}`)}
              >
                Créer une fiche de pointage
              </Button>

              <Button
                block
                icon={<CalendarOutlined />}
                onClick={() => navigate(`/pointages/fiches?engagement=${id}`)}
              >
                Voir toutes les fiches
              </Button>

              <Button
                block
                icon={<EditOutlined />}
                onClick={() => navigate(`/engagements/${id}/edit`)}
              >
                Modifier l'engagement
              </Button>

              <Divider style={{ margin: '12px 0' }} />

              <Button
                block
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                Supprimer l'engagement
              </Button>
            </Space>
          </Card>

          {/* Timeline */}
          <Card title="Chronologie" size="small">
            <Timeline size="small">
              <Timeline.Item color="blue">
                <div style={{ fontSize: '12px' }}>
                  <strong>Engagement créé</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDateTime(engagement.created_at)}
                  </span>
                </div>
              </Timeline.Item>

              <Timeline.Item color="green">
                <div style={{ fontSize: '12px' }}>
                  <strong>Début d'engagement</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDate(engagement.date_debut)}
                  </span>
                </div>
              </Timeline.Item>

              {engagement.fiches_pointage_count > 0 && (
                <Timeline.Item color="orange">
                  <div style={{ fontSize: '12px' }}>
                    <strong>Fiches créées</strong>
                    <br />
                    <span style={{ color: '#666' }}>
                      {engagement.fiches_pointage_count} fiche(s)
                    </span>
                  </div>
                </Timeline.Item>
              )}

              <Timeline.Item 
                color={statutInfo?.status === 'Expiré' ? 'red' : 'gray'}
              >
                <div style={{ fontSize: '12px' }}>
                  <strong>Fin d'engagement</strong>
                  <br />
                  <span style={{ color: '#666' }}>
                    {formatDate(engagement.date_fin)}
                  </span>
                </div>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EngagementDetail;


// import React, { useState, useEffect } from 'react';
// import { 
//   Card, 
//   Descriptions, 
//   Table, 
//   Tag, 
//   Button, 
//   Space, 
//   Row,
//   Col,
//   Statistic,
//   Timeline,
//   Progress,
//   Alert
// } from 'antd';
// import { 
//   ArrowLeftOutlined, 
//   EditOutlined, 
//   FileTextOutlined,
//   CalendarOutlined,
//   DollarOutlined
// } from '@ant-design/icons';
// import { useParams, useNavigate } from 'react-router-dom';
// import { engagementsAPI } from '../../services/engagements';
// import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

// const EngagementDetail = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [engagement, setEngagement] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadEngagement();
//   }, [id]);

//   const loadEngagement = async () => {
//     setLoading(true);
//     try {
//       const response = await engagementsAPI.get(id);
//       setEngagement(response.data);
//     } catch (error) {
//       message.error('Erreur lors du chargement de l\'engagement');
//       navigate('/engagements');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getExpirationStatus = () => {
//     if (!engagement) return null;
//     const jours = engagement.jours_restants;
//     if (jours <= 0) return { status: 'expired', color: 'red', text: 'Expiré' };
//     if (jours <= 10) return { status: 'warning', color: 'orange', text: `Expire dans ${jours} jours` };
//     return { status: 'active', color: 'green', text: `${jours} jours restants` };
//   };

//   if (loading) {
//     return <Card loading={true} />;
//   }

//   if (!engagement) {
//     return <Card>Engagement non trouvé</Card>;
//   }

//   const expirationStatus = getExpirationStatus();

//   return (
//     <div>
//       {/* Header */}
//       <Card style={{ marginBottom: 24 }}>
//         <Row align="middle" justify="space-between">
//           <Col>
//             <Space>
//               <Button 
//                 icon={<ArrowLeftOutlined />} 
//                 onClick={() => navigate('/engagements')}
//               >
//                 Retour
//               </Button>
//               <div>
//                 <h2 style={{ margin: 0 }}>
//                   Engagement {engagement.numero}
//                   <Tag 
//                     color={expirationStatus.color} 
//                     style={{ marginLeft: 16 }}
//                   >
//                     {expirationStatus.text}
//                   </Tag>
//                 </h2>
//                 <p style={{ margin: 0, color: '#666' }}>
//                   Créé le {formatDateTime(engagement.created_at)}
//                 </p>
//               </div>
//             </Space>
//           </Col>
          
//           <Col>
//             <Space>
//               <Button 
//                 icon={<EditOutlined />}
//                 onClick={() => navigate(`/engagements/${id}/edit`)}
//               >
//                 Modifier
//               </Button>
//               <Button 
//                 type="primary"
//                 icon={<FileTextOutlined />}
//                 onClick={() => navigate(`/engagements/${id}/fiches-pointage`)}
//               >
//                 Fiches pointage
//               </Button>
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       {/* Alerte expiration */}
//       {expirationStatus.status !== 'active' && (
//         <Alert
//           message={expirationStatus.status === 'expired' ? 'Engagement expiré' : 'Engagement expirant bientôt'}
//           description={`Cet engagement ${expirationStatus.status === 'expired' ? 'a expiré' : 'expire bientôt'}. Vérifiez les actions nécessaires.`}
//           type={expirationStatus.status === 'expired' ? 'error' : 'warning'}
//           showIcon
//           style={{ marginBottom: 24 }}
//         />
//       )}

//       <Row gutter={24}>
//         <Col span={16}>
//           {/* Informations principales */}
//           <Card title="Informations de l'engagement" style={{ marginBottom: 24 }}>
//             <Descriptions column={2} bordered>
//               <Descriptions.Item label="Numéro" span={1}>
//                 {engagement.numero}
//               </Descriptions.Item>
//               <Descriptions.Item label="Statut" span={1}>
//                 <Tag color={expirationStatus.color}>
//                   {expirationStatus.text}
//                 </Tag>
//               </Descriptions.Item>
              
//               <Descriptions.Item label="Date début" span={1}>
//                 {formatDate(engagement.date_debut)}
//               </Descriptions.Item>
//               <Descriptions.Item label="Date fin" span={1}>
//                 {formatDate(engagement.date_fin)}
//               </Descriptions.Item>
              
//               <Descriptions.Item label="Montant estimé" span={2}>
//                 <strong style={{ color: '#1890ff', fontSize: '18px' }}>
//                   {formatCurrency(engagement.montant_total_estime_mru)} MRU
//                 </strong>
//               </Descriptions.Item>
              
//               {engagement.conditions_particulieres && (
//                 <Descriptions.Item label="Conditions particulières" span={2}>
//                   <div style={{ whiteSpace: 'pre-wrap' }}>
//                     {engagement.conditions_particulieres}
//                   </div>
//                 </Descriptions.Item>
//               )}
//             </Descriptions>
//           </Card>

//           {/* Informations mise à disposition */}
//           <Card title="Mise à disposition" style={{ marginBottom: 24 }}>
//             <Descriptions column={2} bordered>
//               <Descriptions.Item label="Demande N°" span={1}>
//                 {engagement.mise_a_disposition?.demande_location?.numero}
//               </Descriptions.Item>
//               <Descriptions.Item label="Chantier" span={1}>
//                 {engagement.mise_a_disposition?.demande_location?.chantier}
//               </Descriptions.Item>
              
//               <Descriptions.Item label="Fournisseur" span={2}>
//                 {engagement.mise_a_disposition?.fournisseur?.raison_sociale}
//                 <br />
//                 <small>NIF: {engagement.mise_a_disposition?.fournisseur?.nif}</small>
//               </Descriptions.Item>
              
//               <Descriptions.Item label="Immatriculation" span={1}>
//                 {engagement.mise_a_disposition?.immatriculation}
//               </Descriptions.Item>
//               <Descriptions.Item label="Date mise à disposition" span={1}>
//                 {formatDate(engagement.mise_a_disposition?.date_mise_disposition)}
//               </Descriptions.Item>
//             </Descriptions>
//           </Card>

//           {/* Matériels */}
//           <Card title="Matériels concernés">
//             <Table
//               columns={[
//                 {
//                   title: 'Type de matériel',
//                   dataIndex: ['materiel', 'type_materiel'],
//                   key: 'type_materiel',
//                 },
//                 {
//                   title: 'Quantité',
//                   dataIndex: 'quantite',
//                   key: 'quantite',
//                   align: 'center',
//                 },
//                 {
//                   title: 'Prix unitaire (MRU)',
//                   dataIndex: ['materiel', 'prix_unitaire_mru'],
//                   key: 'prix_unitaire',
//                   align: 'right',
//                   render: (prix) => formatCurrency(prix),
//                 },
//               ]}
//               dataSource={engagement.materiels_demandes || []}
//               rowKey="id"
//               pagination={false}
//               size="small"
//             />
//           </Card>
//         </Col>

//         <Col span={8}>
//           {/* Statistiques */}
//           <Card style={{ marginBottom: 24 }}>
//             <Statistic
//               title="Montant total estimé"
//               value={engagement.montant_total_estime_mru}
//               suffix="MRU"
//               precision={3}
//               valueStyle={{ color: '#3f8600' }}
//               prefix={<DollarOutlined />}
//             />
//             <br />
//             <Row gutter={16}>
//               <Col span={12}>
//                 <Statistic
//                   title="Jours restants"
//                   value={Math.max(0, engagement.jours_restants)}
//                   suffix="jours"
//                   valueStyle={{ 
//                     color: engagement.jours_restants <= 10 ? '#cf1322' : '#3f8600' 
//                   }}
//                 />
//               </Col>
//               <Col span={12}>
//                 <Statistic
//                   title="Fiches pointage"
//                   value={engagement.fiches_pointage_count || 0}
//                   suffix="fiches"
//                 />
//               </Col>
//             </Row>
//           </Card>

//           {/* Progression temporelle */}
//           <Card title="Progression" style={{ marginBottom: 24 }}>
//             {(() => {
//               const debut = new Date(engagement.date_debut);
//               const fin = new Date(engagement.date_fin);
//               const maintenant = new Date();
//               const dureeTotal = fin.getTime() - debut.getTime();
//               const dureeEcoulee = maintenant.getTime() - debut.getTime();
//               const pourcentage = Math.min(100, Math.max(0, (dureeEcoulee / dureeTotal) * 100));
              
//               return (
//                 <Progress
//                   percent={pourcentage}
//                   status={engagement.jours_restants <= 0 ? 'exception' : 'active'}
//                   format={() => `${Math.round(pourcentage)}%`}
//                 />
//               );
//             })()}
//             <p style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
//               Du {formatDate(engagement.date_debut)} au {formatDate(engagement.date_fin)}
//             </p>
//           </Card>

//           {/* Historique */}
//           <Card title="Historique">
//             <Timeline size="small">
//               <Timeline.Item color="blue">
//                 <div>
//                   <strong>Engagement créé</strong>
//                   <br />
//                   <small>{formatDateTime(engagement.created_at)}</small>
//                 </div>
//               </Timeline.Item>
              
//               <Timeline.Item color="green">
//                 <div>
//                   <strong>Mise à disposition</strong>
//                   <br />
//                   <small>{formatDate(engagement.mise_a_disposition?.date_mise_disposition)}</small>
//                 </div>
//               </Timeline.Item>
              
//               {engagement.fiches_pointage_count > 0 && (
//                 <Timeline.Item color="orange">
//                   <div>
//                     <strong>Pointages en cours</strong>
//                     <br />
//                     <small>{engagement.fiches_pointage_count} fiche(s)</small>
//                   </div>
//                 </Timeline.Item>
//               )}
//             </Timeline>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default EngagementDetail;
