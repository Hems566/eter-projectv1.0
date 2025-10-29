// components/dashboard/NotificationPanel.jsx
import React, { useEffect, useState } from 'react';
import { Card, List, Avatar, Tag, Button, Space, Alert, Spin } from 'antd';
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

const NotificationPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications,
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
  }, [user]); // Remove fetchNotifications from dependencies to avoid infinite re-renders

  useEffect(() => {
    // Filter notifications based on user role
    let filtered = [...notifications];

    // For demandeurs, show only their own engagements
    if (user?.is_demandeur && !user?.is_acheteur && !user?.is_admin) {
      // In a real app, we'd filter by user's engagements
      // For now, show all but mark that filtering should be implemented
      console.log('Filtering notifications for demandeur:', user.id);
    }

    // Sort by urgency (critical first)
    filtered.sort((a, b) => {
      const joursA = getJoursRestants(a.date_fin);
      const joursB = getJoursRestants(b.date_fin);
      const urgenceA = getUrgenceLevel(joursA);
      const urgenceB = getUrgenceLevel(joursB);
      return urgenceB.priority - urgenceA.priority;
    });

    setFilteredNotifications(filtered.slice(0, 5)); // Show only top 5 on dashboard
  }, [notifications, user]);

  const getJoursRestants = (dateFin) => {
    const today = moment().startOf('day');
    const fin = moment(dateFin).endOf('day');
    return fin.diff(today, 'days');
  };

  const getUrgenceLevel = (joursRestants) => {
    if (joursRestants <= 0) return { color: 'red', level: 'Expiré', priority: 4, icon: <WarningOutlined /> };
    if (joursRestants <= 7) return { color: 'red', level: 'Critique', priority: 3, icon: <ExclamationCircleOutlined /> };
    if (joursRestants <= 15) return { color: 'orange', level: 'Urgent', priority: 2, icon: <ClockCircleOutlined /> };
    if (joursRestants <= 30) return { color: 'yellow', level: 'Attention', priority: 1, icon: <ClockCircleOutlined /> };
    return { color: 'blue', level: 'Normal', priority: 0, icon: <ClockCircleOutlined /> };
  };

  if (loading) {
    return (
      <Card title="Notifications d'expiration" style={{ height: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Notifications d'expiration">
        <Alert
          message="Erreur de chargement"
          description="Impossible de charger les notifications d'expiration."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <ExclamationCircleOutlined />
          Engagements expirants ({notifications.length})
        </Space>
      }
      extra={
        notifications.length > 0 && (
          <Button type="link" onClick={() => navigate('/engagements/expirants')}>
            Voir tout
          </Button>
        )
      }
      style={{ height: 'fit-content' }}
    >
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <ExclamationCircleOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
          <p>Aucun engagement expirant</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          {(criticalCount > 0 || urgentCount > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Space>
                {criticalCount > 0 && (
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>
                    {criticalCount} Critique{criticalCount > 1 ? 's' : ''}
                  </Tag>
                )}
                {urgentCount > 0 && (
                  <Tag color="orange" icon={<ClockCircleOutlined />}>
                    {urgentCount} Urgent{urgentCount > 1 ? 's' : ''}
                  </Tag>
                )}
              </Space>
            </div>
          )}

          {/* Notifications list */}
          <List
            dataSource={filteredNotifications}
            renderItem={(item) => {
              const joursRestants = getJoursRestants(item.date_fin);
              const urgence = getUrgenceLevel(joursRestants);

              return (
                <List.Item
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    backgroundColor: urgence.priority >= 3 ? '#fff2f0' : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                  onClick={() => navigate(`/engagements/${item.id}`)}
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/engagements/${item.id}`);
                      }}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor: urgence.color,
                          color: 'white'
                        }}
                        icon={urgence.icon}
                      />
                    }
                    title={
                      <div>
                        <span style={{ fontWeight: 500 }}>
                          Engagement {item.numero}
                        </span>
                        <Tag
                          color={urgence.color}
                          size="small"
                          style={{ marginLeft: 8 }}
                        >
                          {urgence.level}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {item.mise_a_disposition?.chantier} • {item.mise_a_disposition?.fournisseur_nom}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          Expire le {formatDate(item.date_fin)} • {joursRestants <= 0 ? 'Expiré' : `${joursRestants} jours restants`}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />

          {notifications.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button onClick={() => navigate('/engagements/expirants')}>
                Voir les {notifications.length - 5} autres notifications
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default NotificationPanel;