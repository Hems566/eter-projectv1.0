import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const ROOT_SUBMENU_KEYS = ['demandes', 'mises-a-disposition', 'engagements', 'pointages', 'admin'];

const getOpenKeysFromPath = (path) => {
  if (path.startsWith('/demandes')) return ['demandes'];
  if (path.startsWith('/mises-a-disposition')) return ['mises-a-disposition'];
  if (path.startsWith('/engagements')) return ['engagements'];
  if (path.startsWith('/pointages')) return ['pointages'];
  if (path.startsWith('/admin')) return ['admin'];
  return [];
};

export const useMenuState = () => {
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState(() => getOpenKeysFromPath(location.pathname));

  // ✅ Synchronisation optimisée avec l'URL
  useEffect(() => {
    const keysFromPath = getOpenKeysFromPath(location.pathname);
    setOpenKeys(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(keysFromPath)) {
        return keysFromPath;
      }
      return prev;
    });
  }, [location.pathname]);

  // ✅ Handler memoized pour l'ouverture exclusive
  const handleOpenChange = useCallback((keys) => {
    const latestOpenKey = keys.find(key => !openKeys.includes(key));
    
    if (ROOT_SUBMENU_KEYS.includes(latestOpenKey)) {
      setOpenKeys([latestOpenKey]);
    } else {
      setOpenKeys([]);
    }
  }, [openKeys]);

  // ✅ Clé sélectionnée memoized
  const selectedKey = useMemo(() => location.pathname, [location.pathname]);

  return {
    openKeys,
    selectedKey,
    handleOpenChange
  };
};
