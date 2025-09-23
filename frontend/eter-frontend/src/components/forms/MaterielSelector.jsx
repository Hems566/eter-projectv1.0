import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  InputNumber, 
  Input, 
  Space, 
  Tag, 
  Modal,
  message,
  Row,
  Col,
  Card,
  Statistic,
  Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { materielsAPI } from '../../services/materiels'; // ✅ Utiliser le nouveau service

const { TextArea } = Input;

const MaterielSelector = ({ selectedMateriels, onMaterielsChange, duree }) => {
  const [availableMateriels, setAvailableMateriels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [error, setError] = useState(null); // ✅ Ajouter gestion d'erreur
  const [tempMateriel, setTempMateriel] = useState({
    quantite: 1,
    observations: ''
  });

  useEffect(() => {
    loadMateriels();
  }, []);

  const loadMateriels = async () => {
    setLoading(true);
    setError(null); // ✅ Reset erreur
    try {
      console.log('Chargement des matériels...'); // ✅ Debug
      const response = await materielsAPI.list(); // ✅ Utiliser le nouveau service
      console.log('Matériels reçus:', response.data); // ✅ Debug
      
      // ✅ Gérer les différents formats de réponse
      const materiels = response.data.results || response.data || [];
      setAvailableMateriels(materiels.filter(mat => mat.actif));
    } catch (error) {
      console.error('Erreur chargement matériels:', error); // ✅ Debug
      setError('Erreur lors du chargement des matériels');
      message.error('Erreur lors du chargement des matériels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMateriel = (materiel) => {
    // Vérifier si le matériel n'est pas déjà sélectionné
    const alreadySelected = selectedMateriels.find(m => m.id === materiel.id);
    if (alreadySelected) {
      message.warning('Ce matériel est déjà sélectionné');
      return;
    }

    setTempMateriel({
      ...materiel,
      quantite: 1,
      observations: ''
    });
    setEditingIndex(-1);
    setModalVisible(true);
  };

  const handleEditMateriel = (index) => {
    setTempMateriel(selectedMateriels[index]);
    setEditingIndex(index);
    setModalVisible(true);
  };

  const handleSaveMateriel = () => {
    if (!tempMateriel.quantite || tempMateriel.quantite < 1) {
      message.error('La quantité doit être au moins 1');
      return;
    }

    const newMateriels = [...selectedMateriels];
    
    if (editingIndex >= 0) {
      // Modification
      newMateriels[editingIndex] = tempMateriel;
    } else {
      // Ajout
      newMateriels.push(tempMateriel);
    }

    onMaterielsChange(newMateriels);
    setModalVisible(false);
    message.success(editingIndex >= 0 ? 'Matériel modifié' : 'Matériel ajouté');
  };

  const handleRemoveMateriel = (index) => {
    const newMateriels = selectedMateriels.filter((_, i) => i !== index);
    onMaterielsChange(newMateriels);
    message.success('Matériel retiré');
  };

  const calculateTotal = () => {
    return selectedMateriels.reduce((total, mat) => {
      const jours = duree * 30;
      let montant = 0;
      
      if (mat.type_facturation === 'PAR_JOUR') {
        montant = mat.prix_unitaire_mru * mat.quantite * jours;
      } else if (mat.type_facturation === 'PAR_HEURE') {
        // Estimation 8h/jour
        montant = mat.prix_unitaire_mru * mat.quantite * jours * 8;
      } else {
        montant = mat.prix_unitaire_mru * mat.quantite;
      }
      
      return total + montant;
    }, 0);
  };

  const availableColumns = [
    {
      title: 'Type de matériel',
      dataIndex: 'type_materiel',
      key: 'type_materiel',
    },
    {
      title: 'Type facturation',
      dataIndex: 'type_facturation',
      key: 'type_facturation',
      render: (type) => {
        const colors = {
          'PAR_JOUR': 'blue',
          'PAR_HEURE': 'green',
          'FORFAITAIRE': 'orange'
        };
        const labels = {
          'PAR_JOUR': 'Par jour',
          'PAR_HEURE': 'Par heure',
          'FORFAITAIRE': 'Forfaitaire'
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      }
    },
    {
      title: 'Prix unitaire (MRU)',
      dataIndex: 'prix_unitaire_mru',
      key: 'prix_unitaire_mru',
      align: 'right',
      render: (prix) => prix?.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) || '0,000',
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => handleAddMateriel(record)}
          disabled={selectedMateriels.some(m => m.id === record.id)}
        >
          Ajouter
        </Button>
      ),
    },
  ];

  const selectedColumns = [
    {
      title: 'Type de matériel',
      dataIndex: 'type_materiel',
      key: 'type_materiel',
    },
    {
      title: 'Quantité',
      dataIndex: 'quantite',
      key: 'quantite',
      width: 80,
      align: 'center',
    },
    {
      title: 'Prix unitaire',
      dataIndex: 'prix_unitaire_mru',
      key: 'prix_unitaire_mru',
      width: 120,
      align: 'right',
      render: (prix) => prix?.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) || '0,000',
    },
    {
      title: 'Sous-total (MRU)',
      key: 'sous_total',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const jours = duree * 30;
        let montant = 0;
        
        if (record.type_facturation === 'PAR_JOUR') {
          montant = record.prix_unitaire_mru * record.quantite * jours;
        } else if (record.type_facturation === 'PAR_HEURE') {
          montant = record.prix_unitaire_mru * record.quantite * jours * 8;
        } else {
          montant = record.prix_unitaire_mru * record.quantite;
        }
        
        return montant.toLocaleString('fr-FR', { minimumFractionDigits: 3 });
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record, index) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditMateriel(index)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleRemoveMateriel(index)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ✅ Afficher les erreurs */}
      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={loadMateriels}>
              Réessayer
            </Button>
          }
        />
      )}

      {/* Matériels sélectionnés */}
      {selectedMateriels.length > 0 && (
        <Card 
          title={`Matériels sélectionnés (${selectedMateriels.length})`}
          style={{ marginBottom: 24 }}
          extra={
            <Statistic
              title="Total estimé"
              value={calculateTotal()}
              suffix="MRU"
              precision={3}
              valueStyle={{ color: '#3f8600' }}
            />
          }
        >
          <Table
            columns={selectedColumns}
            dataSource={selectedMateriels}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* Matériels disponibles */}
      <Card 
        title="Matériels disponibles"
        extra={
          <Button onClick={loadMateriels} loading={loading}>
            Actualiser
          </Button>
        }
      >
        {/* ✅ Message si pas de matériels */}
        {!loading && availableMateriels.length === 0 && !error && (
          <Alert
            message="Aucun matériel disponible"
            description="Aucun matériel actif n'est disponible à la location pour le moment."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={availableColumns}
          dataSource={availableMateriels}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `${total} matériel(s) disponible(s)`,
          }}
        />
      </Card>

      {/* Modal d'ajout/modification */}
      <Modal
        title={editingIndex >= 0 ? 'Modifier le matériel' : 'Ajouter un matériel'}
        open={modalVisible}
        onOk={handleSaveMateriel}
        onCancel={() => setModalVisible(false)}
        okText="Confirmer"
        cancelText="Annuler"
      >
        {tempMateriel && (
          <div>
            <h4>{tempMateriel.type_materiel}</h4>
            <p>
              <Tag color="blue">{tempMateriel.type_facturation}</Tag>
              Prix: {tempMateriel.prix_unitaire_mru?.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} MRU
            </p>

            <Row gutter={16}>
              <Col span={12}>
                <label>Quantité :</label>
                <InputNumber
                  min={1}
                  value={tempMateriel.quantite}
                  onChange={(value) => setTempMateriel(prev => ({ ...prev, quantite: value }))}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </Col>
              <Col span={12}>
                <label>Estimation sous-total :</label>
                <div style={{ 
                  marginTop: 8, 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: '#1890ff'
                }}>
                  {(() => {
                    const jours = duree * 30;
                    let montant = 0;
                    
                    if (tempMateriel.type_facturation === 'PAR_JOUR') {
                      montant = tempMateriel.prix_unitaire_mru * tempMateriel.quantite * jours;
                    } else if (tempMateriel.type_facturation === 'PAR_HEURE') {
                      montant = tempMateriel.prix_unitaire_mru * tempMateriel.quantite * jours * 8;
                    } else {
                      montant = tempMateriel.prix_unitaire_mru * tempMateriel.quantite;
                    }
                    
                    return montant.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' MRU';
                  })()}
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <label>Observations :</label>
              <TextArea
                rows={3}
                value={tempMateriel.observations}
                onChange={(e) => setTempMateriel(prev => ({ ...prev, observations: e.target.value }))}
                placeholder="Spécifications particulières, remarques..."
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MaterielSelector;
