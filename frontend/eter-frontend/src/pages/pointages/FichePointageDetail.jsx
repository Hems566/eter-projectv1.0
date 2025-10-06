import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Descriptions, 
  Table, 
  Button, 
  Space, 
  Row,
  Col,
  Statistic,
  Select,
  message,
  Tag,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CalendarOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import GeneratePDFButton from '../../components/pointages/GeneratePDFButton';
import moment from 'moment';

const { Option } = Select;

const FichePointageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fiche, setFiche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' ou 'YYYY-WW'

  useEffect(() => {
    loadFiche();
  }, [id]);

  const loadFiche = async () => {
    setLoading(true);
    try {
      const response = await pointagesAPI.getFiche(id);
      setFiche(response.data);
      // Définir la semaine par défaut à la première semaine avec des pointages
      if (response.data.pointages_journaliers?.length > 0) {
        const firstPointage = response.data.pointages_journaliers[0];
        const weekKey = moment(firstPointage.date_pointage).format('YYYY-[W]WW');
        setSelectedWeek(weekKey);
      }
    } catch (error) {
      message.error('Erreur lors du chargement de la fiche');
      navigate('/pointages');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir toutes les semaines de la période
  const getWeeksInPeriod = useMemo(() => {
    if (!fiche) return [];
    
    const weeks = [];
    const startDate = moment(fiche.periode_debut);
    const endDate = moment(fiche.periode_fin);
    let current = startDate.clone();
    
    while (current.isSameOrBefore(endDate, 'week')) {
      const weekKey = current.format('YYYY-[W]WW');
      const weekStart = current.clone().startOf('week').add(1, 'day'); // Lundi
      const weekEnd = current.clone().endOf('week').add(1, 'day'); // Dimanche
      
      // Vérifier si cette semaine chevauche la période
      if (weekEnd.isSameOrAfter(startDate) && weekStart.isSameOrBefore(endDate)) {
        weeks.push({
          key: weekKey,
          label: `${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM')}`,
          year: current.format('YYYY'),
          weekNumber: current.week()
        });
      }
      current.add(1, 'week');
    }
    
    return weeks;
  }, [fiche]);

  // Fonction pour grouper les pointages par semaine
  const getPointagesByWeek = useMemo(() => {
    if (!fiche?.pointages_journaliers) return {};
    
    const grouped = {};
    
    fiche.pointages_journaliers.forEach(pointage => {
      const weekKey = moment(pointage.date_pointage).format('YYYY-[W]WW');
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(pointage);
    });
    
    return grouped;
  }, [fiche]);

  // Pointages filtrés selon la semaine sélectionnée
  const filteredPointages = useMemo(() => {
    if (selectedWeek === 'all') {
      return fiche?.pointages_journaliers || [];
    }
    return getPointagesByWeek[selectedWeek] || [];
  }, [selectedWeek, fiche, getPointagesByWeek]);

  // Statistiques pour la semaine sélectionnée
  const weekStats = useMemo(() => {
    if (filteredPointages.length === 0) {
      return {
        jours: 0,
        heures_travail: 0,
        heures_panne: 0,
        heures_arret: 0,
        montant: 0
      };
    }
    
    return filteredPointages.reduce((acc, pointage) => ({
      jours: acc.jours + 1,
      heures_travail: acc.heures_travail + (pointage.heures_travail || 0),
      heures_panne: acc.heures_panne + (pointage.heures_panne || 0),
      heures_arret: acc.heures_arret + (pointage.heures_arret || 0),
      montant: acc.montant + (pointage.montant_journalier || 0)
    }), {
      jours: 0,
      heures_travail: 0,
      heures_panne: 0,
      heures_arret: 0,
      montant: 0
    });
  }, [filteredPointages]);

  const handleAddPointage = () => {
    navigate(`/pointages/journaliers/create?fiche_id=${fiche.id}`);
  };

  const pointagesColumns = [
    {
      title: 'Date',
      dataIndex: 'date_pointage',
      key: 'date_pointage',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date_pointage) - new Date(b.date_pointage),
    },
    {
      title: 'Jour',
      dataIndex: 'jour_semaine',
      key: 'jour_semaine',
      render: (jour) => jour?.substring(0, 3),
    },
    {
      title: 'Compteurs',
      key: 'compteurs',
      render: (_, record) => (
        <div>
          {record.compteur_debut && record.compteur_fin ? (
            <span>{record.compteur_debut} → {record.compteur_fin}</span>
          ) : (
            <span style={{ color: '#ccc' }}>Non renseigné</span>
          )}
        </div>
      ),
    },
    {
      title: 'Heures travail',
      dataIndex: 'heures_travail',
      key: 'heures_travail',
      align: 'center',
      render: (heures) => (
        <Tag color={heures > 0 ? 'green' : 'default'}>
          {heures || 0}h
        </Tag>
      ),
    },
    {
      title: 'Heures panne',
      dataIndex: 'heures_panne',
      key: 'heures_panne',
      align: 'center',
      render: (heures) => (
        <Tag color={heures > 0 ? 'orange' : 'default'}>
          {heures || 0}h
        </Tag>
      ),
    },
    {
      title: 'Heures arrêt',
      dataIndex: 'heures_arret',
      key: 'heures_arret',
      align: 'center',
      render: (heures) => (
        <Tag color={heures > 0 ? 'red' : 'default'}>
          {heures || 0}h
        </Tag>
      ),
    },
    {
      title: 'Carburant (L)',
      dataIndex: 'consommation_carburant',
      key: 'carburant',
      align: 'right',
      render: (value) => formatNumber(value,2) || '0.00',
    },
    {
      title: 'Montant (MRU)',
      dataIndex: 'montant_journalier',
      key: 'montant',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/pointages/journaliers/${record.id}/edit`)}
        >
          Modifier
        </Button>
      ),
    },
  ];

  if (loading) {
    return <Card loading={true} />;
  }

  if (!fiche) {
    return <Card>Fiche non trouvée</Card>;
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/pointages/fiches')}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  Fiche {fiche.numero_fiche}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {fiche.materiel_type} - {formatDate(fiche.periode_debut)} → {formatDate(fiche.periode_fin)}
                </p>
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
               <GeneratePDFButton ficheId={id} type="primary" />
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate(`/pointages/fiches/${id}/edit`)}
              >
                Modifier fiche
              </Button>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleAddPointage()}
              >
                Ajouter pointage
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Informations de la fiche */}
          <Card title="Informations de la fiche" style={{ marginBottom: 24 }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Numéro fiche">
                {fiche.numero_fiche}
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                {fiche.engagement_numero}
              </Descriptions.Item>
              
              <Descriptions.Item label="Matériel">
                {fiche.materiel_type} (Qté: {fiche.materiel_quantite})
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                {formatCurrency(fiche.prix_unitaire)} MRU
              </Descriptions.Item>
              
              <Descriptions.Item label="Période" span={2}>
                Du {formatDate(fiche.periode_debut)} au {formatDate(fiche.periode_fin)}
              </Descriptions.Item>
              
              {fiche.immatriculation && (
                <Descriptions.Item label="Immatriculation" span={2}>
                  {fiche.immatriculation}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Sélecteur de semaine */}
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                Pointages détaillés
              </Space>
            }
            extra={
              <Select
                value={selectedWeek}
                onChange={setSelectedWeek}
                style={{ width: 200 }}
                placeholder="Sélectionner une semaine"
              >
                <Option value="all">Toutes les semaines</Option>
                <Divider style={{ margin: '4px 0' }} />
                {getWeeksInPeriod.map(week => (
                  <Option key={week.key} value={week.key}>
                    Semaine {week.weekNumber} ({week.label})
                  </Option>
                ))}
              </Select>
            }
            style={{ marginBottom: 24 }}
          >
            {/* Statistiques de la semaine sélectionnée */}
            {selectedWeek !== 'all' && (
              <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Jours"
                      value={weekStats.jours}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Travail"
                      value={weekStats.heures_travail}
                      suffix="h"
                      valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Panne"
                      value={weekStats.heures_panne}
                      suffix="h"
                      valueStyle={{ color: '#faad14', fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Arrêt"
                      value={weekStats.heures_arret}
                      suffix="h"
                      valueStyle={{ color: '#cf1322', fontSize: '14px' }}
                    />
                  </Col>
                </Row>
              </div>
            )}

            {/* Tableau des pointages */}
            <Table
              columns={pointagesColumns}
              dataSource={filteredPointages}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
              locale={{
                emptyText: selectedWeek === 'all' 
                  ? 'Aucun pointage pour cette fiche' 
                  : 'Aucun pointage pour cette semaine'
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques globales */}
          <Card style={{ marginBottom: 24 }}>
            <Statistic
              title="Montant total calculé"
              value={fiche.montant_total_calcule}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600' }}
            />
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Jours pointés"
                  value={fiche.total_jours_pointes || 0}
                  suffix="jours"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Heures travail"
                  value={fiche.total_heures_travail || 0}
                  suffix="h"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Heures panne"
                  value={fiche.total_heures_panne || 0}
                  suffix="h"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Heures arrêt"
                  value={fiche.total_heures_arret || 0}
                  suffix="h"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Résumé par semaine */}
          <Card title="Résumé par semaine">
            {Object.entries(getPointagesByWeek).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                Aucun pointage saisi
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {getWeeksInPeriod
                  .filter(week => getPointagesByWeek[week.key])
                  .map(week => {
                    const weekData = getPointagesByWeek[week.key];
                    const weekTotal = weekData.reduce((sum, p) => sum + (p.montant_journalier || 0), 0);
                    const daysCount = weekData.length;
                    
                    return (
                      <div 
                        key={week.key} 
                        style={{ 
                          padding: '8px 0', 
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedWeek(week.key)}
                      >
                        <div style={{ fontWeight: selectedWeek === week.key ? 'bold' : 'normal' }}>
                          Semaine {week.weekNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {week.label} • {daysCount} jour{daysCount > 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold' }}>
                          {formatCurrency(weekTotal)} MRU
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FichePointageDetail;