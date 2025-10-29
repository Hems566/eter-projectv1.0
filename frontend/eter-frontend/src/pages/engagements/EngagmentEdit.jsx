// pages/EngagementEdit.jsx
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
  Select
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { useEngagementsStore } from '../../store/engagementsStore';
import { engagementsAPI } from '../../services/engagements';
import { formatCurrency } from '../../utils/formatters';

const { TextArea } = Input;
const { Option } = Select;

const EngagementEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    engagement,
    loading,
    getEngagement,
    updateEngagement,
    clearEngagement
  } = useEngagementsStore();

  const [form] = Form.useForm();
  const [initialLoading, setInitialLoading] = useState(true);
  const [misesADispositionOptions, setMisesADispositionOptions] = useState([]);
  const [madLoading, setMadLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadEngagement();
      loadMisesADispositionDisponibles();
    }
    return () => clearEngagement();
  }, [id]);

  const loadEngagement = async () => {
    setInitialLoading(true);
    try {
      const result = await getEngagement(id);
      if (!result.success) {
        message.error('Engagement non trouvé');
        navigate('/engagements');
      } else {
        // Pré-remplir uniquement les champs modifiables
        form.setFieldsValue({
          mise_a_disposition_id: result.data.mise_a_disposition?.id,
          date_debut: moment(result.data.date_debut),
          conditions_particulieres: result.data.conditions_particulieres || ''
        });
      }
    } catch (error) {
      message.error('Erreur lors du chargement');
      navigate('/engagements');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMisesADispositionDisponibles = async () => {
    setMadLoading(true);
    try {
      const response = await engagementsAPI.misesADispositionDisponibles();
      const disponibles = response.data.results || response.data || [];
      
      // Inclure la MAD actuelle même si elle n'est plus "disponible"
      const currentMAD = engagement?.mise_a_disposition;
      let options = disponibles;
      if (currentMAD && !disponibles.some(m => m.id === currentMAD.id)) {
        options = [
          {
            id: currentMAD.id,
            demande_location_numero: currentMAD.demande_location?.numero || currentMAD.demande_location_numero,
            chantier: currentMAD.chantier,
            fournisseur_nom: currentMAD.fournisseur?.raison_sociale || currentMAD.fournisseur_nom,
            immatriculation: currentMAD.immatriculation,
            conforme: currentMAD.conforme
          },
          ...disponibles
        ];
      }
      setMisesADispositionOptions(options);
    } catch (error) {
      message.warning('Impossible de charger les mises à disposition disponibles');
      setMisesADispositionOptions([]);
    } finally {
      setMadLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      // 🔥 Ne PAS inclure de champs immuables (numero, montant, etc.)
      const payload = {
        mise_a_disposition_id: values.mise_a_disposition_id,
        date_debut: values.date_debut.format('YYYY-MM-DD'),
        conditions_particulieres: values.conditions_particulieres?.trim() || ''
      };

      const result = await updateEngagement(id, payload);

      if (result.success) {
        message.success('Engagement modifié avec succès');
        navigate(`/engagements/${id}`);
      } else {
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
        <p>Chargement de l'engagement...</p>
      </div>
    );
  }

  if (!engagement) {
    return (
      <Card>
        <Alert
          message="Engagement non trouvé"
          description="L'engagement demandé n'existe pas ou a été supprimé."
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
                onClick={() => navigate(`/engagements/${id}`)}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>Modifier l'engagement</h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Engagement {engagement.numero}
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
              description="La modification de la mise à disposition ou de la date de début peut affecter les fiches de pointage existantes."
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
              <Form.Item
                name="mise_a_disposition_id"
                label="Mise à disposition"
                rules={[{ required: true, message: 'Veuillez sélectionner une mise à disposition' }]}
              >
                <Select
                  placeholder="Choisir une mise à disposition"
                  loading={madLoading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {misesADispositionOptions.map(mad => (
                    <Option key={mad.id} value={mad.id}>
                      <div>
                        <strong>{mad.demande_location_numero}</strong> - {mad.chantier}
                        <br />
                        <small>
                          Fournisseur: {mad.fournisseur_nom} | 
                          Immat: {mad.immatriculation} | 
                          {mad.conforme ? '✅ Conforme' : '❌ Non conforme'}
                        </small>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="date_debut"
                label="Date de début"
                rules={[{ required: true, message: 'La date de début est obligatoire' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Sélectionner la date"
                  prefix={<CalendarOutlined />}
                />
              </Form.Item>

              <Form.Item label="Date de fin (calculée)">
                <Input
                  value={(() => {
                    const dateDebut = form.getFieldValue('date_debut');
                    const duree = engagement?.mise_a_disposition?.duree_mois || 1;
                    if (dateDebut) {
                      return dateDebut.clone().add(duree, 'months').format('DD/MM/YYYY');
                    }
                    return 'Sélectionnez la date de début';
                  })()}
                  readOnly
                />
              </Form.Item>

              <Form.Item name="conditions_particulieres" label="Conditions particulières">
                <TextArea
                  rows={4}
                  placeholder="Conditions spéciales, clauses, remarques..."
                  prefix={<FileTextOutlined />}
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
                  <Button onClick={() => navigate(`/engagements/${id}`)}>
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations de référence */}
          <Card title="Informations de référence" style={{ marginBottom: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Numéro d'engagement">
                {engagement.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Demande de location">
                {engagement.mise_a_disposition?.demande_location?.numero}
              </Descriptions.Item>
              <Descriptions.Item label="Chantier">
                {engagement.mise_a_disposition?.chantier}
              </Descriptions.Item>
              <Descriptions.Item label="Fournisseur">
                {engagement.mise_a_disposition?.fournisseur?.raison_sociale}
              </Descriptions.Item>
              <Descriptions.Item label="Immatriculation">
                {engagement.mise_a_disposition?.immatriculation}
              </Descriptions.Item>
              <Descriptions.Item label="Durée">
                {engagement.mise_a_disposition?.duree_mois} mois
              </Descriptions.Item>
              <Descriptions.Item label="Montant estimé">
                {formatCurrency(engagement.montant_total_estime_mru)} MRU
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Statistiques */}
          <Card title="Statistiques" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Fiches de pointage">
                {engagement.fiches_pointage_count || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Montant réel pointé">
                {formatCurrency(engagement.montant_reel_pointe || 0)} MRU
              </Descriptions.Item>
            </Descriptions>
            
            {engagement.fiches_pointage_count > 0 && (
              <Alert
                message="Fiches existantes"
                description={`Cet engagement contient ${engagement.fiches_pointage_count} fiche(s). Vérifiez que vos modifications sont compatibles.`}
                type="info"
                size="small"
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EngagementEdit;