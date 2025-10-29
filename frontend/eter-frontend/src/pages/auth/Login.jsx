import React from 'react';
import { Form, Input, Button, Card, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const Login = () => {
  const { login, loading } = useAuthStore();
  const [error, setError] = React.useState(null);

  const onFinish = async (values) => {
    setError(null);
    const result = await login(values);
    
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card
        style={{ width: 400, textAlign: 'center' }}
        bodyStyle={{ padding: '24px' }}
        bordered={false}
      >
        {/* Logo */}
        <img 
          src="/eter-logo.png" 
          alt="ETER Logo" 
          style={{ 
            width: '120px', 
            marginBottom: '24px',
            borderRadius: '8px'
          }} 
        />

        <h2 style={{ marginBottom: '24px', color: '#333' }}>Connexion - Location Matériel</h2>

        {error && (
          <Alert
            message="Erreur de connexion"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Veuillez saisir votre nom d\'utilisateur!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Nom d'utilisateur" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Veuillez saisir votre mot de passe!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mot de passe"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              style={{ width: '100%' }}
              loading={loading}
            >
              Se connecter
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;