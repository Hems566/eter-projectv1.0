import React, { useState, useEffect } from 'react';
import { 
  Form, 
  DatePicker, 
  Button, 
  Card, 
  Steps, 
  Space,
  message,
  Row,
  Col,
  Select,
  Input
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEngagementsStore } from '../../store/engagementsStore';
import { engagementsAPI } from '../../services/engagements';

const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

const EngagementCreate = () => {
  const navigate = useNavigate();
  const { createEngagement, loading } = useEngagementsStore();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [misesADisposition, setMisesADisposition] = useState([]);
  const [selectedMAD, setSelectedMAD] = useState(null);

  const steps = [
    {
      title: 'Mise à disposition',
      description: 'Sélectionner la MAD'
    },
    {
      title: 'Conditions',
      description: 'Date et conditions'
    },
    {
      title: 'Validation',
      description: 'Vérifier et créer'
    }
  ];

  useEffect(() => {
    loadMisesADisposition();
  }, []);

  const loadMisesADisposition = async () => {
    try {
      const response = await engagementsAPI.misesADispositionDisponibles();
      setMisesADisposition(response.data.results || response.data || []);
    } catch (error) {
      message.error('Erreur lors du chargement des mises à disposition');
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['mise_a_disposition_id']);
        const madId = form.getFieldValue('mise_a_disposition_id');
        const mad = misesADisposition.find(m => m.id === madId);
        setSelectedMAD(mad);
      } else if (currentStep === 1) {
        await form.validateFields(['date_debut']);
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
    console.log('🔍 Validation des champs...');
    console.log('📊 Étape actuelle:', currentStep);
    
    // ✅ Récupérer TOUTES les valeurs du formulaire
    const allValues = form.getFieldsValue();
    console.log('📋 Toutes les valeurs du formulaire:', allValues);
    
    // ✅ Vérifier chaque champ individuellement
    const miseADispositionId = form.getFieldValue('mise_a_disposition_id');
    const dateDebut = form.getFieldValue('date_debut');
    const conditionsParticulieres = form.getFieldValue('conditions_particulieres');
    
    console.log('🏗️ MAD ID:', miseADispositionId);
    console.log('📅 Date de début:', dateDebut);
    console.log('📝 Conditions:', conditionsParticulieres);
    
    // ✅ Validation de la mise à disposition
    if (!miseADispositionId) {
      message.error('Veuillez sélectionner une mise à disposition');
      setCurrentStep(0); // Retourner à l'étape de sélection MAD
      return;
    }
    
    // ✅ Validation de la date
    if (!dateDebut) {
      message.error('La date de début est obligatoire');
      setCurrentStep(1); // Retourner à l'étape de la date
      return;
    }
    
    // ✅ Validation et formatage sécurisé de la date
    let dateDebutFormatted;
    try {
      if (dateDebut && typeof dateDebut.format === 'function') {
        dateDebutFormatted = dateDebut.format('YYYY-MM-DD');
      } else {
        throw new Error('Date de début invalide');
      }
    } catch (dateError) {
      console.error('Erreur de format de date:', dateError);
      message.error('Format de date invalide. Veuillez sélectionner une date valide.');
      setCurrentStep(1);
      return;
    }
    
    const engagementData = {
      mise_a_disposition_id: miseADispositionId,
      date_debut: dateDebutFormatted,
      conditions_particulieres: conditionsParticulieres || ''
    };

    console.log('📤 Données engagement finales:', engagementData);

    const result = await createEngagement(engagementData);
    
    if (result.success) {
      message.success('Engagement créé avec succès');
      navigate('/engagements');
    } else {
      console.error('Erreur création:', result.error);
      message.error('Erreur lors de la création de l\'engagement');
    }
  } catch (error) {
    console.error('❌ Erreur complète:', error);
    message.error('Erreur lors de la création de l\'engagement');
  }
};


  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="Sélection de la mise à disposition">
            <Form.Item
              name="mise_a_disposition_id"
              label="Mise à disposition"
              rules={[{ required: true, message: 'Veuillez sélectionner une mise à disposition' }]}
            >
              <Select
                placeholder="Choisir une mise à disposition"
                size="large"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {misesADisposition.map(mad => (
                  <Option key={mad.id} value={mad.id}>
                    <div>
                      <strong>{mad.demande_location_numero}</strong> - {mad.chantier}
                      <br />
                      <small>
                        Fournisseur: {mad.fournisseur_nom} | 
                        Immat: {mad.immatriculation}
                      </small>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {misesADisposition.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                <p>Aucune mise à disposition disponible</p>
                <p>
                  <small>
                    Seules les mises à disposition conformes sans engagement peuvent être utilisées.
                  </small>
                </p>
              </div>
            )}
          </Card>
        );

      case 1:
        return (
          <Card title="Conditions de l'engagement">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="date_debut"
                  label="Date de début"
                  rules={[{ required: true, message: 'La date de début est obligatoire' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    size="large"
                    format="DD/MM/YYYY"
                    placeholder="Sélectionner la date"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <div>
                  <label>Date de fin (calculée automatiquement)</label>
                  <div style={{ 
                    marginTop: 8, 
                    padding: '8px 12px', 
                    background: '#f5f5f5', 
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}>
                    {(() => {
                      const dateDebut = form.getFieldValue('date_debut');
                      if (dateDebut && selectedMAD) {
                        const duree = selectedMAD.duree_mois || 1;
                        const dateFin = dateDebut.clone().add(duree, 'months');
                        return dateFin.format('DD/MM/YYYY');
                      }
                      return 'Sélectionnez d\'abord la date de début';
                    })()}
                  </div>
                </div>
              </Col>
            </Row>

            <Form.Item
              name="conditions_particulieres"
              label="Conditions particulières"
            >
              <TextArea
                rows={4}
                placeholder="Conditions spéciales, clauses particulières, remarques..."
              />
            </Form.Item>
          </Card>
        );

      case 2:
        return (
          <Card title="Récapitulatif de l'engagement">
            {selectedMAD && (
              <div>
                <h4>Mise à disposition sélectionnée</h4>
                <Row gutter={24} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <p><strong>Demande :</strong> {selectedMAD.demande_location_numero}</p>
                    <p><strong>Chantier :</strong> {selectedMAD.chantier}</p>
                    <p><strong>Fournisseur :</strong> {selectedMAD.fournisseur_nom}</p>
                  </Col>
                  <Col span={12}>
                    <p><strong>Immatriculation :</strong> {selectedMAD.immatriculation}</p>
                    <p><strong>Durée :</strong> {selectedMAD.duree_mois} mois</p>
                    <p><strong>Conforme :</strong> {selectedMAD.conforme ? '✅ Oui' : '❌ Non'}</p>
                  </Col>
                </Row>

                <h4>Conditions de l'engagement</h4>
                <Row gutter={24}>
                  <Col span={12}>
                    <p><strong>Date de début :</strong> {form.getFieldValue('date_debut')?.format('DD/MM/YYYY')}</p>
                    <p><strong>Date de fin :</strong> {(() => {
                      const dateDebut = form.getFieldValue('date_debut');
                      if (dateDebut) {
                        const duree = selectedMAD.duree_mois || 1;
                        return dateDebut.clone().add(duree, 'months').format('DD/MM/YYYY');
                      }
                      return 'Non calculée';
                    })()}</p>
                  </Col>
                  <Col span={12}>
                    <p><strong>Budget estimé :</strong> À calculer selon pointages</p>
                  </Col>
                </Row>

                {form.getFieldValue('conditions_particulieres') && (
                  <div>
                    <h4>Conditions particulières</h4>
                    <div style={{ 
                      padding: '12px', 
                      background: '#f9f9f9', 
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {form.getFieldValue('conditions_particulieres')}
                    </div>
                  </div>
                )}
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
                onClick={() => navigate('/engagements')}
              >
                Retour
              </Button>
              <h2 style={{ margin: 0 }}>Nouvel engagement</h2>
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
                  Créer l'engagement
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleNext}
                  disabled={currentStep === 0 && misesADisposition.length === 0}
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

export default EngagementCreate;
