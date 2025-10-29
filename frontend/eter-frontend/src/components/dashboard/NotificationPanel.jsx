// components/dashboard/NotificationPanel.jsx
import React, { useEffect, useState } from 'react';
import { Card, List, Avatar, Tag, Button, Space, Alert, Spin, Typography } from 'antd';
import {
  ExclamationCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/formatters';
import moment from 'moment';

const { Text } = Typography;

const NotificationPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications,
    expiredCount,
    criticalCount,
    urgentCount,
    loading,
    error,
    fetchNotifications
  } = useNotificationStore();

  const [filteredNotifications, setFilteredNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...notifications];
    if (user?.is_demandeur && !user?.is_acheteur && !user?.is_admin) {
      console.log('Filtering notifications for demandeur:', user.id);
    }
    filtered.sort((a, b) => {
      const joursA = getJoursRestants(a.date_fin);
      const joursB = getJoursRestants(b.date_fin);
      const urgenceA = getUrgenceLevel(joursA);
      const urgenceB = getUrgenceLevel(joursB);
      return urgenceB.priority - urgenceA.priority;
    });
    setFilteredNotifications(filtered.slice(0, 5));
  }, [notifications, user]);

  const getJoursRestants = (dateFin) => {
    const today = moment().startOf('day');
    const fin = moment(dateFin).endOf('day');
    return fin.diff(today, 'days');
  };

  const getUrgenceLevel = (joursRestants) => {
    if (joursRestants < 0) return { color: 'volcano', level: 'Expiré', priority: 4, icon: <WarningOutlined /> };
    if (joursRestants <= 7) return { color: 'red', level: 'Critique', priority: 3, icon: <ExclamationCircleOutlined /> };
    if (joursRestants <= 15) return { color: 'orange', level: 'Urgent', priority: 2, icon: <ClockCircleOutlined /> };
    if (joursRestants <= 30) return { color: 'gold', level: 'Attention', priority: 1, icon: <ClockCircleOutlined /> };
    return { color: 'blue', level: 'Normal', priority: 0, icon: <ClockCircleOutlined /> };
  };

  if (loading) {
    return (
      <Card title="Alertes Engagements" style={{ height: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin size="large" /></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Alertes Engagements">
        <Alert message="Erreur de chargement" description="Impossible de charger les notifications." type="error" showIcon />
      </Card>
    );
  }

  return (
    <Card
      title={<Space><WarningOutlined />Alertes Engagements</Space>}
      extra={
        notifications.length > 0 && (
          <Button type="link" onClick={() => navigate('/engagements/expirants')}>
            Voir tout ({notifications.length})
          </Button>
        )
      }
      style={{ height: '100%' }}
    >
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <CheckCircleOutlined style={{ fontSize: '48px', marginBottom: 16, color: '#52c41a' }} />
          <p>Aucun engagement ne nécessite d'attention particulière.</p>
        </div>
      ) : (
        <>
          {(expiredCount > 0 || criticalCount > 0 || urgentCount > 0) && (
            <div style={{ marginBottom: 16, padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
              <Space wrap size="large">
                {expiredCount > 0 && <Tag color="volcano" icon={<WarningOutlined />}>{expiredCount} Expiré{expiredCount > 1 ? 's' : ''}</Tag>}
                {criticalCount > 0 && <Tag color="red" icon={<ExclamationCircleOutlined />}>{criticalCount} Critique{criticalCount > 1 ? 's' : ''}</Tag>}
                {urgentCount > 0 && <Tag color="orange" icon={<ClockCircleOutlined />}>{urgentCount} Urgent{urgentCount > 1 ? 's' : ''}</Tag>}
              </Space>
            </div>
          )}

          <List
            itemLayout="horizontal"
            dataSource={filteredNotifications}
            renderItem={(item) => {
              const joursRestants = getJoursRestants(item.date_fin);
              const urgence = getUrgenceLevel(joursRestants);

              return (
                <List.Item
                  style={{ cursor: 'pointer', padding: '12px 8px', borderRadius: '4px', transition: 'background-color 0.3s' }}
                  onClick={() => navigate(`/engagements/${item.id}`)}
                  className="notification-item"
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: urgence.color, color: 'white' }} icon={urgence.icon} />}
                    title={<Text strong>{`Engagement ${item.numero}`}</Text>}
                    description={`${item.mise_a_disposition?.chantier} • ${item.mise_a_disposition?.fournisseur_nom}`}
                  />
                  <div style={{ textAlign: 'right' }}>
                    <Tag color={urgence.color}>{urgence.level}</Tag>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                      {joursRestants < 0 ? `depuis ${Math.abs(joursRestants)} j` : `dans ${joursRestants} j`}
                    </Text>
                  </div>
                </List.Item>
              );
            }}
          />
        </>
      )}
    </Card>
  );
};

export default NotificationPanel;
