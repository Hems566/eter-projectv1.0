// pages/fournisseurs/FournisseurForm.jsx
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
  message,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useFournisseursStore } from '../../store/fournisseursStore';

const { TextArea } = Input;

const FournisseurForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const {
    fournisseur,
    loading,
    getFournisseur,
    createFournisseur,
    updateFournisseur,
    clearFournisseur
  } = useFournisseursStore();

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadFournisseur();
    } else {
      clearFournisseur();
    }

    return () => clearFournisseur();
  }, [id, isEditing]);

  useEffect(() => {
    if (fournisseur && isEditing) {
      form.setFieldsValue({
        nif: fournisseur.nif,
        raison_sociale: fournisseur.raison_sociale,
        telephone: fournisseur.telephone,
        email: fournisseur.email,
        adresse: fournisseur.adresse,
        actif: fournisseur.actif
      });
    }
  }, [fournisseur, form, isEditing]);

  const loadFournisseur = async () => {
    const result = await getFournisseur(id);
    if (!result.success) {
      message.error('Fournisseur non trouvé');
      navigate('/fournisseurs');
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const result = isEditing
        ? await updateFournisseur(id, values)
        : await createFournisseur(values);

      if (result.success) {
        message.success(
          isEditing 
            ? 'Fournisseur modifié avec succès' 
            : 'Fournisseur créé avec succès'
        );
        navigate(isEditing ? `/fournisseurs/${id}` : '/fournisseurs');
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

  const validateNIF = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Le NIF est obligatoire'));
    }
    if (!/^\d{8}$/.test(value)) {
      return Promise.reject(new Error('Le NIF doit contenir exactement 8 chiffres'));
    }
    return Promise.resolve();
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
                onClick={() => navigate(isEditing ? `/fournisseurs/${id}` : '/fournisseurs')}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  {isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
                </h2>
                {isEditing && fournisseur && (
                  <p style={{ margin: 0, color: '#666' }}>
                    {fournisseur.raison_sociale}
                  </p>
                )}
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="Informations du fournisseur">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ actif: true }}
              size="large"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="nif"
                    label="NIF (Numéro d'Identification Fiscale)"
                    rules={[{ validator: validateNIF }]}
                    hasFeedback
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="12345678"
                      maxLength={8}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="actif"
                    label="Statut"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="Actif"
                      unCheckedChildren="Inactif"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="raison_sociale"
                label="Raison sociale"
                rules={[
                  { required: true, message: 'La raison sociale est obligatoire' },
                  { min: 2, message: 'La raison sociale doit contenir au moins 2 caractères' }
                ]}
              >
                <Input
                  placeholder="Nom de l'entreprise"
                />
              </Form.Item>

              <Divider orientation="left">Informations de contact</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="telephone"
                    label="Téléphone"
                    rules={[
                      { 
                        pattern: /^[\d\s\-\+\(\)]+$/, 
                        message: 'Format de téléphone invalide' 
                      }
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder="+222 XX XX XX XX"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { type: 'email', message: 'Format d\'email invalide' }
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="contact@entreprise.com"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="adresse"
                label="Adresse"
              >
                <TextArea
                  rows={4}
                  placeholder="Adresse complète du fournisseur..."
                  prefix={<HomeOutlined />}
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
                    {isEditing ? 'Modifier' : 'Créer'} le fournisseur
                  </Button>
                  <Button
                    onClick={() => navigate(isEditing ? `/fournisseurs/${id}` : '/fournisseurs')}
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
          <Card title="Aide" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <p><strong>NIF :</strong></p>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>Exactement 8 chiffres</li>
                <li>Unique pour chaque fournisseur</li>
                <li>Obligatoire pour la facturation</li>
              </ul>

              <p style={{ marginTop: '16px' }}><strong>Raison sociale :</strong></p>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>Nom officiel de l'entreprise</li>
                <li>Tel qu'il apparaît sur les documents</li>
              </ul>

              <p style={{ marginTop: '16px' }}><strong>Statut :</strong></p>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li>Actif : peut recevoir de nouveaux contrats</li>
                <li>Inactif : masqué des sélections</li>
              </ul>
            </div>
          </Card>

          {isEditing && fournisseur && (
            <Card title="Informations" size="small" style={{ marginTop: 16 }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <p>Créé le : {new Date(fournisseur.created_at).toLocaleDateString()}</p>
                <p>Modifié le : {new Date(fournisseur.updated_at).toLocaleDateString()}</p>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default FournisseurForm;
