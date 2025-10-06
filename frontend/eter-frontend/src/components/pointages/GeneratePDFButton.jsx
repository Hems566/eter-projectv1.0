// components/pointages/GeneratePDFButton.jsx
import React, { useState } from 'react';
import { Button, message, Dropdown, Menu, Modal } from 'antd';
import { 
  FilePdfOutlined, 
  DownloadOutlined, 
  MailOutlined,
  PrinterOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { 
  generatePointagePDF, 
  generatePointagePDFFromId,
  generatePointagePDFBase64 
} from '../../services/pdfGenerator';

const GeneratePDFButton = ({ 
  ficheId = null, 
  ficheData = null, 
  disabled = false,
  type = "default",
  size = "default"
}) => {
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleGeneratePDF = async (action = 'download') => {
    console.log('🔍 [Button] Action:', action);
    console.log('🔍 [Button] ficheId:', ficheId);
    console.log('🔍 [Button] ficheData:', ficheData);

    if (!ficheId && !ficheData) {
      message.error('Aucune donnée de fiche disponible');
      return;
    }

    setLoading(true);
    try {
      switch (action) {
        case 'download':
          let result;
          if (ficheId) {
            console.log('🔍 [Button] Génération via ID');
            result = await generatePointagePDFFromId(ficheId);
          } else {
            console.log('🔍 [Button] Génération via données');
            result = await generatePointagePDF(ficheData);
          }
          
          if (result.success) {
            message.success(`PDF généré: ${result.filename}`);
          } else {
            message.error(`Erreur: ${result.error}`);
          }
          break;

        case 'preview':
          await handlePreview();
          break;

        case 'print':
          await handlePrint();
          break;

        case 'email':
          message.info('Fonctionnalité d\'envoi par email à implémenter');
          break;

        default:
          if (ficheId) {
            await generatePointagePDFFromId(ficheId);
          } else {
            await generatePointagePDF(ficheData);
          }
      }
    } catch (error) {
      console.error('❌ [Button] Erreur:', error);
      message.error('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      let dataForPDF;
      if (ficheId) {
        // Utiliser l'API pour récupérer les données
        const { pointagesAPI } = await import('../../services/pointages');
        const response = await pointagesAPI.getFicheForPDF(ficheId);
        dataForPDF = response.data;
      } else {
        dataForPDF = ficheData;
      }

      const result = await generatePointagePDFBase64(dataForPDF);
      if (result.success) {
        setPreviewData(result.data);
        setPreviewVisible(true);
      } else {
        message.error('Erreur lors de la génération de l\'aperçu');
      }
    } catch (error) {
      console.error('❌ [Button] Erreur aperçu:', error);
      message.error('Erreur lors de la génération de l\'aperçu');
    }
  };

  const handlePrint = async () => {
    try {
      let dataForPDF;
      if (ficheId) {
        const { pointagesAPI } = await import('../../services/pointages');
        const response = await pointagesAPI.getFicheForPDF(ficheId);
        dataForPDF = response.data;
      } else {
        dataForPDF = ficheData;
      }

      const result = await generatePointagePDFBase64(dataForPDF);
      if (result.success) {
        // Ouvrir dans un nouvel onglet pour impression
        const printWindow = window.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Impression Fiche Pointage</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${result.data}"></iframe>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Déclencher l'impression après chargement
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } catch (error) {
      console.error('❌ [Button] Erreur impression:', error);
      message.error('Erreur lors de l\'impression');
    }
  };

  const menu = (
    <Menu onClick={({ key }) => handleGeneratePDF(key)}>
      <Menu.Item key="download" icon={<DownloadOutlined />}>
        Télécharger PDF
      </Menu.Item>
      <Menu.Item key="preview" icon={<EyeOutlined />}>
        Aperçu
      </Menu.Item>
      <Menu.Item key="print" icon={<PrinterOutlined />}>
        Imprimer
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="email" icon={<MailOutlined />}>
        Envoyer par email
      </Menu.Item>
    </Menu>
  );

  // Bouton simple pour action unique
  if (type === "simple") {
    return (
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        loading={loading}
        disabled={disabled}
        size={size}
        onClick={() => handleGeneratePDF('download')}
      >
        PDF
      </Button>
    );
  }

  // Bouton avec dropdown pour multiple actions
  return (
    <>
      <Dropdown overlay={menu} disabled={disabled || loading} trigger={['click']}>
        <Button
          type={type}
          icon={<FilePdfOutlined />}
          loading={loading}
          disabled={disabled}
          size={size}
        >
          Générer PDF
        </Button>
      </Dropdown>

      {/* Modal d'aperçu */}
      <Modal
        title="Aperçu de la fiche de pointage"
        visible={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewData(null);
        }}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Fermer
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => {
              handleGeneratePDF('download');
              setPreviewVisible(false);
            }}
          >
            Télécharger
          </Button>
        ]}
      >
        {previewData ? (
          <iframe
            src={previewData}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title="Aperçu PDF"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Chargement de l'aperçu...
          </div>
        )}
      </Modal>
    </>
  );
};

export default GeneratePDFButton;
