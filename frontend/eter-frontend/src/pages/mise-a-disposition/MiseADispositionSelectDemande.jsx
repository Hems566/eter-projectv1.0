import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col,
  Input,
  message
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { demandesAPI } from '../../services/demandes';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { Search } = Input;

const MiseADispositionSelectDemande = () => {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = async (search = '') => {
    setLoading(true);
    try {
      const response = await demandesAPI.list({ 
        statut: 'VALIDEE',
        search 
      });
      setDemandes(response.data.results || response.data);
    } catch (error) {
      message.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'numero',
      key: 'numero',
      width: 120,
    },
    {
      title: 'Chantier',
      dataIndex: 'chantier',
      key: 'chantier',
    },
    {
      title: 'Demandeur',
      key: 'demandeur',
      render: (_, record) => 
        `${record.demandeur?.first_name} ${record.demandeur?.last_name}`,
    },
    {
      title: 'Département',
      dataIndex: 'departement',
      key: 'departement',
    },
    {
      title: 'Budget',
      dataIndex: 'budget_previsionnel_mru',
      key: 'budget',
      render: (budget) => formatCurrency(budget) + ' MRU',
    },
    {
      title: 'Date validation',
      dataIndex: 'date_validation',
      key: 'date_validation',
      render: (date) => formatDate(date),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/mises-a-disposition/create?demande_id=${record.id}`)}
        >
          Créer MAD
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/mises-a-disposition')}
            >
              Retour aux MAD
            </Button>
            <h2 style={{ margin: '16px 0 0 0' }}>
              Sélectionner une demande pour créer une MAD
            </h2>
          </Col>
        </Row>
      </Card>

      <Card>
        <Row style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="Rechercher par numéro, chantier..."
              allowClear
              onSearch={loadDemandes}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={demandes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default MiseADispositionSelectDemande;
