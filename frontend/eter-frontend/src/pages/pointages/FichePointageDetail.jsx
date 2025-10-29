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
  Divider,
  Typography,
  Empty,
  Progress,
  Alert
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  CalendarOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  ToolOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import GeneratePDFButton from '../../components/pointages/GeneratePDFButton';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

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
        montant: 0,
        total_heures: 0
      };
    }
    
    const totalHeures = filteredPointages.reduce((acc, pointage) => 
      acc + (pointage.heures_travail || 0) + (pointage.heures_panne || 0) + (pointage.heures_arret || 0), 0);
    
    return filteredPointages.reduce((acc, pointage) => ({
      jours: acc.jours + 1,
      heures_travail: acc.heures_travail + (pointage.heures_travail || 0),
      heures_panne: acc.heures_panne + (pointage.heures_panne || 0),
      heures_arret: acc.heures_arret + (pointage.heures_arret || 0),
      montant: acc.montant + (pointage.montant_journalier || 0),
      total_heures: totalHeures
    }), {
      jours: 0,
      heures_travail: 0,
      heures_panne: 0,
      heures_arret: 0,
      montant: 0,
      total_heures: 0
    });
  }, [filteredPointages]);

  // Données pour la ligne de total
  const totalRow = useMemo(() => {
    if (filteredPointages.length === 0) return null;
    return {
      key: 'total',
      date_pointage: 'Total',
      jour_semaine: '',
      heures_travail: weekStats.heures_travail,
      heures_panne: weekStats.heures_panne,
      heures_arret: weekStats.heures_arret,
      consommation_carburant: filteredPointages.reduce((acc, p) => acc + (p.consommation_carburant || 0), 0),
      montant_journalier: weekStats.montant,
    };
  }, [weekStats, filteredPointages]);

  const completionRate = useMemo(() => {
    if (!fiche) return 0;
    const totalDaysInPeriod = moment(fiche.periode_fin).diff(moment(fiche.periode_debut), 'days') + 1;
    return Math.round((fiche.total_jours_pointes / totalDaysInPeriod) * 100);
  }, [fiche]);

  const dataSourceWithTotal = useMemo(() => {
    if (!fiche) return [];
    const data = [...filteredPointages];
    if (totalRow) {
      data.push(totalRow);
    }
    return data;
  }, [fiche, filteredPointages, totalRow]);

  const handleAddPointage = () => {
    navigate(`/pointages/journaliers/create?fiche_id=${fiche.id}`);
  };

  const pointagesColumns = [
    {
      title: 'Date',
      dataIndex: 'date_pointage',
      key: 'date_pointage',
      width: 100,
      render: (date, record) => 
        record.key === 'total' ? (
          <Text strong>{date}</Text>
        ) : (
          formatDate(date)
        ),
      sorter: (a, b) => new Date(a.date_pointage) - new Date(b.date_pointage),
    },
    {
      title: 'Jour',
      dataIndex: 'jour_semaine',
      key: 'jour_semaine',
      width: 80,
      render: (jour, record) => 
        record.key === 'total' ? null : (
          <Tag color="blue">{jour?.substring(0, 3)}</Tag>
        ),
    },
    {
      title: 'Compteurs',
      key: 'compteurs',
      width: 150,
      render: (_, record) => 
        record.key === 'total' ? null : (
          <Space direction="vertical" size={0}>
            {record.compteur_debut && record.compteur_fin ? (
              <Text>{record.compteur_debut} → {record.compteur_fin}</Text>
            ) : (
              <Text type="secondary">Non renseigné</Text>
            )}
          </Space>
        ),
    },
    {
      title: 'Heures travail',
      dataIndex: 'heures_travail',
      key: 'heures_travail',
      width: 100,
      align: 'center',
      render: (heures, record) => 
        record.key === 'total' ? (
          <Text strong style={{ color: '#52c41a' }}>{heures}h</Text>
        ) : (
          <Tag color={heures > 0 ? 'green' : 'default'} style={{ margin: 0 }}>
            {heures || 0}h
          </Tag>
        ),
    },
    {
      title: 'Heures panne',
      dataIndex: 'heures_panne',
      key: 'heures_panne',
      width: 100,
      align: 'center',
      render: (heures, record) => 
        record.key === 'total' ? (
          <Text strong style={{ color: '#faad14' }}>{heures}h</Text>
        ) : (
          <Tag color={heures > 0 ? 'orange' : 'default'} style={{ margin: 0 }}>
            {heures || 0}h
          </Tag>
        ),
    },
    {
      title: 'Heures arrêt',
      dataIndex: 'heures_arret',
      key: 'heures_arret',
      width: 100,
      align: 'center',
      render: (heures, record) => 
        record.key === 'total' ? (
          <Text strong style={{ color: '#cf1322' }}>{heures}h</Text>
        ) : (
          <Tag color={heures > 0 ? 'red' : 'default'} style={{ margin: 0 }}>
            {heures || 0}h
          </Tag>
        ),
    },
    {
      title: 'Carburant (L)',
      dataIndex: 'consommation_carburant',
      key: 'carburant',
      width: 100,
      align: 'right',
      render: (value, record) => 
        record.key === 'total' ? (
          <Text strong>{formatNumber(value, 2)} L</Text>
        ) : (
          formatNumber(value, 2) || '0.00'
        ),
    },
    {
      title: 'Montant (MRU)',
      dataIndex: 'montant_journalier',
      key: 'montant',
      width: 120,
      align: 'right',
      render: (value, record) => 
        record.key === 'total' ? (
          <Text strong style={{ color: '#3f8600' }}>{formatCurrency(value)}</Text>
        ) : (
          formatCurrency(value)
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => 
        record.key !== 'total' && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
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
    return <Card><Empty description="Fiche non trouvée" /></Card>;
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  Fiche {fiche.numero_fiche}
                </Title>
                <Text type="secondary">
                  {fiche.materiel_type} - {formatDate(fiche.periode_debut)} → {formatDate(fiche.periode_fin)}
                </Text>
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
          <Card title="Informations de la fiche" style={{ marginBottom: 24, borderRadius: '8px' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Numéro fiche">
                <Tag color="blue">{fiche.numero_fiche}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                <Tag color="green">{fiche.engagement_numero}</Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Matériel">
                <Space>
                  <ToolOutlined />
                  {fiche.materiel_type} (Qté: {fiche.materiel_quantite})
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                <DollarCircleOutlined /> {formatCurrency(fiche.prix_unitaire)} MRU
              </Descriptions.Item>
              
              <Descriptions.Item label="Période" span={2}>
                <CalendarOutlined /> Du {formatDate(fiche.periode_debut)} au {formatDate(fiche.periode_fin)}
              </Descriptions.Item>
              
              {fiche.immatriculation && (
                <Descriptions.Item label="Immatriculation" span={2}>
                  <Tag color="geekblue">{fiche.immatriculation}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Sélecteur de semaine */}
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                Pointages détaillés
              </Space>
            }
            extra={
              <Select
                value={selectedWeek}
                onChange={setSelectedWeek}
                style={{ width: 220 }}
                dropdownMatchSelectWidth={false}
                size="small"
              >
                <Option value="all">
                  <Space>
                    <CalendarOutlined />
                    Toutes les semaines
                  </Space>
                </Option>
                <Divider style={{ margin: '4px 0' }} />
                {getWeeksInPeriod.map(week => (
                  <Option key={week.key} value={week.key}>
                    <Space>
                      <CalendarOutlined />
                      Semaine {week.weekNumber} ({week.label})
                    </Space>
                  </Option>
                ))}
              </Select>
            }
            style={{ marginBottom: 24, borderRadius: '8px' }}
          >
            {/* Alert pour complétion */}
            <Alert
              message={
                <Space>
                  <Progress 
                    percent={completionRate} 
                    size="small" 
                    strokeColor="#52c41a"
                    showInfo={false}
                  />
                  <Text>Complétion: {completionRate}% ({fiche.total_jours_pointes}/{moment(fiche.periode_fin).diff(moment(fiche.periode_debut), 'days') + 1} jours)</Text>
                </Space>
              }
              type={completionRate < 80 ? 'warning' : 'success'}
              showIcon={false}
              style={{ marginBottom: 16 }}
            />

            {/* Statistiques de la semaine sélectionnée */}
            {selectedWeek !== 'all' && filteredPointages.length > 0 && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={12}>
                  <Col span={6}>
                    <Statistic
                      title={<ClockCircleOutlined />}
                      value={weekStats.jours}
                      valueStyle={{ fontSize: '16px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                      value={weekStats.heures_travail}
                      suffix="h"
                      valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<ToolOutlined style={{ color: '#faad14' }} />}
                      value={weekStats.heures_panne}
                      suffix="h"
                      valueStyle={{ color: '#faad14', fontSize: '16px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title={<PauseCircleOutlined style={{ color: '#cf1322' }} />}
                      value={weekStats.heures_arret}
                      suffix="h"
                      valueStyle={{ color: '#cf1322', fontSize: '16px' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Tableau des pointages */}
            <Table
              columns={pointagesColumns}
              dataSource={dataSourceWithTotal}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 1000 }}
              locale={{
                emptyText: (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      selectedWeek === 'all' 
                        ? 'Aucun pointage pour cette fiche' 
                        : 'Aucun pointage pour cette semaine'
                    }
                  />
                )
              }}
              footer={() => null}
              rowClassName={(record) => record.key === 'total' ? 'ant-table-row-total' : ''}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques globales */}
          <Card title="Statistiques globales" style={{ marginBottom: 24, borderRadius: '8px' }}>
            <Statistic
              title={<DollarCircleOutlined />}
              value={formatCurrency(fiche.montant_total_calcule)}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600', fontSize: '24px' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Jours pointés"
                  value={fiche.total_jours_pointes || 0}
                  suffix="jours"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Heures travail"
                  value={fiche.total_heures_travail || 0}
                  suffix="h"
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Heures panne"
                  value={fiche.total_heures_panne || 0}
                  suffix="h"
                  valueStyle={{ color: '#faad14', fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Heures arrêt"
                  value={fiche.total_heures_arret || 0}
                  suffix="h"
                  valueStyle={{ color: '#cf1322', fontSize: '16px' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Résumé par semaine */}
          <Card title="Résumé par semaine" style={{ borderRadius: '8px' }}>
            {Object.entries(getPointagesByWeek).length === 0 ? (
              <Empty description={<Text>Aucun pointage saisi</Text>} />
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {getWeeksInPeriod
                  .filter(week => getPointagesByWeek[week.key])
                  .map(week => {
                    const weekData = getPointagesByWeek[week.key];
                    const weekTotal = weekData.reduce((sum, p) => sum + (p.montant_journalier || 0), 0);
                    const daysCount = weekData.length;
                    const weekHeures = weekData.reduce((sum, p) => sum + (p.heures_travail || 0) + (p.heures_panne || 0) + (p.heures_arret || 0), 0);
                    
                    return (
                      <Card
                        key={week.key}
                        size="small"
                        hoverable
                        style={{ marginBottom: 8, borderRadius: '4px' }}
                        bodyStyle={{ padding: '12px' }}
                        onClick={() => setSelectedWeek(week.key)}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <CalendarOutlined />
                            <Text strong>Semaine {week.weekNumber}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {week.label} • {daysCount} jour{daysCount > 1 ? 's' : ''} • {weekHeures}h total
                          </Text>
                          <Text strong style={{ color: '#3f8600', marginTop: 4 }}>
                            {formatCurrency(weekTotal)} MRU
                          </Text>
                        </Space>
                      </Card>
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