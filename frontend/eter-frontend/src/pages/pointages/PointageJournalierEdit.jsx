// pages/pointages/PointageJournalierEdit.jsx
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  DatePicker, 
  Button, 
  Card, 
  Space,
  message,
  Row,
  Col,
  Descriptions,
  InputNumber,
  Divider,
  Alert,
  Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { usePointagesStore } from '../../store/pointagesStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { TextArea } = Input;

const PointageJournalierEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pointageJournalier, loading, getPointageJournalier, updatePointageJournalier } = usePointagesStore();
  const [form] = Form.useForm();
  const [initialLoading, setInitialLoading] = useState(true);
  const [montantEstime, setMontantEstime] = useState(0);

  useEffect(() => {
    loadPointage();
  }, [id]);

  const loadPointage = async () => {
    setInitialLoading(true);
    try {
      const result = await getPointageJournalier(id);
      if (result.success) {
        const data = result.data;
        
        // Pré-remplir le formulaire
        form.setFieldsValue({
          date_pointage: moment(data.date_pointage),
          compteur_debut: data.compteur_debut,
          compteur_fin: data.compteur_fin,
          heures_travail: parseFloat(data.heures_travail),
          heures_panne: parseFloat(data.heures_panne),
          heures_arret: parseFloat(data.heures_arret),
          consommation_carburant: parseFloat(data.consommation_carburant),
          observations: data.observations,
          montant_estime: parseFloat(data.montant_journalier)
        });
        
        setMontantEstime(parseFloat(data.montant_journalier));
      } else {
        message.error('Pointage non trouvé');
        navigate('/pointages/journaliers');
      }
    } catch (error) {
      message.error('Erreur lors du chargement');
      navigate('/pointages/journaliers');
    } finally {
      setInitialLoading(false);
    }
  };

  const calculateMontant = (values) => {
    if (!pointageJournalier?.fiche_pointage?.prix_unitaire) return 0;
    
    const heuresTravail = values.heures_travail || 0;
    const heuresPanne = values.heures_panne || 0;
    const heuresArret = values.heures_arret || 0;
    const prixUnitaire = parseFloat(pointageJournalier.fiche_pointage.prix_unitaire);
    
    const montant = (heuresTravail * prixUnitaire) + 
                   (heuresPanne * prixUnitaire * 0.5) + 
                   (heuresArret * prixUnitaire * 0.3);
    
    return montant;
  };
  console.log(pointageJournalier);
  const handleValuesChange = (changedValues, allValues) => {
    if (['heures_travail', 'heures_panne', 'heures_arret'].some(field => field in changedValues)) {
      const montant = calculateMontant(allValues);
      setMontantEstime(montant);
      form.setFieldsValue({ montant_estime: montant.toFixed(3) });
    }
  };

  const handleSubmit = async (values) => {
    try {
      const pointageData = {
        date_pointage: values.date_pointage.format('YYYY-MM-DD'),
        compteur_debut: values.compteur_debut ? parseInt(values.compteur_debut) : null,
        compteur_fin: values.compteur_fin ? parseInt(values.compteur_fin) : null,
        heures_travail: values.heures_travail ? parseFloat(values.heures_travail).toFixed(2) : "0.00",
        heures_panne: values.heures_panne ? parseFloat(values.heures_panne).toFixed(2) : "0.00",
        heures_arret: values.heures_arret ? parseFloat(values.heures_arret).toFixed(2) : "0.00",
        consommation_carburant: values.consommation_carburant ? parseFloat(values.consommation_carburant).toFixed(2) : "0.00",
        observations: values.observations?.trim() || ''
      };

      const result = await updatePointageJournalier(id, pointageData);
      
      if (result.success) {
        message.success('Pointage journalier modifié avec succès');
        navigate(`/pointages/fiches/${pointageJournalier.fiche_pointage.id}`);
      } else {
        // Afficher les erreurs détaillées
        if (result.error && typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
            message.error(`${field}: ${errorMsg}`);
          });
        } else {
          message.error(result.error?.message || 'Erreur lors de la modification');
        }
      }
    } catch (error) {
      message.error('Erreur lors de la modification');
    }
  };

  const disabledDate = (current) => {
    if (!pointageJournalier?.fiche_pointage) return true;
    
    const debut = moment(pointageJournalier.fiche_pointage.periode_debut);
    const fin = moment(pointageJournalier.fiche_pointage.periode_fin);
    
    return !current.isBetween(debut, fin, 'day', '[]');
  };

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Chargement du pointage...</p>
      </div>
    );
  }

  if (!pointageJournalier) {
    return (
      <Card>
        <Alert
          message="Pointage non trouvé"
          description="Le pointage journalier demandé n'existe pas ou a été supprimé."
          type="error"
          showIcon
        />
      </Card>
    );
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
                onClick={() => navigate(`/pointages/fiches/${pointageJournalier.fiche_pointage.id}`)}
              >
                Retour à la fiche
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>Modifier le pointage journalier</h2>
                <p style={{ margin: 0, color: '#666' }}>
                   {formatDate(pointageJournalier.date_pointage)}{/* - {pointageJournalier.fiche_pointage.numero_fiche} */}
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Formulaire de modification */}
          <Card title="Modifier le pointage">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={handleValuesChange}
              size="large"
            >
              <Form.Item
                name="date_pointage"
                label="Date de pointage"
                rules={[{ required: true, message: 'La date est obligatoire' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Sélectionner la date"
                  disabledDate={disabledDate}
                />
              </Form.Item>

              <Divider orientation="left">Compteurs</Divider>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="compteur_debut"
                    label="Compteur début"
                    rules={[{ type: 'number', min: 0, message: 'Valeur positive requise' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Compteur en début de journée"
                      min={0}
                      precision={1}
                      addonAfter="h"
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    name="compteur_fin"
                    label="Compteur fin"
                    rules={[{ type: 'number', min: 0, message: 'Valeur positive requise' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Compteur en fin de journée"
                      min={0}
                      precision={1}
                      addonAfter="h"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Heures détaillées</Divider>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="heures_travail"
                    label="Heures de travail"
                    rules={[
                      { required: true, message: 'Les heures de travail sont obligatoires' },
                      { type: 'number', min: 0, max: 24, message: 'Entre 0 et 24 heures' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.0"
                      min={0}
                      max={24}
                      precision={1}
                      step={0.5}
                      addonAfter="h"
                    />
                  </Form.Item>
                </Col>
                
                <Col span={8}>
                  <Form.Item
                    name="heures_panne"
                    label="Heures de panne"
                    rules={[{ type: 'number', min: 0, max: 24, message: 'Entre 0 et 24 heures' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.0"
                      min={0}
                      max={24}
                      precision={1}
                      step={0.5}
                      addonAfter="h"
                    />
                  </Form.Item>
                </Col>
                
                <Col span={8}>
                  <Form.Item
                    name="heures_arret"
                    label="Heures d'arrêt"
                    rules={[{ type: 'number', min: 0, max: 24, message: 'Entre 0 et 24 heures' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.0"
                      min={0}
                      max={24}
                      precision={1}
                      step={0.5}
                      addonAfter="h"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Carburant et montant</Divider>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="consommation_carburant"
                    label="Consommation carburant"
                    rules={[{ type: 'number', min: 0, message: 'Valeur positive requise' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.0"
                      min={0}
                      precision={2}
                      addonAfter="L"
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    name="montant_estime"
                    label="Montant estimé (calculé automatiquement)"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.000"
                      disabled
                      precision={3}
                      addonAfter="MRU"
                      value={montantEstime}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="observations"
                label="Observations"
              >
                <TextArea
                  rows={4}
                  placeholder="Remarques sur le pointage, incidents, conditions particulières..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                  >
                    Enregistrer les modifications
                  </Button>
                  <Button 
                    onClick={() => navigate(`/pointages/fiches/${pointageJournalier.fiche_pointage.id}`)}
                  >
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations de la fiche */}
          <Card title="Fiche de pointage" style={{ marginBottom: 24 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Numéro fiche">
                {/* {pointageJournalier.fiche_pointage.numero_fiche} */}
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                <Button 
                  type="link" 
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/engagements/${pointageJournalier.fiche_pointage.engagement?.id}`)}
                >
                  {/* {pointageJournalier.fiche_pointage.engagement?.numero} */}
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="Matériel">
                {/* {pointageJournalier.fiche_pointage.materiel_type} */}
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                {/* {formatCurrency(pointageJournalier.fiche_pointage.prix_unitaire)} MRU/h */}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Valeurs actuelles */}
          <Card title="Valeurs actuelles" size="small">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Heures travail">
                {pointageJournalier.heures_travail}h
              </Descriptions.Item>
              <Descriptions.Item label="Heures panne">
                {pointageJournalier.heures_panne}h
              </Descriptions.Item>
              <Descriptions.Item label="Heures arrêt">
                {pointageJournalier.heures_arret}h
              </Descriptions.Item>
              <Descriptions.Item label="Carburant">
                {pointageJournalier.consommation_carburant}L
              </Descriptions.Item>
              <Descriptions.Item label="Montant">
                {formatCurrency(pointageJournalier.montant_journalier)} MRU
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PointageJournalierEdit;
