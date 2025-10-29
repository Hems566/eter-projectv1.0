// pages/demandes/DemandeEdit.jsx
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
import { useNavigate, useParams } from 'react-router-dom';
import { useDemandesStore } from '../../store/demandesStore';
import { useAuthStore } from '../../store/authStore';
import { demandesAPI } from '../../services/demandes';
import MaterielSelector from '../../components/forms/MaterielSelector';
import { usePermissions } from '../../hooks/usePermissions';


const { Step } = Steps;
const { TextArea } = Input;

const DemandeEdit = () => {
  const { id } = useParams(); // ✅ Récupérer l'ID depuis l'URL
  const navigate = useNavigate();
  const { updateDemande, loading } = useDemandesStore();
  // const { user } = useAuthStore();
  const { 
      canCreateDL, 
      canValidateDL, 
      canAccessResource,
      user 
    } = usePermissions();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMateriels, setSelectedMateriels] = useState([]);
  const [demande, setDemande] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

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

  // ✅ Charger les données de la demande existante
  useEffect(() => {
    loadDemande();
  }, [id]);

  const loadDemande = async () => {
    try {
      setLoadingData(true);
      const response = await demandesAPI.get(id);
      const demandeData = response.data;
      
      setDemande(demandeData);
      
      // ✅ Pré-remplir le formulaire
      form.setFieldsValue({
        chantier: demandeData.chantier,
        duree_mois: demandeData.duree_mois,
        observations: demandeData.observations
      });
      
      // ✅ Pré-remplir les matériels
      const materiels = demandeData.materiels_demandes?.map(md => ({
        id: md.materiel.id,
        type_materiel: md.materiel.type_materiel,
        prix_unitaire_mru: md.materiel.prix_unitaire_mru,
        type_facturation: md.materiel.type_facturation,
        quantite: md.quantite,
        observations: md.observations
      })) || [];
      
      setSelectedMateriels(materiels);
      
    } catch (error) {
      message.error('Erreur lors du chargement de la demande');
      navigate('/demandes');
    } finally {
      setLoadingData(false);
    }
  };

  // ✅ Vérifier les permissions
  const canEdit = () => {
    return demande && 
           (demande.statut === 'BROUILLON' || demande.statut === 'REJETEE') &&
           (user?.id === demande.demandeur?.id || canValidateDL);
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        const chantier = form.getFieldValue('chantier');
        const dureeMois = form.getFieldValue('duree_mois');
        
        if (!chantier) {
          message.error('Le chantier est obligatoire');
          return;
        }
        if (!dureeMois) {
          message.error('La durée est obligatoire');
          return;
        }
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

  const handleSubmit = async (isDraft = false) => {
    try {
      if (!canEdit()) {
        message.error('Vous n\'avez pas les droits pour modifier cette demande');
        return;
      }

      const chantier = form.getFieldValue('chantier');
      const dureeMois = form.getFieldValue('duree_mois');
      const observations = form.getFieldValue('observations');
      
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
        departement: user?.departement || 'GENERAL',
        materiels_demandes: selectedMateriels.map(mat => ({
          materiel: mat.id,
          quantite: mat.quantite,
          observations: mat.observations || ''
        })),
        statut: isDraft ? 'BROUILLON' : 'SOUMISE' // ✅ Gérer le statut
      };
      
      console.log('📤 Données de mise à jour:', demandeData);
      
      const result = await demandesAPI.update(id, demandeData); // ✅ Utiliser update au lieu de create
      
      if (result.data) {
        message.success(
          isDraft 
            ? 'Demande mise à jour en brouillon' 
            : 'Demande mise à jour avec succès'
        );
        navigate('/demandes');
      } else {
        console.error('Erreur mise à jour:', result.error);
        message.error('Erreur lors de la mise à jour de la demande');
      }
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      message.error('Erreur lors de la mise à jour de la demande');
    }
  };

  // ✅ Calculer le budget (même fonction que dans DemandeCreate)
  const calculateBudget = () => {
    const duree = form.getFieldValue('duree_mois') || demande?.duree_mois || 1;
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
              duree={form.getFieldValue('duree_mois') || demande?.duree_mois || 1}
            />
          </Card>
        );

      case 2:
        return (
          <Card title="Récapitulatif de la demande">
            <Row gutter={24}>
              <Col span={12}>
                <h4>Informations générales</h4>
                <p><strong>Numéro :</strong> {demande?.numero}</p>
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
                        {(mat.prix_unitaire_mru * mat.quantite * (form.getFieldValue('duree_mois') || demande?.duree_mois || 1) * 30)
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

  // ✅ Afficher un loader pendant le chargement
  if (loadingData) {
    return <Card loading={true} style={{ margin: '24px' }} />;
  }

  // ✅ Vérifier les permissions
  if (!canEdit()) {
    return (
      <Card style={{ margin: '24px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h3>Accès refusé</h3>
          <p>Vous n'avez pas les droits pour modifier cette demande.</p>
          <Button onClick={() => navigate('/demandes')}>
            Retour à la liste
          </Button>
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
                onClick={() => navigate(`/demandes/${id}`)}
              >
                Retour
              </Button>
              <h2 style={{ margin: 0 }}>
                Modifier la demande {demande?.numero}
              </h2>
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
                    onClick={() => handleSubmit(false)}
                    loading={loading}
                  >
                    Mettre à jour
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
export default DemandeEdit;

// // pages/demandes/DemandeEdit.jsx
// import React, { useState, useEffect } from 'react';
// import {
//   Form,
//   Input,
//   InputNumber,
//   Button,
//   Card,
//   Space,
//   message,
//   Row,
//   Col,
//   Descriptions,
//   Alert,
//   Spin,
//   Divider
// } from 'antd';
// import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
// import { useNavigate, useParams } from 'react-router-dom';
// import { useDemandesStore } from '../../store/demandesStore';
// import { usePermissions } from '../../hooks/usePermissions';
// import MaterielSelector from '../../components/forms/MaterielSelector';
// import { formatCurrency } from '../../utils/formatters';
// import { demandesAPI } from '../../services/demandes'; // 🔥 Important !

// const { TextArea } = Input;

// const DemandeEdit = () => {
//   const navigate = useNavigate();
//   const { id } = useParams();
//   const { updateDemande, loading } = useDemandesStore();
//   const { user } = usePermissions();

//   const [form] = Form.useForm();
//   const [initialLoading, setInitialLoading] = useState(true);
//   const [demande, setDemande] = useState(null); // ✅ État local pour la demande
//   const [selectedMateriels, setSelectedMateriels] = useState([]);

//   // 🔥 Charger la demande via l'API existante
//   useEffect(() => {
//     if (id) {
//       loadDemande();
//     }
//   }, [id]);

//   const loadDemande = async () => {
//     setInitialLoading(true);
//     try {
//       const result = await demandesAPI.get(id); // ✅ Utilise votre API existante
//       const data = result.data;
//       setDemande(data);

//       // Pré-remplir le formulaire
//       form.setFieldsValue({
//         chantier: data.chantier,
//         duree_mois: data.duree_mois,
//         observations: data.observations || ''
//       });

//       // Pré-remplir les matériels
//       const materiels = data.materiels_demandes?.map(md => ({
//         id: md.materiel.id,
//         type_materiel: md.materiel.type_materiel,
//         prix_unitaire_mru: md.materiel.prix_unitaire_mru,
//         type_facturation: md.materiel.type_facturation,
//         quantite: md.quantite,
//         observations: md.observations || ''
//       })) || [];
      
//       setSelectedMateriels(materiels);
//     } catch (error) {
//       console.error('Erreur chargement demande:', error);
//       message.error('Demande non trouvée');
//       navigate('/demandes');
//     } finally {
//       setInitialLoading(false);
//     }
//   };

//   const canEdit = () => {
//     if (!demande) return false;
//     return (
//       (demande.statut === 'BROUILLON' || demande.statut === 'REJETEE') &&
//       (user?.id === demande.demandeur?.id)
//     );
//   };

//   const handleSubmit = async (values) => {
//     if (!canEdit()) {
//       message.error('Vous ne pouvez pas modifier cette demande.');
//       return;
//     }

//     if (selectedMateriels.length === 0) {
//       message.error('Veuillez sélectionner au moins un matériel.');
//       return;
//     }

//     const payload = {
//       chantier: values.chantier,
//       duree_mois: values.duree_mois,
//       observations: values.observations?.trim() || '',
//       departement: user?.departement || 'GENERAL',
//       materiels_demandes: selectedMateriels.map(mat => ({
//         materiel: mat.id,
//         quantite: mat.quantite,
//         observations: mat.observations || ''
//       }))
//     };

//     try {
//       const result = await updateDemande(id, payload);
//       if (result.success) {
//         message.success('Demande modifiée avec succès');
//         navigate(`/demandes/${id}`);
//       } else {
//         if (result.error && typeof result.error === 'object') {
//           Object.entries(result.error).forEach(([field, errors]) => {
//             message.error(`${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
//           });
//         } else {
//           message.error(result.error?.message || 'Erreur lors de la modification');
//         }
//       }
//     } catch (error) {
//       message.error('Erreur inattendue');
//     }
//   };

//   // 🔁 Gestion du chargement initial
//   if (initialLoading) {
//     return (
//       <div style={{ textAlign: 'center', padding: '50px' }}>
//         <Spin size="large" />
//         <p>Chargement de la demande...</p>
//       </div>
//     );
//   }

//   // ❌ Demande non trouvée ou non éditable
//   if (!demande) {
//     return (
//       <Card>
//         <Alert
//           message="Demande non trouvée"
//           description="La demande demandée n'existe pas ou a été supprimée."
//           type="error"
//           showIcon
//         />
//         <Button onClick={() => navigate('/demandes')} style={{ marginTop: 16 }}>
//           Retour à la liste
//         </Button>
//       </Card>
//     );
//   }

//   if (!canEdit()) {
//     return (
//       <Card>
//         <Alert
//           message="Modification non autorisée"
//           description="Seul le demandeur peut modifier une demande en brouillon ou rejetée."
//           type="warning"
//           showIcon
//         />
//         <Button onClick={() => navigate(`/demandes/${id}`)} style={{ marginTop: 16 }}>
//           Voir la demande
//         </Button>
//       </Card>
//     );
//   }

//   const calculateBudget = () => {
//     const duree = form.getFieldValue('duree_mois') || demande.duree_mois || 1;
//     return selectedMateriels.reduce((total, mat) => {
//       return total + (mat.prix_unitaire_mru * mat.quantite * duree * 30);
//     }, 0);
//   };

//   return (
//     <div>
//       <Card style={{ marginBottom: 24 }}>
//         <Row align="middle" justify="space-between">
//           <Col>
//             <Space>
//               <Button
//                 icon={<ArrowLeftOutlined />}
//                 onClick={() => navigate(`/demandes/${id}`)}
//               >
//                 Retour
//               </Button>
//               <div>
//                 <h2 style={{ margin: 0 }}>Modifier la demande</h2>
//                 <p style={{ margin: 0, color: '#666' }}>
//                   {demande.numero}
//                 </p>
//               </div>
//             </Space>
//           </Col>
//         </Row>
//       </Card>

//       <Row gutter={24}>
//         <Col span={16}>
//           <Card title="Informations modifiables">
//             <Alert
//               message="Modification limitée"
//               description="Vous ne pouvez modifier une demande que si elle est en brouillon ou a été rejetée."
//               type="info"
//               showIcon
//               style={{ marginBottom: 24 }}
//             />

//             <Form
//               form={form}
//               layout="vertical"
//               onFinish={handleSubmit}
//               size="large"
//             >
//               <Row gutter={16}>
//                 <Col span={16}>
//                   <Form.Item
//                     name="chantier"
//                     label="Chantier / Projet"
//                     rules={[
//                       { required: true, message: 'Le chantier est obligatoire' },
//                       { min: 3, message: 'Au moins 3 caractères' }
//                     ]}
//                   >
//                     <Input placeholder="Ex: Construction Route Nouakchott-Rosso" />
//                   </Form.Item>
//                 </Col>
//                 <Col span={8}>
//                   <Form.Item
//                     name="duree_mois"
//                     label="Durée (mois)"
//                     rules={[{ required: true, message: 'Durée obligatoire' }]}
//                   >
//                     <InputNumber
//                       min={1}
//                       max={6}
//                       style={{ width: '100%' }}
//                       addonAfter="mois"
//                     />
//                   </Form.Item>
//                 </Col>
//               </Row>

//               <Form.Item name="observations" label="Observations">
//                 <TextArea
//                   rows={4}
//                   placeholder="Spécifications particulières, remarques..."
//                 />
//               </Form.Item>

//               <Divider />

//               <h3 style={{ marginBottom: 16 }}>Matériels</h3>
//               <MaterielSelector
//                 selectedMateriels={selectedMateriels}
//                 onMaterielsChange={setSelectedMateriels}
//                 duree={form.getFieldValue('duree_mois') || demande.duree_mois || 1}
//               />

//               <Form.Item style={{ marginTop: 24 }}>
//                 <Space>
//                   <Button
//                     type="primary"
//                     htmlType="submit"
//                     icon={<SaveOutlined />}
//                     loading={loading}
//                   >
//                     Enregistrer les modifications
//                   </Button>
//                   <Button onClick={() => navigate(`/demandes/${id}`)}>
//                     Annuler
//                   </Button>
//                 </Space>
//               </Form.Item>
//             </Form>
//           </Card>
//         </Col>

//         <Col span={8}>
//           <Card title="Informations de référence" style={{ marginBottom: 24 }}>
//             <Descriptions column={1} size="small">
//               <Descriptions.Item label="Numéro">{demande.numero}</Descriptions.Item>
//               <Descriptions.Item label="Demandeur">
//                 {demande.demandeur?.first_name} {demande.demandeur?.last_name}
//               </Descriptions.Item>
//               <Descriptions.Item label="Département">{demande.departement}</Descriptions.Item>
//               <Descriptions.Item label="Statut">
//                 <span style={{ color: demande.statut === 'BROUILLON' ? '#faad14' : '#ff4d4f' }}>
//                   {demande.statut === 'BROUILLON' ? 'Brouillon' : 'Rejetée'}
//                 </span>
//               </Descriptions.Item>
//               <Descriptions.Item label="Créée le">
//                 {new Date(demande.created_at).toLocaleDateString()}
//               </Descriptions.Item>
//             </Descriptions>
//           </Card>

//           <Card title="Budget prévisionnel" size="small">
//             <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
//               {formatCurrency(calculateBudget())} MRU
//             </div>
//             <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
//               Basé sur {selectedMateriels.length} matériel(s) et {form.getFieldValue('duree_mois') || demande.duree_mois} mois
//             </div>
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default DemandeEdit;
