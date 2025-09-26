// pages/materiels/MaterielForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  Switch,
  Select,
  InputNumber,
  message,
  Divider,
  Alert,
  Tag
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ToolOutlined,
  DollarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaterielsStore } from '../../store/materielsStore';
import { formatCurrency } from '../../utils/formatters';

const { TextArea } = Input;
const { Option } = Select;

// Constantes
const TYPE_MATERIEL_OPTIONS = [
  { value: 'NIVELEUSE', label: 'Niveleuse', icon: '🚜' },
  { value: 'BULLDOZER', label: 'Bulldozer', icon: '🚛' },
  { value: 'EXCAVATRICE', label: 'Excavatrice', icon: '🚧' },
  { value: 'COMPACTEUR', label: 'Compacteur', icon: '🛣️' },
  { value: 'CAMION', label: 'Camion', icon: '🚚' },
  { value: 'VEHICULE_LEGER', label: 'Véhicule léger', icon: '🚗' },
  { value: 'GROUPE_ELECTROGENE', label: 'Groupe électrogène', icon: '⚡' },
  { value: 'AUTRE', label: 'Autre équipement', icon: '🔧' },
];

const TYPE_FACTURATION_OPTIONS = [
  { 
    value: 'PAR_JOUR', 
    label: 'Par jour', 
    icon: '📅',
    description: 'Le prix est multiplié par le nombre de jours'
  },
  { 
    value: 'PAR_HEURE', 
    label: 'Par heure', 
    icon: '⏰',
    description: 'Le prix est multiplié par le nombre d\'heures travaillées'
  },
  { 
    value: 'FORFAITAIRE', 
    label: 'Forfaitaire', 
    icon: '💰',
    description: 'Prix fixe pour toute la période de location'
  },
];

const MaterielForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const {
    materiel,
    loading,
    getMateriel,
    createMateriel,
    updateMateriel,
    clearMateriel
  } = useMaterielsStore();

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedFacturation, setSelectedFacturation] = useState('PAR_JOUR');
  const [previewPrix, setPreviewPrix] = useState(0);

  useEffect(() => {
    if (isEditing && id) {
      loadMateriel();
    } else {
      clearMateriel();
    }

    return () => clearMateriel();
  }, [id, isEditing]);

  useEffect(() => {
    if (materiel && isEditing) {
      form.setFieldsValue({
        type_materiel: materiel.type_materiel,
        type_facturation: materiel.type_facturation,
        prix_unitaire_mru: materiel.prix_unitaire_mru,
        observations: materiel.observations,
        actif: materiel.actif
      });
      setSelectedFacturation(materiel.type_facturation);
      setPreviewPrix(materiel.prix_unitaire_mru);
    }
  }, [materiel, form, isEditing]);

  const loadMateriel = async () => {
    const result = await getMateriel(id);
    if (!result.success) {
      message.error('Matériel non trouvé');
      navigate('/materiels');
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const result = isEditing
        ? await updateMateriel(id, values)
        : await createMateriel(values);

      if (result.success) {
        message.success(
          isEditing 
            ? 'Matériel modifié avec succès' 
            : 'Matériel créé avec succès'
        );
        navigate(isEditing ? `/materiels/${id}` : '/materiels');
      } else {
        // Afficher les erreurs de validation
        if (result.error && typeof result.error === 'object') {
          Object.entries(result.error).forEach(([field, errors]) => {
            const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors;
            message.error(`${field}: ${errorMsg}`);
          });
        } else {
          message.error('Erreur lors de l\'enregistrement');
        }
      }
    } catch (error) {
      message.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFacturationChange = (value) => {
    setSelectedFacturation(value);
  };

  const handlePrixChange = (value) => {
    setPreviewPrix(value || 0);
  };

  const getFacturationInfo = () => {
    return TYPE_FACTURATION_OPTIONS.find(opt => opt.value === selectedFacturation);
  };

  const calculatePreview = (prix, type, duration) => {
    if (!prix) return 0;
    switch (type) {
      case 'PAR_JOUR':
        return prix * duration;
      case 'PAR_HEURE':
        return prix * duration * 8; // 8h par jour
      case 'FORFAITAIRE':
        return prix;
      default:
        return prix;
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
                onClick={() => navigate(isEditing ? `/materiels/${id}` : '/materiels')}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  {isEditing ? 'Modifier le matériel' : 'Nouveau matériel'}
                </h2>
                {isEditing && materiel && (
                  <p style={{ margin: 0, color: '#666' }}>
                    {TYPE_MATERIEL_OPTIONS.find(opt => opt.value === materiel.type_materiel)?.label || materiel.type_materiel}
                  </p>
                )}
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Informations du matériel">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ 
                actif: true,
                type_facturation: 'PAR_JOUR'
              }}
              size="large"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="type_materiel"
                    label="Type de matériel"
                    rules={[
                      { required: true, message: 'Le type de matériel est obligatoire' }
                    ]}
                  >
                    <Select
                      placeholder="Sélectionner le type"
                      showSearch
                      optionFilterProp="children"
                    >
                      {TYPE_MATERIEL_OPTIONS.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="actif"
                    label="Statut de disponibilité"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="Disponible"
                      unCheckedChildren="Non disponible"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Tarification</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="type_facturation"
                    label="Type de facturation"
                    rules={[
                      { required: true, message: 'Le type de facturation est obligatoire' }
                    ]}
                  >
                    <Select
                      placeholder="Sélectionner le type"
                      onChange={handleFacturationChange}
                    >
                      {TYPE_FACTURATION_OPTIONS.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  {selectedFacturation && (
                    <Alert
                      message={getFacturationInfo()?.description}
                      type="info"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="prix_unitaire_mru"
                    label="Prix unitaire (MRU)"
                    rules={[
                      { required: true, message: 'Le prix unitaire est obligatoire' },
                      { type: 'number', min: 0.001, message: 'Le prix doit être supérieur à 0' }
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.000"
                      min={0.001}
                      precision={3}
                      step={1}
                      prefix={<DollarOutlined />}
                      addonAfter="MRU"
                      onChange={handlePrixChange}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Aperçu des prix */}
              {previewPrix > 0 && (
                <Card size="small" style={{ background: '#f0f9ff', marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Aperçu des tarifs :</strong>
                  </div>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Tag color="blue">
                        1 jour : {formatCurrency(calculatePreview(previewPrix, selectedFacturation, 1))} MRU
                      </Tag>
                    </Col>
                    <Col span={8}>
                      <Tag color="green">
                        1 semaine : {formatCurrency(calculatePreview(previewPrix, selectedFacturation, 7))} MRU
                      </Tag>
                    </Col>
                    <Col span={8}>
                      <Tag color="orange">
                        1 mois : {formatCurrency(calculatePreview(previewPrix, selectedFacturation, 30))} MRU
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              )}

              <Form.Item
                name="observations"
                label="Observations"
                extra="Informations complémentaires sur le matériel (caractéristiques, conditions d'utilisation, etc.)"
              >
                <TextArea
                  rows={4}
                  placeholder="Caractéristiques techniques, conditions particulières d'utilisation..."
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    size="large"
                  >
                    {isEditing ? 'Modifier' : 'Créer'} le matériel
                  </Button>
                  <Button
                    onClick={() => navigate(isEditing ? `/materiels/${id}` : '/materiels')}
                    size="large"
                  >
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Guide de tarification" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>Types de facturation :</strong></p>
              
              <div style={{ marginBottom: 12 }}>
                <Tag color="blue">📅 Par jour</Tag>
                <div>Prix × nombre de jours de location</div>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <Tag color="green">⏰ Par heure</Tag>
                <div>Prix × heures réellement travaillées</div>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <Tag color="orange">💰 Forfaitaire</Tag>
                <div>Prix fixe pour toute la période</div>
              </div>

              <Alert
                message="Conseil"
                description="Le prix par heure est généralement plus élevé que le prix par jour divisé par 8h, car il offre plus de flexibilité."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </div>
          </Card>

          {isEditing && materiel && (
            <Card title="Historique" size="small" style={{ marginTop: 16 }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p>Créé le : {new Date(materiel.created_at).toLocaleDateString()}</p>
                <p>ID : {materiel.id}</p>
              </div>
            </Card>
          )}

          <Card title="Types de matériel" size="small" style={{ marginTop: 16 }}>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {TYPE_MATERIEL_OPTIONS.map(option => (
                <div key={option.value} style={{ marginBottom: 4 }}>
                  {option.icon} {option.label}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MaterielForm;
