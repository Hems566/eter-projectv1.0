import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatNumber } from '../utils/formatters';
import { pointagesAPI } from './pointages';

// Logo ETER en base64 (PNG) — vous pouvez le remplacer par un chemin si nécessaire
const LOGO_ETER_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // Placeholder logo

export class PointagePDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15;
  }

  generateFichePointage(ficheData) {
    console.log('🔍 [PDF] Génération PDF avec les données:', ficheData);

    // Créer un nouveau document PDF
    this.doc = new jsPDF('p', 'mm', 'a4');

    // Ajouter le contenu
    this.addHeader(ficheData);
    this.addFicheInfo(ficheData);
    this.addPointagesTable(ficheData);
    this.addFooterWithSignatures();

    return this.doc;
  }

  addHeader(ficheData) {
    const doc = this.doc;

    // En-tête ETER
    doc.setFontSize(10);
    doc.text('Établissement des Travaux de l\'Entretien Routier-ETER', this.margin, 20);
    doc.text('Direction des Travaux-DTx', this.margin, 25);

    // Titre principal
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Fiche pointage du matériel de location', this.margin, 40);

    doc.setFont(undefined, 'normal');

    // Ajouter le logo ETER en haut à droite
    try {
    doc.addImage(
      LOGO_ETER_BASE64,
      'PNG',
      160,   // x
      10,    // y
      35,    // largeur
      20     // hauteur
    );
      } catch (error) {
        console.warn('⚠️ Impossible d’ajouter le logo ETER au PDF:', error);
      }
  }

  addFicheInfo(ficheData) {
    const doc = this.doc;
    let yPosition = 50;

    const fiche = ficheData.fiche || ficheData;
    const engagement = ficheData.engagement || ficheData.engagement || {};

    console.log('🔍 [PDF] Données fiche:', fiche);
    console.log('🔍 [PDF] Données engagement:', engagement);

    const infoData = [
      [
        'Projet',
        engagement.chantier || fiche.chantier || '',
        'Matériel',
        fiche.materiel_type || ficheData.materiel_type || ''
      ],
      [
        'Chantier',
        engagement.numero || fiche.engagement_numero || '',
        'Fournisseur',
        engagement.fournisseur_nom || fiche.fournisseur_nom || ''
      ],
      [
        'Période',
        `${formatDate(fiche.periode_debut || ficheData.periode_debut)} au ${formatDate(fiche.periode_fin || ficheData.periode_fin)}`,
        'Contact n°',
        engagement.fournisseur_telephone || fiche.telephone || ''
      ],
      [
        'Immatriculation',
        fiche.immatriculation || ficheData.immatriculation || '',
        '',
        ''
      ]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: infoData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        2: { fontStyle: 'bold', fillColor: [240, 240, 240] }
      },
      margin: { left: this.margin, right: this.margin }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  addPointagesTable(ficheData) {
    const doc = this.doc;
    const startY = 85;

    let pointages = [];
    if (ficheData.pointages_journaliers) {
      pointages = ficheData.pointages_journaliers;
    } else if (ficheData.pointages) {
      pointages = ficheData.pointages;
    } else if (Array.isArray(ficheData)) {
      pointages = ficheData;
    }

    console.log('🔍 [PDF] Pointages trouvés:', pointages);

    const headers = [
      ['Date', 'Compteur\nDébut', 'Compteur\nFin', 'Carb. (l)', 'Heur\nT', 'Heur\nA', 'Heur\nP', 'Observations', 'Signature\nConducteur']
    ];

    const pointagesData = this.preparePointagesData(pointages || []);
    console.log('🔍 [PDF] Données préparées:', pointagesData);

    const totals = ficheData.totaux || this.calculateTotals(pointages || []);
    console.log('🔍 [PDF] Totaux:', totals);

    const totalRow = [
      'Total',
      '',
      '',
      (totals.total_carburant || totals.carburant || 0).toFixed(1),
      (totals.total_heures_travail || totals.heures_travail || 0).toFixed(1),
      (totals.total_heures_arret || totals.heures_arret || 0).toFixed(1),
      (totals.total_heures_panne || totals.heures_panne || 0).toFixed(1),
      '',
      ''
    ];

    pointagesData.push(totalRow);

    if (pointagesData.length === 1) {
      for (let i = 0; i < 5; i++) {
        pointagesData.splice(-1, 0, ['', '', '', '', '', '', '', '', '']);
      }
    }

    autoTable(doc, {
      startY: startY,
      head: headers,
      body: pointagesData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 70, halign: 'left' },
        8: { cellWidth: 25, halign: 'center' } 
      },
      didParseCell: (data) => {
        if (data.row.index === pointagesData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      margin: { left: this.margin, right: this.margin }
    });
  }

  preparePointagesData(pointages) {
    if (!pointages || !Array.isArray(pointages) || pointages.length === 0) {
      console.log('🔍 [PDF] Aucun pointage à traiter');
      return [];
    }

    const prepared = pointages.map((pointage) => {
      let obs = pointage.observations || '';

      if (pointage.a_change_de_chantier) {
        const chantier = pointage.chantier_effectif || 'nouveau chantier';
        const mention = `Changement de chantier → ${chantier}`;
        obs = obs ? `${mention} | ${obs}` : mention;
      }

      return [
        formatDate(pointage.date_pointage, 'DD/MM/YYYY'),
        pointage.compteur_debut?.toString() || '',
        pointage.compteur_fin?.toString() || '',
        formatNumber(pointage.consommation_carburant, 1),
        formatNumber(pointage.heures_travail, 1),
        formatNumber(pointage.heures_arret, 1),
        formatNumber(pointage.heures_panne, 1),
        this.truncateText(obs, 60),
        ''
      ];
    });

    console.log('🔍 [PDF] Données préparées finales:', prepared);
    return prepared;
  }

  calculateTotals(pointages) {
    if (!pointages || !Array.isArray(pointages)) {
      return {
        carburant: 0,
        heures_travail: 0,
        heures_arret: 0,
        heures_panne: 0,
        compteur_debut: null,
        compteur_fin: null
      };
    }

    return pointages.reduce((totals, pointage) => {
      totals.carburant += parseFloat(pointage.consommation_carburant || 0);
      totals.heures_travail += parseFloat(pointage.heures_travail || 0);
      totals.heures_arret += parseFloat(pointage.heures_arret || 0);
      totals.heures_panne += parseFloat(pointage.heures_panne || 0);

      if (!totals.compteur_debut && pointage.compteur_debut) {
        totals.compteur_debut = pointage.compteur_debut;
      }
      if (pointage.compteur_fin) {
        totals.compteur_fin = pointage.compteur_fin;
      }

      return totals;
    }, {
      carburant: 0,
      heures_travail: 0,
      heures_arret: 0,
      heures_panne: 0,
      compteur_debut: null,
      compteur_fin: null
    });
  }

  addFooterWithSignatures() {
    const doc = this.doc;
    const pageHeight = doc.internal.pageSize.height;
    const signatureY = pageHeight - 30;
    const signatureWidth = 60;

    doc.setFontSize(9);
    doc.text('Signature Chef de projet', this.margin, signatureY);
    doc.text('Signature Loueur', this.margin + signatureWidth + 5, signatureY);
    doc.text('Signature Directeur', this.margin + (signatureWidth + 5) * 2, signatureY);

    doc.setFontSize(8);
    doc.text(`Date de génération: ${formatDate(new Date())}`, this.pageWidth - 60, pageHeight - 10);
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }

  save(filename) {
    return this.doc.save(filename);
  }

  output(type = 'blob') {
    return this.doc.output(type);
  }
}

// Fonctions d'export inchangées
export const generatePointagePDFFromId = async (ficheId) => {
  try {
    console.log('🔍 [PDF] Récupération des données pour fiche ID:', ficheId);
    const response = await pointagesAPI.getFicheForPDF(ficheId);
    const ficheData = response.data;
    console.log('🔍 [PDF] Données reçues de l\'API:', ficheData);

    const generator = new PointagePDFGenerator();
    const doc = generator.generateFichePointage(ficheData);

    const filename = `Fiche_Pointage_${ficheData.fiche?.numero_fiche || ficheData.numero_fiche || 'Sans_Numero'}_${formatDate(new Date(), 'YYYYMMDD')}.pdf`;
    generator.save(filename);

    return { success: true, filename };
  } catch (error) {
    console.error('❌ [PDF] Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
};

export const generatePointagePDF = async (ficheData) => {
  try {
    console.log('🔍 [PDF] Génération PDF avec données directes:', ficheData);
    const generator = new PointagePDFGenerator();
    const doc = generator.generateFichePointage(ficheData);
    const filename = `Fiche_Pointage_${ficheData.numero_fiche || 'Sans_Numero'}_${formatDate(new Date(), 'YYYYMMDD')}.pdf`;
    generator.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('❌ [PDF] Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
};

export const generatePointagePDFBase64 = async (ficheData) => {
  try {
    const generator = new PointagePDFGenerator();
    const doc = generator.generateFichePointage(ficheData);
    const pdfBase64 = doc.output('datauristring');
    return { success: true, data: pdfBase64 };
  } catch (error) {
    console.error('❌ [PDF] Erreur génération PDF Base64:', error);
    return { success: false, error: error.message };
  }
};
