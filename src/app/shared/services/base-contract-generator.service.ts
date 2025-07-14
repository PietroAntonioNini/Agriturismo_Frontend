import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { BaseContractData } from '../models/lease.model';
import { Tenant } from '../models/tenant.model';
import { Apartment } from '../models/apartment.model';
import { ContractGeneratorService } from './contract-generator.service';

@Injectable({
  providedIn: 'root'
})
export class BaseContractGeneratorService {
  
  constructor(private contractGenerator: ContractGeneratorService) {}

  /**
   * Genera un contratto base con letture utenze e descrizione appartamento
   * Basato sul documento di consegna appartamento
   */
  generateBaseContract(contractData: BaseContractData): void {
    const doc = new jsPDF();
    let yPos = 20;

    // Configurazione PDF
    doc.setProperties({
      title: `Contratto Base - ${contractData.tenant.lastName} - ${contractData.apartment.name}`,
      subject: 'Documento di Consegna Appartamento',
      author: 'Sistema Gestione Immobili',
      keywords: 'contratto, locazione, consegna, utenze',
      creator: 'PropertyManager App'
    });

    // Header del documento
    yPos = this.addDocumentHeader(doc, yPos);
    
    // Informazioni tenant e apartment
    yPos = this.addPartyInformation(doc, contractData, yPos);
    
    // Descrizione dell'appartamento
    yPos = this.addPropertyDescription(doc, contractData, yPos);
    
    // Condizioni dell'appartamento
    yPos = this.addPropertyCondition(doc, contractData, yPos);
    
    // Condizioni della caldaia
    yPos = this.addBoilerCondition(doc, contractData, yPos);
    
    // Letture delle forniture
    yPos = this.addUtilityReadings(doc, contractData, yPos);
    
    // Caparra e condizioni
    yPos = this.addSecurityDeposit(doc, contractData, yPos);
    
    // Dichiarazione di accettazione
    yPos = this.addAcceptanceDeclaration(doc, yPos);
    
    // Firme
    this.addSignatures(doc, yPos);

    // Salva il PDF
    const filename = this.generateBaseContractFilename(contractData);
    doc.save(filename);
  }

  /**
   * Aggiunge l'intestazione del documento
   */
  private addDocumentHeader(doc: jsPDF, startY: number): number {
    let yPos = startY;
    
    // Data in alto a destra con formattazione migliore
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const today = new Date();
    const dateString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    doc.text(`Data: ${dateString}`, 150, yPos);
    yPos += 30;
    
    // Titolo del documento professionale
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRATTO DI LOCAZIONE', 105, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('DOCUMENTO DI CONSEGNA APPARTAMENTO', 105, yPos, { align: 'center' });
    
    doc.setFontSize(12);
    yPos += 25;
    
    // Linea separatrice
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 195, yPos);
    yPos += 15;
    
    return yPos;
  }

  /**
   * Aggiunge le informazioni delle parti (tenant e apartment)
   */
  private addPartyInformation(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    // Informazioni inquilino
    doc.setFont('helvetica', 'bold');
    doc.text('CONDUTTORE (Inquilino):', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    
    doc.text(`${contractData.tenant.firstName} ${contractData.tenant.lastName}`, 20, yPos);
    yPos += 6;
    
    if (contractData.tenant.email || contractData.tenant.phone) {
      const contact = `${contractData.tenant.email || ''} ${contractData.tenant.phone ? '- Tel: ' + contractData.tenant.phone : ''}`.trim();
      doc.text(contact, 20, yPos);
      yPos += 6;
    }
    
    if (contractData.tenant.documentType && contractData.tenant.documentNumber) {
      doc.text(`${contractData.tenant.documentType} n° ${contractData.tenant.documentNumber}`, 20, yPos);
      yPos += 6;
    }
    
    yPos += 10;
    
    // Informazioni appartamento
    doc.setFont('helvetica', 'bold');
    doc.text('IMMOBILE:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    
    doc.text(`Appartamento: ${contractData.apartment.name}`, 20, yPos);
    yPos += 6;
    
    const apartmentDetails = `${contractData.apartment.rooms} vani, ${contractData.apartment.bathrooms} bagni, ${contractData.apartment.squareMeters}mq`;
    doc.text(apartmentDetails, 20, yPos);
    yPos += 6;
    
    if (contractData.apartment.floor !== undefined) {
      doc.text(`Piano: ${contractData.apartment.floor}`, 20, yPos);
      yPos += 6;
    }
    
    yPos += 15;
    
    return yPos;
  }

  /**
   * Aggiunge la descrizione dettagliata dell'appartamento
   */
  private addPropertyDescription(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    // Intestazione sezione con stile professionale
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DESCRIZIONE DELL\'APPARTAMENTO', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    yPos += 12;
    
    doc.text('Il proprietario fornisce l\'appartamento così descritto:', 15, yPos);
    yPos += 15;
    
    // Descrizione dettagliata dell'appartamento
    const apartment = contractData.apartment;
    
    // Suddividi la descrizione in punti numerati come nell'immagine
    const descriptionPoints = [
      `1) Cucina perfettamente funzionante elettrodomestici funzionanti, in perfetto stato,`,
      `   tavolo con ${apartment.rooms > 2 ? '4' : '2'} sedie, divano, mobiletto tv, camino.`,
      ``,
      `2) Camera con letto matrimoniale, rete doghe, materasso, coprimaterasso, armadio,`,
      `   2 comodini, 2 abatjour, cassettone con specchio, tutto in ottimo stato.`,
      ``,
      `3) Bagno con doccia, sanitari accessori in perfetto stato.`,
      ``,
      `4) Condizioni dell'appartamento al momento della consegna.`,
      ``,
      `5) Condizioni della caldaia di riscaldamento in perfetto stato di funzionamento.`
    ];
    
    descriptionPoints.forEach(point => {
      if (point.trim() !== '') {
        const lines = doc.splitTextToSize(point, 175);
        lines.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 6;
        });
      } else {
        yPos += 3;
      }
    });
    
    yPos += 15;
    
    // Sezione letture forniture
    doc.setFont('helvetica', 'bold');
    doc.text('Letture delle forniture relative alla consegna dell\'appartamento.', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 20;
    
    return yPos;
  }

  /**
   * Aggiunge le condizioni dell'appartamento
   */
  private addPropertyCondition(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    const condition = contractData.propertyCondition || 'Ottimo stato generale';
    doc.text(`Condizioni generali dell'appartamento: ${condition}`, 15, yPos);
    yPos += 15;
    
    return yPos;
  }

  /**
   * Aggiunge le condizioni della caldaia
   */
  private addBoilerCondition(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    const boilerCondition = contractData.boilerCondition || 'Perfetto stato di funzionamento';
    doc.text(`Condizioni della caldaia: ${boilerCondition}`, 15, yPos);
    yPos += 15;
    
    return yPos;
  }

  /**
   * Aggiunge le letture delle utenze
   */
  private addUtilityReadings(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    // Sezione letture utenze con layout simile alla foto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LETTURE UTENZE ALLA CONSEGNA', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    yPos += 20;
    
    // Campi per le letture disposte orizzontalmente come nella foto
    const readings = contractData.initialUtilityReadings || {};
    
    // Prima riga: GAS, LUCE, ACQUA
    const gasReading = readings.gas ? readings.gas.toString() : '____________';
    const electricityReading = readings.electricity ? readings.electricity.toString() : '____________';
    const waterReading = readings.water ? readings.water.toString() : '____________';
    
    // GAS - posizione sinistra
    doc.setFont('helvetica', 'bold');
    doc.text('GAS :', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(gasReading, 45, yPos);
    
    // LUCE - posizione centro
    doc.setFont('helvetica', 'bold');
    doc.text('LUCE :', 80, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(electricityReading, 115, yPos);
    
    // ACQUA - posizione destra
    doc.setFont('helvetica', 'bold');
    doc.text('ACQUA :', 150, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(waterReading, 185, yPos);
    
    yPos += 30;
    
    return yPos;
  }

  /**
   * Aggiunge la sezione della caparra
   */
  private addSecurityDeposit(doc: jsPDF, contractData: BaseContractData, startY: number): number {
    let yPos = startY;
    
    // Sezione caparra formattata come nel documento originale
    const depositAmount = contractData.securityDepositAmount || contractData.lease.securityDeposit;
    
    // Testo principale della caparra
    const depositText = `Caparra concessa dal conduttore al proprietario per un importo di: € ${depositAmount.toFixed(2)} che sarà`;
    const lines1 = doc.splitTextToSize(depositText, 175);
    lines1.forEach((line: string) => {
      doc.text(line, 15, yPos);
      yPos += 6;
    });
    
    // Continua il testo della caparra
    const continueText = 'restituita alla chiusura del rapporto previo controllo dell\'appartamento. Il medesimo dovrà essere rilasciato';
    const lines2 = doc.splitTextToSize(continueText, 175);
    lines2.forEach((line: string) => {
      doc.text(line, 15, yPos);
      yPos += 6;
    });
    
    // Ultima parte del testo della caparra
    doc.text('nello stato in cui è stato consegnato, pena trattenuta della caparra.', 15, yPos);
    yPos += 40;
    
    return yPos;
  }

  /**
   * Aggiunge la dichiarazione di accettazione
   */
  private addAcceptanceDeclaration(doc: jsPDF, startY: number): number {
    let yPos = startY;
    
    doc.setFont('helvetica', 'bold');
    doc.text('VISTO E ACCETTATO', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 30;
    
    return yPos;
  }

  /**
   * Aggiunge le firme
   */
  private addSignatures(doc: jsPDF, startY: number): void {
    let yPos = startY;
    
    // Controlla se serve una nuova pagina
    if (yPos > 220) {
      doc.addPage();
      yPos = 40;
    }
    
    // Spazio per le firme con stile professionale
    yPos += 30;
    
    // Linee per le firme più spesse e ben distanziate
    doc.setLineWidth(0.8);
    doc.line(20, yPos, 90, yPos);   // Linea per firma conduttore
    doc.line(120, yPos, 190, yPos); // Linea per firma proprietario
    
    yPos += 8;
    
    // Etichette per le firme centrate
    doc.setFont('helvetica', 'bold');
    doc.text('Il Conduttore', 55, yPos, { align: 'center' });
    doc.text('Il Proprietario', 155, yPos, { align: 'center' });
    
    // Aggiungi il numero di pagina in basso
    const pageCount = doc.getCurrentPageInfo().pageNumber;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Pag. ${pageCount}`, 195, 285, { align: 'right' });
  }

  /**
   * Genera la descrizione predefinita dell'appartamento
   */
  private getDefaultPropertyDescription(apartment: Apartment): string {
    return `Appartamento ${apartment.name} composto da ${apartment.rooms} vani, ${apartment.bathrooms} bagni, ${apartment.squareMeters}mq, ${apartment.floor ? `al piano ${apartment.floor}` : 'piano terra'}.`;
  }

  /**
   * Genera il nome del file per il contratto base
   */
  private generateBaseContractFilename(contractData: BaseContractData): string {
    const tenant = contractData.tenant;
    const apartment = contractData.apartment;
    const timestamp = new Date().getTime();
    
    return `contratto_base_${tenant.lastName.toLowerCase()}_${apartment.name.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.pdf`;
  }

  /**
   * Genera un contratto base con la possibilità di aggiungere/modificare letture utenze
   */
  generateBaseContractWithUtilityManagement(contractData: BaseContractData): void {
    // Prima genera il contratto base
    this.generateBaseContract(contractData);
    
    // Poi eventualmente salva le letture utenze nel database
    if (contractData.initialUtilityReadings) {
      this.saveInitialUtilityReadings(contractData);
    }
  }

  /**
   * Salva le letture utenze iniziali nel database (da implementare)
   */
  private saveInitialUtilityReadings(contractData: BaseContractData): void {
    // Questa funzione sarà implementata per salvare le letture nel database
    // tramite il servizio API
    console.log('Salvataggio letture utenze iniziali:', contractData.initialUtilityReadings);
  }
} 