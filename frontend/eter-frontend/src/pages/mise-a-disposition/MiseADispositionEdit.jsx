// pages/MiseADispositionEdit.jsx
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
  Alert,
  Spin,
  Checkbox
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CarOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { useMisesADispositionStore } from '../../store/misesADispositionStore';
import { formatCurrency } from '../../utils/formatters';

const MiseADispositionEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    currentMiseADisposition: miseADisposition,
    loading,
    fetchMiseADispositionById,
    updateMiseADisposition,
    clearCurrentMiseADisposition
  } = useMisesADispositionStore();

  const [form] = Form.useForm();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMiseADisposition();
    }
    return () => clearCurrentMiseADisposition();
  }, [id]);

  const loadMiseADisposition = async () => {
    setInitialLoading(true);
    try {
      const result = await fetchMiseADispositionById(id);
      if (!result.success) {
        message.error('Mise à disposition non trouvée');
        navigate('/mises-a-disposition');
      } else {
        // Pré-remplir uniquement les champs modifiables
        form.setFieldsValue({
          date_mise_disposition: moment(result.data.date_mise_disposition),
          immatriculation: result.data.immatriculation || '',
          conforme: result.data.conforme,
          observations: result.data.observations || ''
        });
      }
    } catch (error) {
      message.error('Erreur lors du chargement');
      navigate('/mises-a-disposition');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      // 🔥 Ne PAS inclure demande_location_id ni fournisseur_id
      const payload = {
        date_mise_disposition: values.date_mise_disposition.format('YYYY-MM-DD'),
        immatriculation: values.immatriculation.trim(),
        conforme: values.conforme !== false,
        observations: values.observations?.trim() || ''
      };

      const result = await updateMiseADisposition(id, payload);

      if (result.success) {
        message.success('Mise à disposition modifiée avec succès');
        navigate(`/mises-a-disposition/${id}`);
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
      message.error('Veuillez vérifier tous les champs');
    }
  };

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Chargement de la mise à disposition...</p>
      </div>
    );
  }

  if (!miseADisposition) {
    return (
      <Card>
        <Alert
          message="Mise à disposition non trouvée"
          description="La mise à disposition demandée n'existe pas ou a été supprimée."
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
                onClick={() => navigate(`/mises-a-disposition/${id}`)}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>Modifier la mise à disposition</h2>
                <p style={{ margin: 0, color: '#666' }}>
                  MAD liée à la demande {miseADisposition.demande_location.numero}
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={16}>
          {/* Formulaire de modification */}
          <Card title="Informations modifiables">
            <Alert
              message="Attention"
              description="La mise à disposition ne peut être modifiée que si aucun engagement n'a été créé."
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="date_mise_disposition"
                    label="Date de mise à disposition"
                    rules={[{ required: true, message: 'La date est obligatoire' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      placeholder="Sélectionner la date"
                      prefix={<CalendarOutlined />}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="immatriculation"
                    label="Immatriculation / Référence"
                    rules={[
                      { required: true, message: 'L\'immatriculation est obligatoire' },
                      { min: 3, message: 'Doit contenir au moins 3 caractères' }
                    ]}
                  >
                    <Input
                      prefix={<CarOutlined />}
                      placeholder="Ex: 1234 NKT 18"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="conforme" valuePropName="checked">
                <Checkbox>
                  Le matériel est conforme aux spécifications de la demande
                </Checkbox>
              </Form.Item>

              <Form.Item name="observations" label="Observations">
                <Input.TextArea
                  rows={4}
                  placeholder="Remarques sur l'état du matériel, conditions particulières..."
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
                  <Button onClick={() => navigate(`/mises-a-disposition/${id}`)}>
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations de référence (lecture seule) */}
          <Card title="Informations de référence" style={{ marginBottom: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Demande de location">
                {miseADisposition.demande_location.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Chantier">
                {miseADisposition.demande_location.chantier}
              </Descriptions.Item>
              <Descriptions.Item label="Fournisseur">
                {miseADisposition.fournisseur.raison_sociale}
              </Descriptions.Item>
              <Descriptions.Item label="NIF">
                {miseADisposition.fournisseur.nif}
              </Descriptions.Item>
              <Descriptions.Item label="Budget prévisionnel">
                {formatCurrency(miseADisposition.demande_location.budget_previsionnel_mru)} MRU
              </Descriptions.Item>
              <Descriptions.Item label="Durée">
                {miseADisposition.demande_location.duree_mois} mois
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Statut engagement */}
          <Card title="Statut" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Conformité">
                {miseADisposition.conforme ? '✅ Conforme' : '❌ Non conforme'}
              </Descriptions.Item>
              <Descriptions.Item label="Engagement">
                {miseADisposition.engagement ? (
                  <span style={{ color: '#ff4d4f' }}>❌ Existe (non modifiable)</span>
                ) : (
                  <span style={{ color: '#52c41a' }}>✅ Aucun</span>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MiseADispositionEdit;