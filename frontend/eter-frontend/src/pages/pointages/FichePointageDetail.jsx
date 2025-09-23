import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Table, 
  Button, 
  Space, 
  Row,
  Col,
  Statistic,
  Calendar,
  Badge,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Tag
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PlusOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const { TextArea } = Input;

const FichePointageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fiche, setFiche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pointageForm] = Form.useForm();

  useEffect(() => {
    loadFiche();
  }, [id]);

  const loadFiche = async () => {
    setLoading(true);
    try {
      const response = await pointagesAPI.getFiche(id);
      setFiche(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement de la fiche');
      navigate('/pointages');
    } finally {
      setLoading(false);
    }
  };

  // const handleAddPointage = async (values) => {
  //   try {
  //   // Rediriger vers le formulaire complet au lieu d'utiliser le modal
  //   navigate(`/pointages/journaliers/create?fiche_id=${fiche.id}&date=${selectedDate.format('YYYY-MM-DD')}`);
  // } catch (error) {
  //   message.error('Erreur lors de la redirection');
  // }
  //   //   await pointagesAPI.createPointageJournalier({
  //   //     fiche_pointage: fiche.id,
  //   //     date_pointage: selectedDate.format('YYYY-MM-DD'),
  //   //     ...values
  //   //   });
  //   //   message.success('Pointage ajouté avec succès');
  //   //   setModalVisible(false);
  //   //   pointageForm.resetFields();
  //   //   loadFiche(); // Recharger les données
  //   // } catch (error) {
  //   //   message.error('Erreur lors de l\'ajout du pointage');
  //   // }
  // };

  const getCalendarData = (date) => {
    if (!fiche || !fiche.pointages_journaliers) return [];
    
    const pointage = fiche.pointages_journaliers.find(p => 
      formatDate(p.date_pointage) === date.format('YYYY-MM-DD')
    );
    
    if (pointage) {
      const badges = [];
      if (pointage.heures_travail > 0) {
        badges.push({ type: 'success', content: `${pointage.heures_travail}h` });
      }
      if (pointage.heures_panne > 0) {
        badges.push({ type: 'warning', content: `P:${pointage.heures_panne}h` });
      }
      if (pointage.heures_arret > 0) {
        badges.push({ type: 'error', content: `A:${pointage.heures_arret}h` });
      }
      return badges;
    }
    
    return [];
  };

  const dateCellRender = (date) => {
    const listData = getCalendarData(date);
    return (
      <div>
        {listData.map((item, index) => (
          <Badge key={index} status={item.type} text={item.content} />
        ))}
      </div>
    );
  };

  const handleAddPointage = (date = null) => {
    const dateParam = date ? `&date=${date.format('YYYY-MM-DD')}` : '';
    navigate(`/pointages/journaliers/create?fiche_id=${fiche.id}${dateParam}`);
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
                onClick={() => navigate('/pointages')}
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

          {/* Calendrier des pointages */}
          <Card title="Calendrier des pointages" style={{ marginBottom: 24 }}>
            <Calendar
              dateCellRender={dateCellRender}
              onSelect={(date) => {
                // Vérifier si la date est dans la période
                if (date.isBetween(fiche.periode_debut, fiche.periode_fin, 'day', '[]')) {
                  setSelectedDate(date);
                  setModalVisible(true);
                } else {
                  message.warning('Cette date est en dehors de la période de pointage');
                }
              }}
            />
          </Card>

          {/* Tableau des pointages */}
          <Card title={`Pointages détaillés (${fiche.total_jours_pointes || 0} jours)`}>
            <Table
              columns={pointagesColumns}
              dataSource={fiche.pointages_journaliers || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>

        <Col span={8}>
          {/* Statistiques */}
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

          {/* Résumé hebdomadaire */}
          <Card title="Résumé par semaine">
            {/* Logique pour grouper par semaine */}
            <div style={{ fontSize: '12px', color: '#666' }}>
              Fonctionnalité à implémenter : résumé hebdomadaire des pointages
            </div>
          </Card>
        </Col>
      </Row>

      
    </div>
  );
};

export default FichePointageDetail;
