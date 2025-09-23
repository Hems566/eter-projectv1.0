import React, { useState, useMemo, useCallback } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  ToolOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { useMenuState } from '../../hooks/useMenuState'; 

const { Header, Sider, Content } = Layout;

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const {
    user,
    canCreateDL,
    canValidateDL,
    canCreateEngagement,
    canAccessResource
  } = usePermissions();

  // ✅ Utilisation du hook pour la gestion du menu
  const { openKeys, selectedKey, handleOpenChange } = useMenuState();
  
  // ✅ État local pour le collapse
  const [collapsed, setCollapsed] = useState(false);

  // ✅ Handler memoized pour la navigation
  const handleMenuClick = useCallback(({ key }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  }, [navigate]);

  // ✅ Handler memoized pour le collapse
  const handleCollapse = useCallback((collapsed) => {
    setCollapsed(collapsed);
  }, []);

  // ✅ Menu items memoized
  const menuItems = useMemo(() => {
    const items = [
      {
        key: '/',
        icon: <HomeOutlined />,
        label: 'Accueil',
      }
    ];

    // Demandes de location
    if (canAccessResource('demandes')) {
      const demandesChildren = [
        {
          key: '/demandes',
          label: 'Liste des demandes',
        }
      ];

      if (canCreateDL) {
        demandesChildren.push({
          key: '/demandes/create',
          label: 'Nouvelle demande',
        });
      }

      if (canValidateDL) {
        demandesChildren.push({
          key: '/demandes/en-attente-validation',
          label: 'En attente validation',
        });
      }

      items.push({
        key: 'demandes',
        icon: <FileTextOutlined />,
        label: 'Demandes de location',
        children: demandesChildren
      });
    }

    // Mises à disposition
    if (canAccessResource('mises-a-disposition')) {
      const madChildren = [
        {
          key: '/mises-a-disposition',
          label: 'Liste des MAD',
        }
      ];

      if (canAccessResource('mises-a-disposition', 'create')) {
        madChildren.push({
          key: '/mises-a-disposition/create',
          label: 'Nouvelle MAD',
        });
      }

      items.push({
        key: 'mises-a-disposition',
        icon: <ToolOutlined />,
        label: 'Mises à disposition',
        children: madChildren
      });
    }

    // Engagements
    if (canAccessResource('engagements')) {
      const engagementsChildren = [
        {
          key: '/engagements',
          label: 'Liste des engagements',
        }
      ];

      if (canCreateEngagement) {
        engagementsChildren.push({
          key: '/engagements/create',
          label: 'Nouvel engagement',
        });
      }

      items.push({
        key: 'engagements',
        icon: <FileTextOutlined />,
        label: 'Engagements',
        children: engagementsChildren
      });
    }

    // Pointages
    if (canAccessResource('pointages')) {
      const pointagesChildren = [
        {
          key: '/pointages/fiches',
          label: 'Fiches de pointage',
        },
        {
          key: '/pointages/fiches/create',
          label: 'Nouvelle fiche',
        },
        {
          key: '/pointages/journaliers/create',
          label: 'Nouveau pointage',
        }
      ];

      if (canAccessResource('pointages', 'create')) {
        pointagesChildren.push({
          key: '/pointages/rapports',
          label: 'Rapports',
        });
      }

      items.push({
        key: 'pointages',
        icon: <BarChartOutlined />,
        label: 'Pointages',
        children: pointagesChildren
      });
    }

    // Fournisseurs
    if (canAccessResource('fournisseurs')) {
      items.push({
        key: '/fournisseurs',
        icon: <UserOutlined />,
        label: 'Fournisseurs',
      });
    }

    // Matériels
    if (canAccessResource('materiels')) {
      items.push({
        key: '/materiels',
        icon: <ToolOutlined />,
        label: 'Matériels',
      });
    }

    // Administration
    if (canValidateDL) {
      items.push({
        key: 'admin',
        icon: <SettingOutlined />,
        label: 'Administration',
        children: [
          {
            key: '/admin/users',
            label: 'Utilisateurs',
          },
          {
            key: '/admin/statistiques',
            label: 'Statistiques',
          },
        ]
      });
    }

    return items;
  }, [canAccessResource, canCreateDL, canValidateDL, canCreateEngagement]);

  // ✅ Menu utilisateur memoized
  const userMenu = useMemo(() => (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <span>{user?.full_name}</span>
        <br />
        <small style={{ color: '#666' }}>
          {user?.role} - {user?.departement}
        </small>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={logout}>
        Déconnexion
      </Menu.Item>
    </Menu>
  ), [user, logout]);

  // ✅ Styles memoized
  const siderStyle = useMemo(() => ({
    overflow: 'auto',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1001,
  }), []);

  const headerStyle = useMemo(() => ({
    background: '#fff',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f0f0f0',
    position: 'fixed',
    top: 0,
    right: 0,
    left: collapsed ? 80 : 250,
    zIndex: 1000,
    transition: 'left 0.2s',
  }), [collapsed]);

  const layoutStyle = useMemo(() => ({
    marginLeft: collapsed ? 80 : 250,
    transition: 'margin-left 0.2s',
  }), [collapsed]);

  const contentStyle = useMemo(() => ({
    padding: 24,
    marginTop: 64,
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: '#f0f2f5',
  }), []);

  const logoStyle = useMemo(() => ({
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #303030'
  }), []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ✅ Sidebar fixe */}
      <Sider 
        theme="dark" 
        width={250}
        collapsible
        collapsed={collapsed}
        onCollapse={handleCollapse}
        style={siderStyle}
      >
        <div style={logoStyle}>
          <h3 style={{ color: 'white', margin: 0 }}>
            {collapsed ? 'ETER' : 'ETER'}
          </h3>
        </div>
        
        {/* ✅ Menu utilisant le hook */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]} // ✅ Depuis le hook
          openKeys={openKeys}         // ✅ Depuis le hook
          onOpenChange={handleOpenChange} // ✅ Depuis le hook
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      {/* ✅ Layout principal */}
      <Layout style={layoutStyle}>
        {/* ✅ Header fixe */}
        <Header style={headerStyle}>
          <h2 style={{ margin: 0 }}>Gestion des Locations</h2>
          
          <Dropdown overlay={userMenu} trigger={['click']} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.first_name} {user?.last_name}</span>
            </Space>
          </Dropdown>
        </Header>
        
        {/* ✅ Contenu */}
        <Content style={contentStyle}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

// ✅ Memo pour éviter les re-renders inutiles
export default React.memo(AppLayout);
