// components/common/ChantierInput.jsx
import React, { useState, useEffect } from 'react';
import { Input, Tag, Spin } from 'antd';
import { pointagesAPI } from '../../services/pointages';

const ChantierInput = ({ 
  value, 
  onChange, 
  ficheId, 
  chantierPrincipal,
  placeholder,
  disabled = false,
  style = {}
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  // Charger les chantiers utilisés dans cette fiche
  useEffect(() => {
    if (ficheId) {
      loadChantiersSuggestions();
    }
  }, [ficheId]);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const loadChantiersSuggestions = async () => {
    try {
      setLoading(true);
      const response = await pointagesAPI.getChantiersUtilises(ficheId);
      const chantiers = response.data.chantiers_utilises || [];
      setSuggestions(chantiers);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
      // En cas d'erreur, utiliser au moins le chantier principal
      if (chantierPrincipal) {
        setSuggestions([chantierPrincipal]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };

  const selectSuggestion = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Délai pour permettre le clic sur les suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', ...style }}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || `Par défaut: ${chantierPrincipal || 'Chantier principal'}`}
        disabled={disabled}
        suffix={loading && <Spin size="small" />}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              <span>{suggestion}</span>
              {suggestion === chantierPrincipal && (
                <Tag size="small" color="blue">
                  Principal
                </Tag>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChantierInput;
