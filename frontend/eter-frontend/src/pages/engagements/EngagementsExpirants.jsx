// pages/engagements/EngagementsExpirants.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Alert,
  Row,
  Col,
  Statistic,
  Progress,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEngagementsStore } from '../../store/engagementsStore';
import { formatDate } from '../../utils/formatters';
import moment from 'moment';

const EngagementsExpirants = () => {
  const navigate = useNavigate();
  const { fetchEngagementsExpirants } = useEngagementsStore();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagementsExpirants();
  }, []);

  const loadEngagementsExpirants = async () => {
    setLoading(true);
    try {
      const result = await fetchEngagementsExpirants();
      if (result.success) {
        setEngagements(result.data);
      }
    } catch (error) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getJoursRestants = (dateFin) => {
    const today = moment();
    const fin = moment(dateFin);
    return fin.diff(today, 'days');
  };

  const getUrgenceLevel = (joursRestants) => {
    if (joursRestants <= 0) return { color: 'red', level: 'Expiré' };
    if (joursRestants <= 7) return { color: 'red', level: 'Critique' };
    if (joursRestants <= 15) return { color: 'orange', level: 'Urgent' };
    if (joursRestants <= 30) return { color: 'yellow', level: 'Attention' };
    return { color: 'blue', level: 'Normal' };
  };

  const columns = [
    {
      title: 'Engagement',
      dataIndex: 'numero',
      key: 'numero',
      render: (numero, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/engagements/${record.id}`)}
        >
          {numero}
        </Button>
      ),
    },
    {
      title: 'Chantier',
      key: 'chantier',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.mise_a_disposition?.chantier}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.mise_a_disposition?.fournisseur_nom}
          </div>
        </div>
      ),
    },
    {
      title: 'Date de fin',
      dataIndex: 'date_fin',
      key: 'date_fin',
      render: (date) => (
        <div>
          <div>{formatDate(date)}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {moment(date).format('dddd')}
          </div>
        </div>
      ),
    },
    {
      title: 'Jours restants',
      key: 'jours_restants',
      align: 'center',
      render: (_, record) => {
        const joursRestants = getJoursRestants(record.date_fin);
        const urgence = getUrgenceLevel(joursRestants);
        
        return (
          <Tag color={urgence.color}>
            {joursRestants <= 0 ? 'Expiré' : `${joursRestants} jours`}
          </Tag>
        );
      },
    },
    {
      title: 'Urgence',
      key: 'urgence',
      align: 'center',
      render: (_, record) => {
        const joursRestants = getJoursRestants(record.date_fin);
        const urgence = getUrgenceLevel(joursRestants);
        
        return (
          <Tag color={urgence.color}>
            {urgence.level}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/engagements/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => navigate(`/pointages/fiches?engagement=${record.id}`)}
          />
        </Space>
      ),
    },
  ];

  const stats = {
    total: engagements.length,
    expires: engagements.filter(e => getJoursRestants(e.date_fin) <= 0).length,
    critiques: engagements.filter(e => {
      const jours = getJoursRestants(e.date_fin);
      return jours > 0 && jours <= 7;
    }).length,
    urgents: engagements.filter(e => {
      const jours = getJoursRestants(e.date_fin);
      return jours > 7 && jours <= 15;
    }).length,
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
                Retour aux engagements
              </Button>
              <div>
                <h2 style={{ margin: 0 }}>
                  <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  Engagements expirants
                </h2>
                <p style={{ margin: 0, color: '#666' }}>
                  Engagements nécessitant une attention particulière
                </p>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Alerte */}
      {stats.expires > 0 && (
        <Alert
          message="Engagements expirés détectés"
          description={`${stats.expires} engagement(s) ont dépassé leur date de fin. Veuillez prendre les mesures nécessaires.`}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total à surveiller"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expirés"
              value={stats.expires}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Critiques (≤ 7j)"
              value={stats.critiques}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Urgents (≤ 15j)"
              value={stats.urgents}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card title="Engagements nécessitant une attention">
        <Table
          columns={columns}
          dataSource={engagements}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          rowClassName={(record) => {
            const joursRestants = getJoursRestants(record.date_fin);
            if (joursRestants <= 0) return 'row-expired';
            if (joursRestants <= 7) return 'row-critical';
            if (joursRestants <= 15) return 'row-urgent';
            return 'row-attention';
          }}
        />
      </Card>

      <style jsx>{`
        .row-expired {
          background-color: #fff2f0;
        }
        .row-critical {
          background-color: #fff7e6;
        }
        .row-urgent {
          background-color: #fffbe6;
        }
        .row-attention {
          background-color: #f0f9ff;
        }
      `}</style>
    </div>
  );
};

export default EngagementsExpirants;
