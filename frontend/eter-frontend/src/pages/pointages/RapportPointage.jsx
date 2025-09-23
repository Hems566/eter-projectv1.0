import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Select, 
  DatePicker, 
  Button, 
  Table, 
  Statistic, 
  Space,
  Tabs,
  Progress,
  Tag,
  Divider
} from 'antd';
import { 
  DownloadOutlined, 
  BarChartOutlined, 
  FileExcelOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const RapportsPointage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDates, setSelectedDates] = useState(null);
  const [rapportData, setRapportData] = useState({});
  const [activeTab, setActiveTab] = useState('synthese');

  useEffect(() => {
    loadRapportDefaut();
  }, []);

  const loadRapportDefaut = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await loadRapportMensuel(currentMonth);
  };

  const loadRapportMensuel = async (mois) => {
    setLoading(true);
    try {
      const response = await pointagesAPI.rapportMensuel(mois);
      setRapportData(response.data);
    } catch (error) {
      console.error('Erreur chargement rapport:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRapportPersonnalise = async () => {
    if (!selectedDates) return;
    
    setLoading(true);
    try {
      const debut = selectedDates[0].format('YYYY-MM-DD');
      const fin = selectedDates[1].format('YYYY-MM-DD');
      
      const response = await pointagesAPI.rapportPersonnalise({ debut, fin });
      setRapportData(response.data);
    } catch (error) {
      console.error('Erreur chargement rapport:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period === 'month') {
      loadRapportDefaut();
    }
  };

  // Configuration des graphiques
  const lineChartConfig = {
    data: rapportData.evolution_quotidienne || [],
    xField: 'date',
    yField: 'heures_travail',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 2000,
      },
    },
  };

  const columnChartConfig = {
    data: rapportData.repartition_materiels || [],
    xField: 'materiel',
    yField: 'heures',
    seriesField: 'type',
    isGroup: true,
    columnStyle: {
      radius: [2, 2, 0, 0],
    },
  };

  const pieChartConfig = {
    data: rapportData.repartition_temps || [],
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'spider',
      labelHeight: 28,
      content: '{name}\n{percentage}',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
  };

  // Colonnes pour le tableau détaillé
  const detailColumns = [
    {
      title: 'Date',
      dataIndex: 'date_pointage',
      key: 'date',
      render: (date) => formatDate(date),
      sorter: true,
    },
    {
      title: 'Fiche',
      dataIndex: ['fiche_pointage', 'numero_fiche'],
      key: 'fiche',
    },
    {
      title: 'Matériel',
      dataIndex: 'materiel_display',
      key: 'materiel',
    },
    {
      title: 'Heures travail',
      dataIndex: 'heures_travail',
      key: 'heures_travail',
      align: 'center',
      render: (heures) => (
        <Tag color={heures > 0 ? 'green' : 'default'}>
          {heures}h
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
          {heures}h
        </Tag>
      ),
    },
    {
      title: 'Carburant (L)',
      dataIndex: 'consommation_carburant',
      key: 'carburant',
      align: 'right',
      render: (value) => value?.toFixed(2) || '0.00',
    },
    {
      title: 'Montant (MRU)',
      dataIndex: 'montant_journalier',
      key: 'montant',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
  ];

  const renderSynthese = () => (
    <div>
      {/* Statistiques principales */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total pointages"
              value={rapportData.total_pointages || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Heures travail"
              value={rapportData.total_heures_travail || 0}
              suffix="h"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Heures panne"
              value={rapportData.total_heures_panne || 0}
              suffix="h"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Montant total"
              value={rapportData.total_montant || 0}
              suffix="MRU"
              precision={0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Indicateurs de performance */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="Taux d'utilisation">
            <div>
              {(() => {
                const totalHeures = (rapportData.total_heures_travail || 0) + 
                                 (rapportData.total_heures_panne || 0) + 
                                 (rapportData.total_heures_arret || 0);
                const tauxUtilisation = totalHeures > 0 ? 
                  ((rapportData.total_heures_travail || 0) / totalHeures * 100) : 0;
                
                return (
                  <Progress
                    type="circle"
                    percent={Math.round(tauxUtilisation)}
                    format={percent => `${percent}%`}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                );
              })()}
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="Disponibilité">
            <div>
              {(() => {
                const totalHeures = (rapportData.total_heures_travail || 0) + 
                                 (rapportData.total_heures_panne || 0) + 
                                 (rapportData.total_heures_arret || 0);
                const heuresDisponibles = (rapportData.total_heures_travail || 0) + 
                                        (rapportData.total_heures_arret || 0);
                const tauxDisponibilite = totalHeures > 0 ? 
                  (heuresDisponibles / totalHeures * 100) : 0;
                
                return (
                  <Progress
                    type="circle"
                    percent={Math.round(tauxDisponibilite)}
                    format={percent => `${percent}%`}
                    strokeColor={{
                      '0%': '#faad14',
                      '100%': '#52c41a',
                    }}
                  />
                );
              })()}
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Consommation moyenne">
            <Statistic
              title="Par heure de travail"
              value={(() => {
                const heuresTravail = rapportData.total_heures_travail || 0;
                const carburantTotal = rapportData.total_carburant || 0;
                return heuresTravail > 0 ? (carburantTotal / heuresTravail) : 0;
              })()}
              suffix="L/h"
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
            <Divider />
            <Statistic
              title="Total consommé"
              value={rapportData.total_carburant || 0}
              suffix="L"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Répartition du temps */}
      <Card title="Répartition du temps de fonctionnement" style={{ marginBottom: 24 }}>
        <Pie {...pieChartConfig} />
      </Card>
    </div>
  );

  const renderGraphiques = () => (
    <div>
      {/* Évolution quotidienne */}
      <Card title="Évolution quotidienne des heures" style={{ marginBottom: 24 }}>
        <Line {...lineChartConfig} />
      </Card>

      {/* Répartition par matériel */}
      <Card title="Répartition par type de matériel">
        <Column {...columnChartConfig} />
      </Card>
    </div>
  );

  const renderDetails = () => (
    <Card title="Détail des pointages">
      <Table
        columns={detailColumns}
        dataSource={rapportData.pointages_detail || []}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} sur ${total} pointages`,
        }}
        scroll={{ x: 800 }}
        summary={(pageData) => {
          const totalHeuresTravail = pageData.reduce((sum, record) => 
            sum + (record.heures_travail || 0), 0);
          const totalHeuresPanne = pageData.reduce((sum, record) => 
            sum + (record.heures_panne || 0), 0);
          const totalCarburant = pageData.reduce((sum, record) => 
            sum + (record.consommation_carburant || 0), 0);
          const totalMontant = pageData.reduce((sum, record) => 
            sum + parseFloat(record.montant_journalier || 0), 0);

          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <strong>Total page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Tag color="green"><strong>{totalHeuresTravail}h</strong></Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Tag color="orange"><strong>{totalHeuresPanne}h</strong></Tag>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>{totalCarburant.toFixed(2)}L</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong style={{ color: '#1890ff' }}>
                    {formatCurrency(totalMontant)} MRU
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </Card>
  );

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <h2 style={{ margin: 0 }}>Rapports de pointage</h2>
            <p style={{ margin: 0, color: '#666' }}>
              Analyse et statistiques des pointages
            </p>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<FileExcelOutlined />}
                onClick={() => {/* Export Excel */}}
              >
                Exporter Excel
              </Button>
              <Button 
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {/* Export PDF */}}
              >
                Exporter PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filtres */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>Période :</span>
              <Select
                value={selectedPeriod}
                onChange={handlePeriodChange}
                style={{ width: 120 }}
              >
                <Option value="month">Ce mois</Option>
                <Option value="custom">Personnalisée</Option>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <>
                  <RangePicker
                    value={selectedDates}
                    onChange={setSelectedDates}
                    format="DD/MM/YYYY"
                  />
                  <Button 
                    type="primary"
                    onClick={loadRapportPersonnalise}
                    loading={loading}
                  >
                    Générer
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Contenu des rapports */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Synthèse
              </span>
            } 
            key="synthese"
          >
            {renderSynthese()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Graphiques
              </span>
            } 
            key="graphiques"
          >
            {renderGraphiques()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <CalendarOutlined />
                Détails
              </span>
            } 
            key="details"
          >
            {renderDetails()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default RapportsPointage;
