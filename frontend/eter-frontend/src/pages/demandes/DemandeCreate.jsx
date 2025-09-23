import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  Card, 
  Steps, 
  Space,
  message,
  Row,
  Col,
  Divider
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDemandesStore } from '../../store/demandesStore';
import { useAuthStore } from '../../store/authStore';
import MaterielSelector from '../../components/forms/MaterielSelector';
import { demandesAPI } from '../../services/demandes';

const { Step } = Steps;
const { TextArea } = Input;

const DemandeCreate = () => {
  const navigate = useNavigate();
  const { createDemande, loading } = useDemandesStore();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMateriels, setSelectedMateriels] = useState([]);

  // ✅ Debug - Vérifier les infos utilisateur au chargement
  useEffect(() => {
    console.log('👤 Utilisateur connecté:', user);
    console.log('🏢 Département utilisateur:', user?.departement);
  }, [user]);
  const steps = [
    {
      title: 'Informations générales',
      description: 'Chantier et durée'
    },
    {
      title: 'Sélection matériels',
      description: 'Choisir les matériels'
    },
    {
      title: 'Validation',
      description: 'Vérifier et soumettre'
    }
  ];

  const handleNext = async () => {
    try {
      // Valider les champs du step actuel
      if (currentStep === 0) {
        await form.validateFields(['chantier', 'duree_mois']);
      } else if (currentStep === 1) {
        if (selectedMateriels.length === 0) {
          message.error('Veuillez sélectionner au moins un matériel');
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation échouée:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };
 const handleSubmit = async (isDraft = false, shouldSubmit = false) => {
  try {
    console.log('🔍 Début de la soumission...');
    
    // Récupérer toutes les valeurs du formulaire
    const chantier = form.getFieldValue('chantier');
    const dureeMois = form.getFieldValue('duree_mois');
    const observations = form.getFieldValue('observations');
    
    // Validations
    if (!chantier || !dureeMois) {
      message.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (selectedMateriels.length === 0) {
      message.error('Veuillez sélectionner au moins un matériel');
      return;
    }
    
    const demandeData = {
      chantier: chantier,
      duree_mois: dureeMois,
      observations: observations || '',
      departement: user?.departement,
      materiels_demandes: selectedMateriels.map(mat => ({
        materiel: mat.id,
        quantite: mat.quantite,
        observations: mat.observations || ''
      }))
    };
    
    console.log('📤 Données envoyées:', demandeData);
    
    const result = await createDemande(demandeData);
    
    if (result.success) {
      const demandeId = result.data.id;
      
      // ✅ Si shouldSubmit est true, soumettre automatiquement après création
      if (shouldSubmit && !isDraft) {
        try {
          await demandesAPI.soumettre(demandeId);
          message.success('Demande créée et soumise avec succès');
        } catch (submitError) {
          console.error('Erreur soumission:', submitError);
          message.warning('Demande créée mais erreur lors de la soumission. Vous pouvez la soumettre depuis la page de détail.');
        }
      } else {
        message.success(
          isDraft 
            ? 'Demande sauvegardée en brouillon' 
            : 'Demande créée avec succès'
        );
      }
      
      navigate('/demandes');
    } else {
      console.error('Erreur création:', result.error);
      message.error('Erreur lors de la création de la demande');
    }
  } catch (error) {
    console.error('❌ Erreur complète:', error);
    message.error('Erreur lors de la création de la demande');
  }
};

  // Calcul du budget prévisionnel
  const calculateBudget = () => {
    const duree = form.getFieldValue('duree_mois') || 1;
    return selectedMateriels.reduce((total, mat) => {
      const jours = duree * 30;
      return total + (mat.prix_unitaire_mru * mat.quantite * jours);
    }, 0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="Informations de la demande">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="chantier"
                  label="Chantier/Projet"
                  rules={[
                    { required: true, message: 'Le chantier est obligatoire' },
                    { min: 3, message: 'Le nom du chantier doit faire au moins 3 caractères' }
                  ]}
                >
                  <Input 
                    placeholder="Ex: Construction Route Nouakchott-Rosso"
                    size="large"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="duree_mois"
                  label="Durée (mois)"
                  rules={[{ required: true, message: 'La durée est obligatoire' }]}
                  initialValue={1}
                >
                  <InputNumber
                    min={1}
                    max={6}
                    size="large"
                    style={{ width: '100%' }}
                    addonAfter="mois"
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
                placeholder="Informations complémentaires, spécifications particulières..."
              />
            </Form.Item>
          </Card>
        );

      case 1:
        return (
          <Card title="Sélection des matériels">
            <MaterielSelector
              selectedMateriels={selectedMateriels}
              onMaterielsChange={setSelectedMateriels}
              duree={form.getFieldValue('duree_mois') || 1}
            />
          </Card>
        );

      case 2:
        return (
          <Card title="Récapitulatif de la demande">
            <Row gutter={24}>
              <Col span={12}>
                <h4>Informations générales</h4>
                <p><strong>Chantier :</strong> {form.getFieldValue('chantier')}</p>
                <p><strong>Durée :</strong> {form.getFieldValue('duree_mois')} mois</p>
                {form.getFieldValue('observations') && (
                  <p><strong>Observations :</strong> {form.getFieldValue('observations')}</p>
                )}
              </Col>
              
              <Col span={12}>
                <h4>Budget prévisionnel</h4>
                <p style={{ fontSize: '24px', color: '#1890ff', fontWeight: 'bold' }}>
                  {calculateBudget().toLocaleString('fr-FR', { 
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                  })} MRU
                </p>
              </Col>
            </Row>

            <Divider />

            <h4>Matériels sélectionnés ({selectedMateriels.length})</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {selectedMateriels.map((mat, index) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ marginBottom: 8 }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Row align="middle">
                    <Col span={8}>
                      <strong>{mat.type_materiel}</strong>
                    </Col>
                    <Col span={4}>
                      Qté: {mat.quantite}
                    </Col>
                    <Col span={6}>
                      {mat.prix_unitaire_mru} MRU/jour
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                      <strong>
                        {(mat.prix_unitaire_mru * mat.quantite * (form.getFieldValue('duree_mois')) * 30)
                          .toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MRU
                      </strong>
                    </Col>
                  </Row>
                  {mat.observations && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                      {mat.observations}
                    </div>
                  )}
                </Card>
              ))}
            </div>
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
                onClick={() => navigate('/demandes')}
              >
                Retour
              </Button>
              <h2 style={{ margin: 0 }}>Nouvelle demande de location</h2>
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
                <>
                  <Button 
                    icon={<SaveOutlined />}
                    onClick={() => handleSubmit(true)}
                    loading={loading}
                  >
                    Sauvegarder brouillon
                  </Button>
                  <Button 
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleSubmit(false, false)}
                    loading={loading}
                  >
                    Créer la demande
                  </Button>
                  <Button 
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleSubmit(false, true)} // Créer et soumettre
                    loading={loading}
                  >
                    Créer et soumettre
                  </Button>
                </>
              ) : (
                <Button type="primary" onClick={handleNext}>
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

export default DemandeCreate;
