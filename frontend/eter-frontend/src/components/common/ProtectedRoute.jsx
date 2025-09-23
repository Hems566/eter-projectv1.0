import React from 'react';
import { Card, Result, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

const ProtectedRoute = ({ 
  children, 
  resource, 
  action = 'read', 
  fallback = null,
  redirectTo = '/' 
}) => {
  const navigate = useNavigate();
  const { canAccessResource, user } = usePermissions();

  // Si pas connecté
  if (!user) {
    return (
      <Card>
        <Result
          status="403"
          title="Accès refusé"
          subTitle="Vous devez être connecté pour accéder à cette page."
          extra={
            <Button type="primary" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
          }
        />
      </Card>
    );
  }

  // Si pas les permissions
  if (!canAccessResource(resource, action)) {
    if (fallback) {
      return fallback;
    }

    return (
      <Card>
        <Result
          status="403"
          title="Accès refusé"
          subTitle="Vous n'avez pas les permissions nécessaires pour accéder à cette page."
          icon={<ExclamationCircleOutlined />}
          extra={
            <Button type="primary" onClick={() => navigate(redirectTo)}>
              Retour à l'accueil
            </Button>
          }
        />
      </Card>
    );
  }

  return children;
};

export default ProtectedRoute;
