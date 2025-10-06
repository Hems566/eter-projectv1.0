import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate, formatNumber } from '../utils/formatters';

export class PointagePDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15;
  }

  generateFichePointage(ficheData) {
    // Créer un nouveau document PDF
    this.doc = new jsPDF('p', 'mm', 'a4');
    
    // Ajouter le contenu
    this.addHeader(ficheData);
    this.addFicheInfo(ficheData);
    this.addPointagesTable(ficheData);
    this.addSignatures();
    this.addFooter();

    return this.doc;
  }

  addHeader(ficheData) {
    const doc = this.doc;
    
    // Logo et en-tête (à ajuster selon votre logo)
    doc.setFontSize(10);
    doc.text('Établissement des Travaux de l\'Entretien Routier-ETER', this.margin, 20);
    doc.text('Direction des Travaux-DTx', this.margin, 25);
    
    // Logo ETER (si vous avez un logo)
    // doc.addImage(logoBase64, 'PNG', 160, 10, 30, 20);
    
    // Titre principal
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Fiche pointage du matériel de location', this.margin, 40);
    
    doc.setFont(undefined, 'normal');
  }

  addFicheInfo(ficheData) {
    const doc = this.doc;
    let yPosition = 50;
    
    // Informations de base dans un tableau
    const infoData = [
      ['Projet', ficheData.engagement?.chantier || '', 'Matériel', ficheData.materiel_type || ''],
      ['Chantier', ficheData.engagement?.numero || '', 'Fournisseur', ficheData.engagement?.fournisseur_nom || ''],
      ['Période', `${formatDate(ficheData.periode_debut)} au ${formatDate(ficheData.periode_fin)}`, 'Contact n°', ficheData.engagement?.telephone || ''],
      ['Immatriculation', ficheData.immatriculation || '', '', '']
    ];

    doc.autoTable({
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

    // En-têtes du tableau principal
    const headers = [
      ['Date', 'Compteur\nDébut', 'Compteur\nFin', 'Carb. (l)', 'Heur\nT', 'Heur\nA', 'Heur\nP', 'Observations', 'Signature\nConducteur']
    ];

    // Préparer les données des pointages
    const pointagesData = this.preparePointagesData(ficheData.pointages_journaliers || []);

    // Calculer les totaux
    const totals = this.calculateTotals(ficheData.pointages_journaliers || []);

    // Ajouter la ligne de total
    pointagesData.push([
      'Total',
      totals.compteur_debut || '',
      totals.compteur_fin || '',
      totals.carburant.toFixed(1),
      totals.heures_travail.toFixed(1),
      totals.heures_arret.toFixed(1),
      totals.heures_panne.toFixed(1),
      '',
      ''
    ]);

    doc.autoTable({
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
        0: { cellWidth: 18, halign: 'center' }, // Date
        1: { cellWidth: 15, halign: 'center' }, // Compteur début
        2: { cellWidth: 15, halign: 'center' }, // Compteur fin
        3: { cellWidth: 12, halign: 'center' }, // Carburant
        4: { cellWidth: 12, halign: 'center' }, // Heures T
        5: { cellWidth: 12, halign: 'center' }, // Heures A
        6: { cellWidth: 12, halign: 'center' }, // Heures P
        7: { cellWidth: 70, halign: 'left' },   // Observations
        8: { cellWidth: 25, halign: 'center' }  // Signature
      },
      didParseCell: function(data) {
        // Style spécial pour la ligne total
        if (data.row.index === pointagesData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
      margin: { left: this.margin, right: this.margin }
    });
  }

  preparePointagesData(pointages) {
    return pointages.map(pointage => [
      formatDate(pointage.date_pointage, 'DD/MM/YYYY'),
      pointage.compteur_debut || '',
      pointage.compteur_fin || '',
      formatNumber(pointage.consommation_carburant, 1),
      formatNumber(pointage.heures_travail, 1),
      formatNumber(pointage.heures_arret, 1),
      formatNumber(pointage.heures_panne, 1),
      this.truncateText(pointage.observations || '', 50),
      '' // Signature conducteur - espace vide
    ]);
  }

  calculateTotals(pointages) {
    return pointages.reduce((totals, pointage) => {
      totals.carburant += parseFloat(pointage.consommation_carburant || 0);
      totals.heures_travail += parseFloat(pointage.heures_travail || 0);
      totals.heures_arret += parseFloat(pointage.heures_arret || 0);
      totals.heures_panne += parseFloat(pointage.heures_panne || 0);
      
      // Pour les compteurs, on prend le premier début et le dernier fin
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

  addSignatures() {
    const doc = this.doc;
    const tableBottom = doc.lastAutoTable.finalY + 10;
    
    // Cadres pour les signatures
    const signatureHeight = 25;
    const signatureWidth = 60;
    
    // Signature Chef de projet
    doc.rect(this.margin, tableBottom, signatureWidth, signatureHeight);
    doc.text('Signature Chef de projet', this.margin + 2, tableBottom - 2);
    
    // Signature Loueur
    doc.rect(this.margin + signatureWidth + 5, tableBottom, signatureWidth, signatureHeight);
    doc.text('Signature Loueur', this.margin + signatureWidth + 7, tableBottom - 2);
    
    // Signature Directeur
    doc.rect(this.margin + (signatureWidth + 5) * 2, tableBottom, signatureWidth, signatureHeight);
    doc.text('Signature Directeur', this.margin + (signatureWidth + 5) * 2 + 2, tableBottom - 2);
  }

  addFooter() {
    const doc = this.doc;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(8);
    doc.text('Document généré automatiquement', this.margin, pageHeight - 10);
    doc.text(`Date de génération: ${formatDate(new Date())}`, this.pageWidth - 60, pageHeight - 10);
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Méthode pour sauvegarder le PDF
  save(filename) {
    return this.doc.save(filename);
  }

  // Méthode pour obtenir le blob du PDF
  output(type = 'blob') {
    return this.doc.output(type);
  }
}

// Fonction utilitaire pour générer et télécharger un PDF
export const generatePointagePDF = async (ficheData) => {
  try {
    const generator = new PointagePDFGenerator();
    const doc = generator.generateFichePointage(ficheData);
    
    const filename = `Fiche_Pointage_${ficheData.numero_fiche}_${formatDate(new Date(), 'YYYYMMDD')}.pdf`;
    generator.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour générer un PDF en base64 (pour envoi par email)
export const generatePointagePDFBase64 = async (ficheData) => {
  try {
    const generator = new PointagePDFGenerator();
    const doc = generator.generateFichePointage(ficheData);
    
    const pdfBase64 = doc.output('datauristring');
    return { success: true, data: pdfBase64 };
  } catch (error) {
    console.error('Erreur génération PDF Base64:', error);
    return { success: false, error: error.message };
  }
};