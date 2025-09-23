import React, { useState, useEffect } from 'react';
import { 
  Form, 
  InputNumber, 
  Input, 
  Button, 
  Card, 
  Row, 
  Col,
  message,
  Space,
  Descriptions,
  Alert,
  Progress,
  Tag
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  WarningOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { TextArea } = Input;

const PointageJournalierForm = () => {
  const { id } = useParams(); // ID du pointage à modifier (optionnel)
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pointage, setPointage] = useState(null);
  const [fichePointage, setFichePointage] = useState(null);
  const [totalHeures, setTotalHeures] = useState(0);
  const [montantEstime, setMontantEstime] = useState(0);

  // Récupérer les paramètres depuis l'URL (pour création)
  const searchParams = new URLSearchParams(location.search);
  const ficheId = searchParams.get('fiche_id');
  const datePointage = searchParams.get('date');

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      loadPointage();
    } else if (ficheId) {
      loadFichePointage();
      if (datePointage) {
        form.setFieldsValue({ date_pointage: datePointage });
      }
    }
  }, [id, ficheId, datePointage]);

  useEffect(() => {
    // Recalculer quand les heures changent
    const heuresTravail = form.getFieldValue('heures_travail') || 0;
    const heuresPanne = form.getFieldValue('heures_panne') || 0;
    const heuresArret = form.getFieldValue('heures_arret') || 0;
    
    const total = parseFloat(heuresTravail) + parseFloat(heuresPanne) + parseFloat(heuresArret);
    setTotalHeures(total);

    // Calculer le montant estimé
    if (fichePointage && heuresTravail > 0) {
      const prixUnitaire = fichePointage.prix_unitaire || 0;
      const facturation = fichePointage.materiel?.materiel?.type_facturation;
      
      let montant = 0;
      if (facturation === 'PAR_JOUR') {
        montant = prixUnitaire; // Prix fixe par jour si on travaille
      } else if (facturation === 'PAR_HEURE') {
        montant = prixUnitaire * heuresTravail;
      } else {
        montant = prixUnitaire; // Forfaitaire
      }
      setMontantEstime(montant);
    } else {
      setMontantEstime(0);
    }
  }, [form.getFieldValue('heures_travail'), form.getFieldValue('heures_panne'), form.getFieldValue('heures_arret'), fichePointage]);

  const loadPointage = async () => {
    setLoading(true);
    try {
      const response = await pointagesAPI.getPointage(id);
      setPointage(response.data);
      setFichePointage(response.data.fiche_pointage);
      
      // Pré-remplir le formulaire
      form.setFieldsValue({
        compteur_debut: response.data.compteur_debut,
        compteur_fin: response.data.compteur_fin,
        heures_travail: response.data.heures_travail,
        heures_panne: response.data.heures_panne,
        heures_arret: response.data.heures_arret,
        consommation_carburant: response.data.consommation_carburant,
        observations: response.data.observations,
      });
    } catch (error) {
      message.error('Erreur lors du chargement du pointage');
      navigate('/pointages');
    } finally {
      setLoading(false);
    }
  };

  const loadFichePointage = async () => {
    try {
      const response = await pointagesAPI.getFiche(ficheId);
      setFichePointage(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement de la fiche');
      navigate('/pointages');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const pointageData = {
        ...values,
        fiche_pointage: ficheId || pointage.fiche_pointage.id,
        date_pointage: datePointage || pointage.date_pointage,
      };

      let response;
      if (isEdit) {
        response = await pointagesAPI.updatePointageJournalier(id, pointageData);
        message.success('Pointage modifié avec succès');
      } else {
        response = await pointagesAPI.createPointageJournalier(pointageData);
        message.success('Pointage créé avec succès');
      }

      // Rediriger vers la fiche de pointage
      const fichePointageId = ficheId || pointage.fiche_pointage.id;
      navigate(`/pointages/fiches/${fichePointageId}`);
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.data) {
        Object.keys(error.response.data).forEach(field => {
          const errors = error.response.data[field];
          if (Array.isArray(errors)) {
            errors.forEach(err => message.error(`${field}: ${err}`));
          } else {
            message.error(`${field}: ${errors}`);
          }
        });
      } else {
        message.error('Erreur lors de la sauvegarde');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateHeures = (_, value) => {
    const heuresTravail = form.getFieldValue('heures_travail') || 0;
    const heuresPanne = form.getFieldValue('heures_panne') || 0;
    const heuresArret = form.getFieldValue('heures_arret') || 0;
    
    const total = parseFloat(heuresTravail) + parseFloat(heuresPanne) + parseFloat(heuresArret);
    
    if (total > 10) {
      return Promise.reject(new Error('Le total des heures ne peut pas dépasser 10h'));
    }
    return Promise.resolve();
  };

  if (!fichePointage) {
    return <Card loading={true} />;
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
                onClick={() => navigate(`/pointages/fiches/${ficheId || pointage?.fiche_pointage?.id}`)}
              >
                Retour à la fiche
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  {isEdit ? 'Modifier le pointage' : 'Nouveau pointage'}
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Fiche {fichePointage.numero_fiche} - {formatDate(datePointage || pointage?.date_pointage)}
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Formulaire principal */}
          <Card title="Informations du pointage">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
            >
              {/* Compteurs */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="compteur_debut"
                    label="Compteur début"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Ex: 12345"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="compteur_fin"
                    label="Compteur fin"
                    rules={[
                      {
                        validator: (_, value) => {
                          const debut = form.getFieldValue('compteur_debut');
                          if (debut && value && value < debut) {
                            return Promise.reject(new Error('Le compteur fin doit être supérieur au compteur début'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Ex: 12400"
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Répartition des heures */}
              <Card 
                size="small" 
                title="Répartition des heures (max 10h/jour)" 
                style={{ marginBottom: 24 }}
                extra={
                  <Tag color={totalHeures > 10 ? 'red' : totalHeures > 8 ? 'orange' : 'green'}>
                    Total: {totalHeures.toFixed(1)}h
                  </Tag>
                }
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="heures_travail"
                      label="Heures de travail"
                      rules={[
                        { validator: validateHeures }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={10}
                        step={0.5}
                        style={{ width: '100%' }}
                        addonAfter="h"
                        onChange={() => {
                          // Trigger re-validation of other fields
                          setTimeout(() => {
                            form.validateFields(['heures_panne', 'heures_arret']);
                          }, 100);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="heures_panne"
                      label="Heures de panne"
                      rules={[
                        { validator: validateHeures }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={10}
                        step={0.5}
                        style={{ width: '100%' }}
                        addonAfter="h"
                        onChange={() => {
                          setTimeout(() => {
                            form.validateFields(['heures_travail', 'heures_arret']);
                          }, 100);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="heures_arret"
                      label="Heures d'arrêt"
                      rules={[
                        { validator: validateHeures }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={10}
                        step={0.5}
                        style={{ width: '100%' }}
                        addonAfter="h"
                        onChange={() => {
                          setTimeout(() => {
                            form.validateFields(['heures_travail', 'heures_panne']);
                          }, 100);
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Barre de progression */}
                <Progress 
                  percent={(totalHeures / 10) * 100} 
                  status={totalHeures > 10 ? 'exception' : 'active'}
                  format={() => `${totalHeures.toFixed(1)}h / 10h`}
                />
              </Card>

              {/* Consommation carburant */}
              <Form.Item
                name="consommation_carburant"
                label="Consommation carburant (Litres)"
              >
                <InputNumber
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                  addonAfter="L"
                  placeholder="0.0"
                />
              </Form.Item>

              {/* Observations */}
              <Form.Item
                name="observations"
                label="Observations"
              >
                <TextArea
                  rows={4}
                  placeholder="Remarques, incidents, conditions particulières, état du matériel..."
                />
              </Form.Item>

              {/* Alertes de validation */}
              {totalHeures > 10 && (
                <Alert
                  message="Attention"
                  description="Le total des heures dépasse 10h. Veuillez ajuster la répartition."
                  type="error"
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              {totalHeures > 0 && totalHeures <= 10 && (
                <Alert
                  message="Répartition valide"
                  description={`Total: ${totalHeures.toFixed(1)}h - Montant estimé: ${formatCurrency(montantEstime)} MRU`}
                  type="success"
                  icon={<CheckCircleOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Boutons d'action */}
              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={loading}
                    disabled={totalHeures > 10}
                  >
                    {isEdit ? 'Modifier' : 'Créer'} le pointage
                  </Button>
                  <Button 
                    onClick={() => navigate(`/pointages/fiches/${ficheId || pointage?.fiche_pointage?.id}`)}
                  >
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations contextuelles */}
          <Card title="Informations de la fiche" style={{ marginBottom: 24 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Numéro fiche">
                {fichePointage.numero_fiche}
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                {fichePointage.engagement_numero}
              </Descriptions.Item>
              <Descriptions.Item label="Matériel">
                {fichePointage.materiel_type}
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                {formatCurrency(fichePointage.prix_unitaire)} MRU
              </Descriptions.Item>
              <Descriptions.Item label="Type facturation">
                <Tag color="blue">
                  {fichePointage.materiel?.materiel?.type_facturation}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Calcul du montant */}
          <Card title="Calcul du montant">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {formatCurrency(montantEstime)} MRU
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                {(() => {
                  const facturation = fichePointage.materiel?.materiel?.type_facturation;
                  const heuresTravail = form.getFieldValue('heures_travail') || 0;
                  const prix = fichePointage.prix_unitaire || 0;
                  
                  if (facturation === 'PAR_JOUR') {
                    return heuresTravail > 0 ? `${formatCurrency(prix)} MRU (prix par jour)` : 'Aucune heure de travail';
                  } else if (facturation === 'PAR_HEURE') {
                    return `${formatCurrency(prix)} MRU × ${heuresTravail}h`;
                  } else {
                    return `${formatCurrency(prix)} MRU (forfaitaire)`;
                  }
                })()}
              </div>
            </div>

            {/* Détail du calcul */}
            <div style={{ marginTop: 16, fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Prix unitaire:</span>
                <span>{formatCurrency(fichePointage.prix_unitaire)} MRU</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Heures travail:</span>
                <span>{form.getFieldValue('heures_travail') || 0}h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Type facturation:</span>
                <span>{fichePointage.materiel?.materiel?.type_facturation}</span>
              </div>
            </div>
          </Card>

          {/* Aide */}
          <Card title="Aide" size="small">
            <div style={{ fontSize: '12px' }}>
              <p><strong>Heures de travail :</strong> Temps effectif de fonctionnement productif</p>
              <p><strong>Heures de panne :</strong> Temps d'arrêt dû à une défaillance technique</p>
              <p><strong>Heures d'arrêt :</strong> Temps d'arrêt programmé (pause, attente, etc.)</p>
              <p><strong>Total maximum :</strong> 10 heures par jour</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PointageJournalierForm;
