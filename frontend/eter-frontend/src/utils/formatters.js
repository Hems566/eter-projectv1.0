export const formatCurrency = (value) => {
  if (!value) return '0,000';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
};

export const getStatusColor = (status) => {
  const colors = {
    'BROUILLON': 'default',
    'SOUMISE': 'processing',
    'VALIDEE': 'success',
    'REJETEE': 'error',
    'MISE_A_DISPOSITION': 'blue',
    'ENGAGEMENT_CREE': 'purple',
  };
  return colors[status] || 'default';
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('fr-FR');
};

export const formatNumber = (value, decimals = 2) => {
  const numValue = parseFloat(value);
  return !isNaN(numValue) ? numValue.toFixed(decimals) : '0.00';
};

export const formatNumberSafe = (value) => {
  const numValue = parseFloat(value);
  return !isNaN(numValue) ? numValue : 0;
};
