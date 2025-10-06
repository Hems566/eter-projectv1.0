// pages/pointages/FichePointageEdit.jsx
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
  Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { usePointagesStore } from '../../store/pointagesStore';
import { formatDate } from '../../utils/formatters';

const { RangePicker } = DatePicker;

const FichePointageEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fichePointage, loading, getFichePointage, updateFiche } = usePointagesStore();
  const [form] = Form.useForm();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadFiche();
  }, [id]);

  const loadFiche = async () => {
    setInitialLoading(true);
    try {
      const result = await getFichePointage(id);
      if (result.success) {
        // Pré-remplir le formulaire
        form.setFieldsValue({
          numero_fiche: result.data.numero_fiche,
          immatriculation: result.data.immatriculation || '',
          periode: [
            moment(result.data.periode_debut),
            moment(result.data.periode_fin)
          ]
        });
      } else {
        message.error('Fiche non trouvée');
        navigate('/pointages/fiches');
      }
    } catch (error) {
      message.error('Erreur lors du chargement');
      navigate('/pointages/fiches');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const ficheData = {
        numero_fiche: values.numero_fiche,
        immatriculation: values.immatriculation || '',
        periode_debut: values.periode[0].format('YYYY-MM-DD'),
        periode_fin: values.periode[1].format('YYYY-MM-DD'),
      };

      const result = await updateFiche(id, ficheData);
      
      if (result.success) {
        message.success('Fiche de pointage modifiée avec succès');
        navigate(`/pointages/fiches/${id}`);
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
        <p>Chargement de la fiche...</p>
      </div>
    );
  }

  if (!fichePointage) {
    return (
      <Card>
        <Alert
          message="Fiche non trouvée"
          description="La fiche de pointage demandée n'existe pas ou a été supprimée."
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
                onClick={() => navigate(`/pointages/fiches/${id}`)}
              >
                Retour
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>Modifier la fiche de pointage</h2>
                <p style={{ margin: 0, color: '#666' }}>
                  {fichePointage.numero_fiche}
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
              description="La modification de la période peut affecter les pointages journaliers existants. Assurez-vous que la nouvelle période englobe tous les pointages déjà créés."
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
                    name="numero_fiche"
                    label="Numéro de fiche"
                    rules={[
                      { required: true, message: 'Le numéro de fiche est obligatoire' },
                      { pattern: /^[A-Z0-9-_]+$/i, message: 'Format invalide' }
                    ]}
                  >
                    <Input 
                      placeholder="Ex: FP-2024-001"
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
                  format="DD/MM/YYYY"
                  placeholder={['Date début', 'Date fin']}
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
                  <Button 
                    onClick={() => navigate(`/pointages/fiches/${id}`)}
                  >
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          {/* Informations non modifiables */}
          <Card title="Informations de référence" style={{ marginBottom: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Engagement">
                <Button 
                  type="link" 
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/engagements/${fichePointage.engagement?.id}`)}
                >
                  {fichePointage.engagement?.numero}
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="Chantier">
                {fichePointage.chantier}
              </Descriptions.Item>
              <Descriptions.Item label="Matériel">
                {fichePointage.materiel_type}
              </Descriptions.Item>
              <Descriptions.Item label="Quantité">
                {fichePointage.materiel_quantite}
              </Descriptions.Item>
              <Descriptions.Item label="Prix unitaire">
                {fichePointage.prix_unitaire} MRU
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Statistiques actuelles */}
          <Card title="Statistiques actuelles" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Pointages créés">
                {fichePointage.total_jours_pointes || 0} jours
              </Descriptions.Item>
              <Descriptions.Item label="Heures travail">
                {fichePointage.total_heures_travail || 0}h
              </Descriptions.Item>
              <Descriptions.Item label="Montant calculé">
                {fichePointage.montant_total_calcule || 0} MRU
              </Descriptions.Item>
            </Descriptions>
            
            {fichePointage.total_jours_pointes > 0 && (
              <Alert
                message="Pointages existants"
                description={`Cette fiche contient ${fichePointage.total_jours_pointes} pointage(s). Vérifiez que vos modifications sont compatibles.`}
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

export default FichePointageEdit;
