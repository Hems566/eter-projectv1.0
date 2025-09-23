import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  DatePicker, 
  Button, 
  Card, 
  Steps, 
  Space,
  message,
  Row,
  Col,
  Select,
  Descriptions
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePointagesStore } from '../../store/pointagesStore';
import { pointagesAPI } from '../../services/pointages';
import { engagementsAPI } from '../../services/engagements';

const { Step } = Steps;
const { RangePicker } = DatePicker;
const { Option } = Select;

const FichePointageCreate = () => {
  const navigate = useNavigate();
  const { createFiche, loading } = usePointagesStore();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [engagements, setEngagements] = useState([]);
  const [materielsDisponibles, setMaterielsDisponibles] = useState([]);
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [selectedMateriel, setSelectedMateriel] = useState(null);

  const steps = [
    {
      title: 'Engagement',
      description: 'Sélectionner l\'engagement'
    },
    {
      title: 'Matériel',
      description: 'Choisir le matériel'
    },
    {
      title: 'Fiche',
      description: 'Détails de la fiche'
    },
    {
      title: 'Validation',
      description: 'Créer la fiche'
    }
  ];

  useEffect(() => {
    loadEngagements();
  }, []);

  const loadEngagements = async () => {
    try {
      const response = await engagementsAPI.actifs();
      setEngagements(response.data.results || []);
    } catch (error) {
      
      message.error('Erreur lors du chargement des engagements');
    }
  };

  const loadMaterielsDisponibles = async (engagementId) => {
    try {
      const response = await pointagesAPI.materielsDisponibles(engagementId);
      console.log(response);
      setMaterielsDisponibles(response.data.materiels || []);
    } catch (error) {
      message.error('Erreur lors du chargement des matériels');
    }
  };

  const handleEngagementChange = async (engagementId) => {
    const engagement = engagements.find(e => e.id === engagementId);
    console.log(engagement);
    setSelectedEngagement(engagement);
    setMaterielsDisponibles([]);
    setSelectedMateriel(null);
    
    if (engagementId) {
      await loadMaterielsDisponibles(engagementId);
    }
  };

  const handleMaterielChange = (materielId) => {
    const materiel = materielsDisponibles.find(m => m.id === materielId);
    console.log(materiel);
    setSelectedMateriel(materiel);
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['engagement']);
      } else if (currentStep === 1) {
        await form.validateFields(['materiel']);
      } else if (currentStep === 2) {
        await form.validateFields(['numero_fiche', 'periode', 'immatriculation']);
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation échouée:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log(form.getFieldValue('materiel'));
      const ficheData = {
        engagement: form.getFieldValue('engagement'),
        materiel: form.getFieldValue('materiel'),
        numero_fiche: form.getFieldValue('numero_fiche'),
        periode_debut: form.getFieldValue('periode')[0].format('YYYY-MM-DD'),
        periode_fin: form.getFieldValue('periode')[1].format('YYYY-MM-DD'),
        // periode_debut: form.getFieldValue("periode[0].format('YYYY-MM-DD')"),
        // periode_fin: form.getFieldValue("periode[1].format('YYYY-MM-DD')"),
        immatriculation: form.getFieldValue('immatriculation'),
      };

      console.log('Données fiche:', ficheData);

      const result = await createFiche(ficheData);
      
      if (result.success) {
        message.success('Fiche de pointage créée avec succès');
        navigate(`/pointages/fiches/${result.data.id}`);
      } else {
        console.error('Erreur création:', result.error);
        message.error('Erreur lors de la création de la fiche');
      }
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Veuillez vérifier tous les champs');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="Sélection de l'engagement">
            <Form.Item
              name="engagement"
              label="Engagement"
              rules={[{ required: true, message: 'Veuillez sélectionner un engagement' }]}
            >
              <Select
                placeholder="Choisir un engagement actif"
                size="large"
                showSearch
                optionFilterProp="children"
                onChange={handleEngagementChange}
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {engagements.map(eng => (
                  <Option key={eng.id} value={eng.id}>
                    <div>
                      <strong>{eng.numero}</strong> - {eng.chantier}
                      <br />
                      <small>
                        {eng.fournisseur_nom} | 
                        {eng.jours_restants} jours restants
                      </small>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedEngagement && (
              <Card size="small" style={{ marginTop: 16, background: '#f9f9f9' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Engagement">{selectedEngagement.numero}</Descriptions.Item>
                  <Descriptions.Item label="Chantier">{selectedEngagement.chantier}</Descriptions.Item>
                  <Descriptions.Item label="Fournisseur">{selectedEngagement.fournisseur_nom}</Descriptions.Item>
                  <Descriptions.Item label="Période">
                    {selectedEngagement.date_debut} → {selectedEngagement.date_fin}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Card>
        );

      case 1:
        return (
          <Card title="Sélection du matériel">
            <Form.Item
              name="materiel"
              label="Matériel à pointer"
              rules={[{ required: true, message: 'Veuillez sélectionner un matériel' }]}
            >
              <Select
                placeholder="Choisir un matériel"
                size="large"
                onChange={handleMaterielChange}
              >
                {materielsDisponibles.map(mat => (
                  <Option key={mat.id} value={mat.id}>
                    {/* <div>
                      <strong>{mat.materiel_type}</strong> (Qté: {mat.quantite})
                      <br />
                      <small>
                        Prix: {mat.prix_unitaire_mru} MRU/{mat.type_facturation}
                      </small>
                    </div> */}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {materielsDisponibles.length === 0 && selectedEngagement && (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                <p>Aucun matériel disponible pour cet engagement</p>
                <p><small>Tous les matériels ont peut-être déjà une fiche de pointage.</small></p>
              </div>
            )}

            {selectedMateriel && (
              <Card size="small" style={{ marginTop: 16, background: '#f9f9f9' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Type">{selectedMateriel.materiel_type}</Descriptions.Item>
                  <Descriptions.Item label="Quantité">{selectedMateriel.quantite}</Descriptions.Item>
                  <Descriptions.Item label="Prix unitaire">
                    {selectedMateriel.prix_unitaire_mru} MRU
                  </Descriptions.Item>
                  <Descriptions.Item label="Facturation">
                    {selectedMateriel.type_facturation}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Card>
        );

      case 2:
        return (
          <Card title="Informations de la fiche">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="numero_fiche"
                  label="Numéro de fiche"
                  rules={[{ required: true, message: 'Le numéro de fiche est obligatoire' }]}
                >
                  <Input 
                    placeholder="Ex: FP-2024-001"
                    size="large"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="immatriculation"
                  label="Immatriculation"
                >
                  <Input 
                    placeholder="Ex: 1234 NKT 18"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="periode"
              label="Période de pointage"
              rules={[{ required: true, message: 'La période est obligatoire' }]}
            >
              <RangePicker
                style={{ width: '100%' }}
                size="large"
                format="DD/MM/YYYY"
                placeholder={['Date début', 'Date fin']}
              />
            </Form.Item>

            {selectedEngagement && (
              <div style={{ 
                padding: '12px', 
                background: '#e6f7ff', 
                borderRadius: '6px',
                marginTop: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  <strong>Note :</strong> La période de pointage doit être comprise entre {selectedEngagement.date_debut} et {selectedEngagement.date_fin}
                </p>
              </div>
            )}
          </Card>
        );

      case 3:
        return (
          <Card title="Récapitulatif">
            {selectedEngagement && selectedMateriel && (
              <div>
                <h4>Engagement sélectionné</h4>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Numéro">{selectedEngagement.numero}</Descriptions.Item>
                  <Descriptions.Item label="Chantier">{selectedEngagement.chantier}</Descriptions.Item>
                  <Descriptions.Item label="Fournisseur">{selectedEngagement.fournisseur_nom}</Descriptions.Item>
                  <Descriptions.Item label="Jours restants">{selectedEngagement.jours_restants} jours</Descriptions.Item>
                </Descriptions>

                <h4>Matériel sélectionné</h4>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Type">{selectedMateriel.materiel_type}</Descriptions.Item>
                  <Descriptions.Item label="Quantité">{selectedMateriel.quantite}</Descriptions.Item>
                  <Descriptions.Item label="Prix unitaire">
                    {selectedMateriel.prix_unitaire_mru} MRU
                  </Descriptions.Item>
                  <Descriptions.Item label="Type facturation">
                    {selectedMateriel.type_facturation}
                  </Descriptions.Item>
                </Descriptions>

                <h4>Fiche de pointage</h4>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Numéro fiche">
                    {form.getFieldValue('numero_fiche')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Immatriculation">
                    {form.getFieldValue('immatriculation') || 'Non renseignée'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Période" span={2}>
                    {form.getFieldValue('periode') ? 
                      `Du ${form.getFieldValue('periode')[0].format('DD/MM/YYYY')} au ${form.getFieldValue('periode')[1].format('DD/MM/YYYY')}` 
                      : 'Non définie'
                    }
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}
          </Card>
        );

      default:
        return null;
    }
  };

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
              <h2 style={{ margin: 0 }}>Nouvelle fiche de pointage</h2>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Steps */}
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep}>
          {steps.map(step => (
            <Step 
              key={step.title}
              title={step.title} 
              description={step.description} 
            />
          ))}
        </Steps>
      </Card>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        size="large"
      >
        {renderStepContent()}
      </Form>

      {/* Actions */}
      <Card style={{ marginTop: 24 }}>
        <Row justify="space-between">
          <Col>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                Précédent
              </Button>
            )}
          </Col>
          
          <Col>
            <Space>
              {currentStep === steps.length - 1 ? (
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                >
                  Créer la fiche
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleNext}
                  disabled={currentStep === 1 && materielsDisponibles.length === 0}
                >
                  Suivant
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FichePointageCreate;
