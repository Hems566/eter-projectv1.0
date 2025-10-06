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
  Descriptions,
  Checkbox
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { useMisesADispositionStore } from '../../store/misesADispositionStore';
import { demandesAPI } from '../../services/demandes';
import { fournisseursAPI } from '../../services/fournisseurs';
import { formatCurrency } from '../../utils/formatters';
import { useFournisseursStore } from '../../store/fournisseursStore';

const { Step } = Steps;
const { Option } = Select;

const MiseADispositionCreate = () => {
  const navigate = useNavigate();
  const { createMiseADisposition, loading } = useMisesADispositionStore();
  const { searchFournisseursActifs } = useFournisseursStore();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  
  // États pour les données
  const [demandesValidees, setDemandesValidees] = useState([]);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [fournisseurOptions, setFournisseurOptions] = useState([]);
  const [fournisseurLoading, setFournisseurLoading] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  
  // États de chargement
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(false);

  const steps = [
    {
      title: 'Demande',
      description: 'Sélectionner la demande validée'
    },
    {
      title: 'Fournisseur',
      description: 'Choisir le fournisseur'
    },
    {
      title: 'Détails',
      description: 'Informations de la MAD'
    },
    {
      title: 'Validation',
      description: 'Créer la mise à disposition'
    }
  ];

  useEffect(() => {
    loadDemandesValidees();
  }, []);

  // ✅ Charger les demandes avec statut VALIDEE
  const loadDemandesValidees = async () => {
    try {
      setLoadingDemandes(true);
      console.log('🔍 Chargement des demandes validées...');
      
      const response = await demandesAPI.list({
        statut: 'VALIDEE',
        page_size: 100 // Récupérer toutes les demandes validées
      });
      
      console.log('📡 Réponse API demandes:', response);
      
      const demandesData = response.data?.results || response.data || [];
      
      // ✅ Filtrer les demandes qui n'ont pas encore de mise à disposition
      const demandesSansMad = demandesData.filter(demande => !demande.mise_a_disposition);
      
      console.log('📊 Demandes validées sans MAD:', demandesSansMad);
      
      setDemandesValidees(demandesSansMad);
      
      if (demandesSansMad.length === 0) {
        message.info('Aucune demande validée disponible pour mise à disposition');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement demandes:', error);
      setDemandesValidees([]);
      message.error('Erreur lors du chargement des demandes validées');
    } finally {
      setLoadingDemandes(false);
    }
  };

  // Recherche dynamique des fournisseurs
  const handleFournisseurSearch = async (searchValue) => {
  if (!searchValue.trim()) {
  setFournisseurOptions([]);
  return;
  }

  setFournisseurLoading(true);
  const result = await searchFournisseursActifs(searchValue.trim());
  setFournisseurLoading(false);

  if (result.success) {
  const data = result.data.results || result.data || [];
  const options = data.map(f => ({
  label: `${f.raison_sociale} (NIF: ${f.nif || 'N/A'})`,
  value: f.id,
  nif: f.nif,
  telephone: f.telephone,
  raison_sociale: f.raison_sociale
  }));
  setFournisseurOptions(options);
  } else {
  setFournisseurOptions([]);
  message.warning('Aucun fournisseur trouvé');
  }
  };

  const handleFournisseurChange = (value, option) => {
  if (option && typeof option === 'object') {
  setSelectedFournisseur({
  id: value,
  raison_sociale: option.raison_sociale,
  nif: option.nif,
  telephone: option.telephone
  });
  } else {
  setSelectedFournisseur(null);
  }
  };

  const handleDemandeChange = (demandeId) => {
    const demande = demandesValidees.find(d => d.id === demandeId);
    console.log('📋 Demande sélectionnée:', demande);
    setSelectedDemande(demande);
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['demande_location_id']);
      } else if (currentStep === 1) {
        await form.validateFields(['fournisseur_id']);
      } else if (currentStep === 2) {
        await form.validateFields(['date_mise_disposition', 'immatriculation']);
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
      // const values = await form.validateFields();
      const values = await form.getFieldValue();
      console.log(values);
      if (!values.date_mise_disposition) {
        message.error('La date de mise à disposition est obligatoire');
        return;
      }

      const madData = {
        demande_location_id: values.demande_location_id,
        fournisseur_id: values.fournisseur_id,
        date_mise_disposition: values.date_mise_disposition.format('YYYY-MM-DD'),
        immatriculation: values.immatriculation.trim(),
        conforme: values.conforme !== false,
        observations: values.observations?.trim() || ''
      };

      console.log('📤 Données MAD à envoyer:', madData);

      const result = await createMiseADisposition(madData);
      
      if (result.success) {
        message.success('Mise à disposition créée avec succès');
        navigate(`/mises-a-disposition/${result.data.id}`);
      } else {
        console.error('❌ Erreur création:', result.error);
        message.error(
          result.error?.message || 
          'Erreur lors de la création de la mise à disposition'
        );
      }
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      message.error('Erreur lors de la création');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="Sélection de la demande de location">
            <Form.Item
              name="demande_location_id"
              label="Demande de location validée"
              rules={[{ required: true, message: 'Veuillez sélectionner une demande' }]}
            >
              <Select
                placeholder="Choisir une demande validée"
                size="large"
                loading={loadingDemandes}
                showSearch
                optionFilterProp="children"
                onChange={handleDemandeChange}
                filterOption={(input, option) => {
                  const text = option.children?.toString() || '';
                  return text.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                }}
                notFoundContent={loadingDemandes ? "Chargement..." : "Aucune demande validée trouvée"}
              >
                {demandesValidees.map(demande => (
                  <Option key={demande.id} value={demande.id}>
                    <div>
                      <strong>DL {demande.numero}</strong> - {demande.chantier}
                      <br />
                      <small>
                        {demande.demandeur?.first_name} {demande.demandeur?.last_name} | 
                        {demande.departement} | 
                        {formatCurrency(demande.budget_previsionnel_mru)} MRU
                      </small>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* ✅ Message si aucune demande */}
            {!loadingDemandes && demandesValidees.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                <p>Aucune demande validée disponible</p>
                <p>
                  <small>
                    Seules les demandes validées sans mise à disposition peuvent être utilisées.
                  </small>
                </p>
                <Button 
                  type="primary" 
                  onClick={() => navigate('/demandes?statut=VALIDEE')}
                >
                  Voir les demandes validées
                </Button>
              </div>
            )}

            {selectedDemande && (
              <Card size="small" style={{ marginTop: 16, background: '#f9f9f9' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Numéro">{selectedDemande.numero}</Descriptions.Item>
                  <Descriptions.Item label="Chantier">{selectedDemande.chantier}</Descriptions.Item>
                  <Descriptions.Item label="Demandeur">
                    {selectedDemande.demandeur?.first_name} {selectedDemande.demandeur?.last_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Département">{selectedDemande.departement}</Descriptions.Item>
                  <Descriptions.Item label="Durée">{selectedDemande.duree_mois} mois</Descriptions.Item>
                  <Descriptions.Item label="Budget">
                    {formatCurrency(selectedDemande.budget_previsionnel_mru)} MRU
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Card>
        );

      case 1:
        return (
        <Card title="Sélection du fournisseur">
        <Form.Item
        name="fournisseur_id"
        label="Fournisseur"
        rules={[{ required: true, message: 'Le fournisseur est obligatoire' }]}
        >
        <Select
        placeholder="Tapez pour rechercher un fournisseur (nom ou NIF)"
        size="large"
        showSearch
        filterOption={false} // 🔥 Pas de filtrage côté client
        onSearch={handleFournisseurSearch}
        onChange={handleFournisseurChange}
        loading={fournisseurLoading}
        options={fournisseurOptions}
        notFoundContent={fournisseurLoading ? "Recherche..." : "Aucun résultat"}
        />
        </Form.Item>
        </Card>
      );

      case 2:
        return (
          <Card title="Détails de la mise à disposition">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date_mise_disposition"
                  label="Date de mise à disposition"
                  rules={[{ required: true, message: 'La date est obligatoire' }]}
                  initialValue={moment()}
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
                <Form.Item
                  name="immatriculation"
                  label="Immatriculation/Référence"
                  rules={[
                    { required: true, message: 'L\'immatriculation est obligatoire' },
                    { min: 3, message: 'L\'immatriculation doit faire au moins 3 caractères' }
                  ]}
                >
                  <Input 
                    size="large"
                    placeholder="Ex: 1234 NKT 18 ou REF-MAT-001"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="conforme"
              valuePropName="checked"
              initialValue={true}
            >
              <Checkbox>
                Le matériel est conforme aux spécifications de la demande
              </Checkbox>
            </Form.Item>

            <Form.Item
              name="observations"
              label="Observations"
            >
              <Input.TextArea
                rows={4}
                placeholder="Remarques sur l'état du matériel, conditions particulières..."
              />
            </Form.Item>
          </Card>
        );

      case 3:
        return (
          <Card title="Récapitulatif de la mise à disposition">
            {selectedDemande && (
              <div>
                <h4>Demande sélectionnée</h4>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Numéro">{selectedDemande.numero}</Descriptions.Item>
                  <Descriptions.Item label="Chantier">{selectedDemande.chantier}</Descriptions.Item>
                  <Descriptions.Item label="Demandeur">
                    {selectedDemande.demandeur?.first_name} {selectedDemande.demandeur?.last_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Département">{selectedDemande.departement}</Descriptions.Item>
                  <Descriptions.Item label="Budget">
                    {formatCurrency(selectedDemande.budget_previsionnel_mru)} MRU
                  </Descriptions.Item>
                  <Descriptions.Item label="Durée">{selectedDemande.duree_mois} mois</Descriptions.Item>
                </Descriptions>

                <h4>Fournisseur et détails</h4>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                  <Descriptions.Item label="Fournisseur">
                    {selectedFournisseur?.raison_sociale || 'Non sélectionné'}
                  </Descriptions.Item>
                  <Descriptions.Item label="NIF">
                    {selectedFournisseur?.nif || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Date MAD">
                    {form.getFieldValue('date_mise_disposition')?.format('DD/MM/YYYY') || 'Non définie'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Immatriculation">
                    {form.getFieldValue('immatriculation') || 'Non renseignée'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Conforme">
                    {form.getFieldValue('conforme') ? '✅ Oui' : '❌ Non'}
                  </Descriptions.Item>
                </Descriptions>

                {form.getFieldValue('observations') && (
                  <div>
                    <h4>Observations</h4>
                    <div style={{ 
                      padding: '12px', 
                      background: '#f9f9f9', 
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {form.getFieldValue('observations')}
                    </div>
                  </div>
                )}

                {/* Matériels de la demande */}
                <h4>Matériels concernés ({selectedDemande.materiels_demandes?.length || 0})</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedDemande.materiels_demandes?.map((mat, index) => (
                    <Card 
                      key={index} 
                      size="small" 
                      style={{ marginBottom: 8 }}
                      bodyStyle={{ padding: '8px' }}
                    >
                      <div style={{ fontSize: '12px' }}>
                        <strong>{mat.materiel?.type_materiel}</strong> (Qté: {mat.quantite})
                        <br />
                        Prix: {formatCurrency(mat.materiel?.prix_unitaire_mru)} MRU
                      </div>
                    </Card>
                  ))}
                </div>
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
                onClick={() => navigate('/mises-a-disposition')}
              >
                Retour
              </Button>
              <h2 style={{ margin: 0 }}>Nouvelle mise à disposition</h2>
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
                  Créer la mise à disposition
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleNext}
                  disabled={
                    (currentStep === 0 && demandesValidees.length === 0)
                  }
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

export default MiseADispositionCreate;
