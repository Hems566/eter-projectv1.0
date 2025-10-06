// pages/pointages/PointageJournalierCreate.jsx - Version améliorée
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
  Alert
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import moment from 'moment';
import { usePointagesStore } from '../../store/pointagesStore';
import { pointagesAPI } from '../../services/pointages';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ChantierInput from '../../components/common/ChantierInput';

const { TextArea } = Input;

const PointageJournalierCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createPointageJournalier, loading } = usePointagesStore();
  const [form] = Form.useForm();
  const [fichePointage, setFichePointage] = useState(null);
  const [loadingFiche, setLoadingFiche] = useState(false);
  const [chantierPointage, setChantierPointage] = useState('');
  const [showChantierAlert, setShowChantierAlert] = useState(false);

  const ficheId = searchParams.get('fiche_id');

  useEffect(() => {
    if (ficheId) {
      loadFichePointage();
    } else {
      message.error('ID de fiche de pointage manquant');
      navigate('/pointages/fiches');
    }
  }, [ficheId]);

  const loadFichePointage = async () => {
    try {
      setLoadingFiche(true);
      const response = await pointagesAPI.getFiche(ficheId);
      setFichePointage(response.data);
      
      // Pré-remplir la date avec aujourd'hui si elle est dans la période
      const today = moment();
      const debut = moment(response.data.periode_debut);
      const fin = moment(response.data.periode_fin);
      
      if (today.isBetween(debut, fin, 'day', '[]')) {
        form.setFieldsValue({
          date_pointage: today
        });
      }
    } catch (error) {
      console.error('Erreur chargement fiche:', error);
      message.error('Erreur lors du chargement de la fiche de pointage');
      navigate('/pointages/fiches');
    } finally {
      setLoadingFiche(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (!ficheId) {
        message.error('ID de fiche manquant');
        return;
      }

      const pointageData = {
        fiche_pointage: parseInt(ficheId),
        date_pointage: values.date_pointage.format('YYYY-MM-DD'),
        compteur_debut: values.compteur_debut ? parseInt(values.compteur_debut) : null,
        compteur_fin: values.compteur_fin ? parseInt(values.compteur_fin) : null,
        heures_travail: values.heures_travail ? parseFloat(values.heures_travail).toFixed(2) : "0.00",
        heures_panne: values.heures_panne ? parseFloat(values.heures_panne).toFixed(2) : "0.00",
        heures_arret: values.heures_arret ? parseFloat(values.heures_arret).toFixed(2) : "0.00",
        consommation_carburant: values.consommation_carburant ? parseFloat(values.consommation_carburant).toFixed(2) : "0.00",
        observations: values.observations?.trim() || '',
        // 🔥 NOUVEAU: Ajouter le chantier pointage
        chantier_pointage: chantierPointage?.trim() || ''
      };

      console.log('📤 Données finales envoyées:', pointageData);

      const result = await createPointageJournalier(pointageData);
      
      if (result.success) {
        message.success('Pointage journalier créé avec succès');
        navigate(`/pointages/fiches/${ficheId}`);
      } else {
        console.error('❌ Erreur création:', result.error);
        if (result.error && typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
            message.error(`${field}: ${errorMsg}`);
          });
        } else {
          message.error(result.error?.message || 'Erreur lors de la création du pointage');
        }
      }
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      if (error.response?.data) {
        console.error('❌ Réponse serveur:', error.response.data);
        if (typeof error.response.data === 'object') {
          Object.entries(error.response.data).forEach(([field, errors]) => {
            const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
            message.error(`${field}: ${errorMsg}`);
          });
        }
      }
      message.error('Erreur lors de la création');
    }
  };

  const handleValuesChange = (changedValues, allValues) => {
    if (['heures_travail', 'heures_panne', 'heures_arret'].some(field => field in changedValues)) {
      const heuresTravail = allValues.heures_travail || 0;
      const heuresPanne = allValues.heures_panne || 0;
      const heuresArret = allValues.heures_arret || 0;
      
      if (fichePointage?.materiel?.materiel?.prix_unitaire_mru) {
        const prixUnitaire = fichePointage.materiel.materiel.prix_unitaire_mru;
        const montantEstime = (heuresTravail * prixUnitaire) + 
                             (heuresPanne * prixUnitaire * 0.5) + 
                             (heuresArret * prixUnitaire * 0.3);
        
        form.setFieldsValue({
          montant_estime: montantEstime.toFixed(3)
        });
      }
    }
  };

  const handleChantierChange = (value) => {
    setChantierPointage(value);
    
    // Vérifier si c'est un changement de chantier
    if (value && fichePointage) {
      const chantierPrincipal = fichePointage.engagement?.mise_a_disposition?.demande_location?.chantier;
      const isDifferent = value.trim().toLowerCase() !== chantierPrincipal?.toLowerCase();
      setShowChantierAlert(isDifferent);
    } else {
      setShowChantierAlert(false);
    }
  };

  const disabledDate = (current) => {
    if (!fichePointage || !current) return true;
    
    try {
      const currentDate = moment(current);
      const debut = moment(fichePointage.periode_debut);
      const fin = moment(fichePointage.periode_fin);
      
      if (!debut.isValid() || !fin.isValid() || !currentDate.isValid()) {
        return true;
      }
      
      return !currentDate.isBetween(debut, fin, 'day', '[]');
    } catch (error) {
      console.error('Erreur dans disabledDate:', error);
      return true;
    }
  };

  if (loadingFiche || !fichePointage) {
    return (
      <Card loading={true} style={{ margin: '24px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Chargement de la fiche de pointage...
        </div>
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
                onClick={() => navigate(`/pointages/fiches/${ficheId}`)}
              >
                Retour à la fiche
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>Nouveau pointage journalier</h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Fiche: {fichePointage.numero_fiche}
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Formulaire */}
          <Card title="Informations du pointage">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={handleValuesChange}
              size="large"
            >
              <Row gutter={16}>
                <Col span={12}>
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
                      prefix={<CalendarOutlined />}
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  {/* 🔥 NOUVEAU: Champ chantier avec autocomplétion */}
                  <Form.Item
                    label="Chantier (optionnel)"
                    help="Laisser vide pour utiliser le chantier principal de l'engagement"
                  >
                    <ChantierInput
                      value={chantierPointage}
                      onChange={handleChantierChange}
                      ficheId={ficheId}
                      chantierPrincipal={fichePointage.engagement?.mise_a_disposition?.demande_location?.chantier}
                      placeholder="Saisir un autre chantier si nécessaire"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 🔥 Alerte changement de chantier */}
              {showChantierAlert && (
                <Alert
                  message="Changement de chantier détecté"
                  description={`Le matériel sera pointé sur "${chantierPointage}" au lieu du chantier principal "${fichePointage.engagement?.mise_a_disposition?.demande_location?.chantier}"`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

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
                    Créer le pointage
                  </Button>
                  <Button 
                    onClick={() => navigate(`/pointages/fiches/${ficheId}`)}
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
                {fichePointage.numero_fiche}
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                <Button 
                  type="link" 
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/engagements/${fichePointage.engagement?.id}`)}
                >
                  {fichePointage.engagement?.numero}
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="Chantier principal">
                {fichePointage.engagement?.mise_a_disposition?.demande_location?.chantier}
              </Descriptions.Item>
              <Descriptions.Item label="Matériel">
                {fichePointage.materiel?.materiel?.type_materiel}
              </Descriptions.Item>
              <Descriptions.Item label="Immatriculation">
                {fichePointage.immatriculation || 'Non renseignée'}
              </Descriptions.Item>
              <Descriptions.Item label="Période">
                {formatDate(fichePointage.periode_debut)} - {formatDate(fichePointage.periode_fin)}
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                {formatCurrency(fichePointage.materiel?.materiel?.prix_unitaire_mru)} MRU/h
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Aide au calcul */}
          <Card title="Aide au calcul" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>Calcul du montant :</strong></p>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>Heures travail : 100% du prix unitaire</li>
                <li>Heures panne : 50% du prix unitaire</li>
                <li>Heures arrêt : 30% du prix unitaire</li>
              </ul>
              <p style={{ marginTop: '12px' }}>
                <strong>Période autorisée :</strong><br />
                Du {formatDate(fichePointage.periode_debut)} au {formatDate(fichePointage.periode_fin)}
              </p>
            </div>
          </Card>

          {/* Pointages existants */}
          {fichePointage.pointages_count > 0 && (
            <Card title="Pointages existants" size="small">
              <div style={{ fontSize: '12px' }}>
                <p>
                  <strong>{fichePointage.pointages_count}</strong> pointage(s) déjà créé(s)
                </p>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => navigate(`/pointages/fiches/${ficheId}`)}
                >
                  Voir tous les pointages
                </Button>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default PointageJournalierCreate;
