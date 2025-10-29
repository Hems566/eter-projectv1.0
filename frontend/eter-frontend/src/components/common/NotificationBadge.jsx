// components/common/NotificationBadge.jsx
import React, { useEffect } from 'react';
import { Badge, Dropdown, Button, List, Avatar, Space, Tag } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import moment from 'moment';
import { formatDate } from '../../utils/formatters';

const NotificationBadge = () => {
  const navigate = useNavigate();
  const {
    totalCount,
    criticalCount,
    urgentCount,
    notifications,
    loading,
    fetchNotifications
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Remove fetchNotifications from dependencies

  const getJoursRestants = (dateFin) => {
    const today = moment().startOf('day');
    const fin = moment(dateFin).endOf('day');
    return fin.diff(today, 'days');
  };

  const getUrgenceLevel = (joursRestants) => {
    if (joursRestants < 0) return { color: 'red', level: 'Expiré', priority: 4 };
    if (joursRestants <= 7) return { color: 'red', level: 'Critique', priority: 3 };
    if (joursRestants <= 15) return { color: 'orange', level: 'Urgent', priority: 2 };
    if (joursRestants <= 30) return { color: 'yellow', level: 'Attention', priority: 1 };
    return { color: 'blue', level: 'Normal', priority: 0 };
  };

  // Sort notifications by priority (critical first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    const joursA = getJoursRestants(a.date_fin);
    const joursB = getJoursRestants(b.date_fin);
    const urgenceA = getUrgenceLevel(joursA);
    const urgenceB = getUrgenceLevel(joursB);
    return urgenceB.priority - urgenceA.priority;
  });

  const notificationMenu = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <h4 style={{ margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          Notifications d'expiration
        </h4>
        {totalCount > 0 && (
          <div style={{ marginTop: 8 }}>
            <Space>
              {criticalCount > 0 && (
                <Tag color="red">{criticalCount} Critique</Tag>
              )}
              {urgentCount > 0 && (
                <Tag color="orange">{urgentCount} Urgent</Tag>
              )}
            </Space>
          </div>
        )}
      </div>

      {totalCount === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          Aucune notification
        </div>
      ) : (
        <List
          dataSource={sortedNotifications.slice(0, 10)}
          renderItem={(item) => {
            const joursRestants = getJoursRestants(item.date_fin);
            const urgence = getUrgenceLevel(joursRestants);

            return (
              <List.Item
                style={{
                  padding: '12px 24px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  backgroundColor: urgence.priority >= 3 ? '#fff2f0' : 'transparent'
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
                      icon={<ExclamationCircleOutlined />}
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
      )}

      {totalCount > 10 && (
        <div style={{ padding: '12px 24px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
          <Button
            type="link"
            onClick={() => navigate('/engagements/expirants')}
          >
            Voir toutes les notifications ({totalCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      overlay={notificationMenu}
      trigger={['click']}
      placement="bottomRight"
      arrow
    >
      <Badge
        count={totalCount}
        numberStyle={{
          backgroundColor: criticalCount > 0 ? '#ff4d4f' : urgentCount > 0 ? '#faad14' : '#1890ff'
        }}
        offset={[0, 6]}
      >
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '18px' }} />}
          loading={loading}
          style={{
            border: 'none',
            boxShadow: 'none',
            color: totalCount > 0 ? '#1890ff' : '#666'
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBadge;