import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Lease } from '../models/lease.model';
import { Tenant } from '../models/tenant.model';
import { Apartment } from '../models/apartment.model';
import { ContractTemplatesService } from './contract-templates.service';

@Injectable({
  providedIn: 'root'
})
export class ContractGeneratorService {
  constructor(private contractTemplatesService: ContractTemplatesService) {}

  /**
   * Aggiunge testo con wrap automatico e restituisce l'altezza occupata
   */
  private addWrappedText(doc: jsPDF, text: string, y: number, maxWidth: number = 180): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, 15, y);
    return (lines.length * 10); // 10 è l'altezza della linea
  }

  /**
   * Genera un contratto di affitto in formato PDF
   * @param lease - Dati del contratto di locazione
   * @param tenant - Dati dell'inquilino
   * @param apartment - Dati dell'appartamento
   * @param templateType - Tipo di contratto (opzionale)
   */
  generateRentalContract(lease: Lease, tenant: Tenant, apartment: Apartment): void {
    const doc = new jsPDF();
    const lineHeight = 10;
    let yPos = 20;

    // Intestazione
    this.addHeader(doc, lease, this.determineContractType(lease));
    yPos = 60;

    // Parti contraenti
    yPos = this.addContractingParties(doc, tenant, yPos);
    yPos += 15;

    // Dettagli immobile
    yPos = this.addPropertyDetails(doc, apartment, yPos);
    yPos += 15;

    // Termini del contratto
    yPos = this.addContractTerms(doc, lease, yPos);
    yPos += 15;

    // Termini e condizioni
    yPos = this.addTermsAndConditions(doc, lease, this.determineContractType(lease), yPos);

    // Pagina delle firme
    this.addSignaturePage(doc);

    // Se l'appartamento è arredato, aggiungi l'inventario
    if (apartment.isFurnished) {
      this.addInventoryPage(doc, apartment);
    }

    // Salva il PDF
    const filename = `contratto_${tenant.lastName.toLowerCase()}_${new Date().getTime()}.pdf`;
    doc.save(filename);
  }

  /**
   * Determina il tipo di contratto in base alla durata
   */
  private determineContractType(lease: Lease): string {
    // Calcola la durata in mesi
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth());
    
    // Determina il tipo in base alla durata
    if (months >= 48) {
      return '4+4';
    } else if (months >= 36) {
      return '3+2';
    } else {
      return 'transitorio';
    }
  }

  /**
   * Aggiunge l'intestazione del documento
   */
  private addHeader(doc: jsPDF, lease: Lease, contractType: string): void {
    // Imposta metadati del documento
    doc.setProperties({
      title: `Contratto di Locazione - ${new Date(lease.startDate).toLocaleDateString('it-IT')}`,
      subject: 'Contratto di Locazione ad Uso Abitativo',
      author: 'Sistema Gestione Immobili',
      keywords: 'contratto, locazione, affitto, immobile',
      creator: 'PropertyManager App'
    });

    // Titolo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    // Tipo di contratto specifico nell'intestazione
    let contractTitle = 'CONTRATTO DI LOCAZIONE AD USO ABITATIVO';
    switch (contractType) {
      case '4+4':
        contractTitle += '\n(L. 431/98, art. 2, comma 1)';
        break;
      case '3+2':
        contractTitle += '\n(L. 431/98, art. 2, comma 3 - Canone Concordato)';
        break;
      case 'transitorio':
        contractTitle += '\n(L. 431/98, art. 5 - Contratto Transitorio)';
        break;
      case 'studenti':
        contractTitle += '\n(L. 431/98, art. 5 - Contratto per Studenti Universitari)';
        break;
    }
    
    const titleLines = doc.splitTextToSize(contractTitle, 180);
    doc.text(titleLines, 105, 20, { align: 'center' });
    
    // Reset font
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Data del contratto
    const oggi = new Date().toLocaleDateString('it-IT');
    doc.text(`Data: ${oggi}`, 15, 40);
  }

  /**
   * Aggiunge le informazioni sulle parti contraenti
   */
  private addContractingParties(doc: jsPDF, tenant: Tenant, startY: number): number {
    let yPos = startY;
    
    // Intestazione sezione
    doc.setFont('helvetica', 'bold');
    doc.text('TRA', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    // Proprietario/Locatore (placeholder)
    doc.text('Il/La sottoscritto/a proprietario/a (Locatore):', 15, yPos);
    yPos += 10;
    doc.text('Nome Società/Proprietario [Da completare]', 20, yPos);
    yPos += 7;
    doc.text('Partita IVA/Codice Fiscale [Da completare]', 20, yPos);
    yPos += 7;
    doc.text('Residenza/Sede Legale [Da completare]', 20, yPos);
    yPos += 15;
    
    // Conduttore (inquilino)
    doc.setFont('helvetica', 'bold');
    doc.text('E', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    doc.text('Il/La sottoscritto/a inquilino/a (Conduttore):', 15, yPos);
    yPos += 10;
    doc.text(`${tenant.firstName} ${tenant.lastName}`, 20, yPos);
    yPos += 7;
    
    const documentInfo = `Documento: ${tenant.documentType} n° ${tenant.documentNumber}`;
    doc.text(documentInfo, 20, yPos);
    yPos += 7;
    
    // if (tenant.fiscalCode) {
    //   doc.text(`Codice Fiscale: ${tenant.fiscalCode}`, 20, yPos);
    //   yPos += 7;
    // }
    
    if (tenant.email || tenant.phone) {
      const contactInfo = `Contatti: ${tenant.email ? tenant.email : ''} ${tenant.phone ? '- ' + tenant.phone : ''}`;
      doc.text(contactInfo, 20, yPos);
      yPos += 7;
    }
    
    return yPos;
  }

  /**
   * Aggiunge i dettagli dell'immobile
   */
  private addPropertyDetails(doc: jsPDF, apartment: Apartment, startY: number): number {
    let yPos = startY;
    
    // Intestazione sezione
    doc.setFont('helvetica', 'bold');
    doc.text('SI CONVIENE E STIPULA QUANTO SEGUE:', 15, yPos);
    yPos += 15;
    
    doc.text('1. OGGETTO DELLA LOCAZIONE', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    // Indirizzo e descrizione immobile
    const apartmentDesc = `Il Locatore concede in locazione al Conduttore l'immobile sito in: ${apartment.name}`;
    yPos += this.addWrappedText(doc, apartmentDesc, yPos);
    yPos += 7;
    
    // Caratteristiche
    const features = `Caratteristiche: ${apartment.rooms} vani, ${apartment.bathrooms} bagni, ${apartment.squareMeters}mq`;
    doc.text(features, 15, yPos);
    yPos += 7;
    
    // Dettagli aggiuntivi se disponibili
    if (apartment.floor) {
      doc.text(`Piano: ${apartment.floor}`, 15, yPos);
      yPos += 7;
    }
    
    return yPos;
  }

  /**
   * Aggiunge i termini del contratto (durata e condizioni economiche)
   */
  private addContractTerms(doc: jsPDF, lease: Lease, startY: number): number {
    let yPos = startY;
    
    // Durata
    doc.setFont('helvetica', 'bold');
    doc.text('2. DURATA E RINNOVO', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    const startDate = new Date(lease.startDate).toLocaleDateString('it-IT');
    const endDate = new Date(lease.endDate).toLocaleDateString('it-IT');
    const duration = `La locazione avrà durata dal ${startDate} al ${endDate}`;
    doc.text(duration, 15, yPos);
    yPos += 15;
    
    // Canone e pagamenti
    doc.setFont('helvetica', 'bold');
    doc.text('3. CANONE E MODALITÀ DI PAGAMENTO', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    doc.text(`Canone mensile: €${lease.monthlyRent.toFixed(2)}`, 15, yPos);
    yPos += 7;
    
    // Calcola canone annuale
    const annualRent = lease.monthlyRent * 12;
    doc.text(`Canone annuale: €${annualRent.toFixed(2)}`, 15, yPos);
    yPos += 7;
    
    doc.text(`Deposito cauzionale: €${lease.securityDeposit.toFixed(2)}`, 15, yPos);
    yPos += 7;
    
    doc.text(`Giorno di scadenza: ${lease.paymentDueDay} di ogni mese`, 15, yPos);
    yPos += 7;
    
    // Modalità di pagamento (placeholder)
    doc.text('Modalità di pagamento: Bonifico Bancario', 15, yPos);
    yPos += 7;
    
    return yPos;
  }

  /**
   * Aggiunge i termini e le condizioni al contratto
   */
  private addTermsAndConditions(doc: jsPDF, lease: Lease, contractType: string, startY: number): number {
    let yPos = startY;
    
    // Se non ci sono termini e condizioni, ottienili dal service
    let termsText = lease.termsAndConditions;
    if (!termsText || termsText.trim() === '') {
      termsText = this.contractTemplatesService.getTemplateByType(contractType);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('4. TERMINI E CONDIZIONI', 15, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    // Aggiungi i termini e condizioni
    yPos += this.addWrappedText(doc, termsText, yPos);
    yPos += 10;
    
    // Aggiungi clausole speciali se presenti
    if (lease.specialClauses && lease.specialClauses.trim() !== '') {
      doc.setFont('helvetica', 'bold');
      doc.text('5. CLAUSOLE SPECIALI', 15, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 10;
      
      yPos += this.addWrappedText(doc, lease.specialClauses, yPos);
      yPos += 10;
    }
    
    return yPos;
  }

  /**
   * Aggiunge una pagina per le firme
   */
  private addSignaturePage(doc: jsPDF): void {
    doc.addPage();
    let yPos = 20;
    
    // Titolo pagina
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRME DELLE PARTI', 105, yPos, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPos += 30;
    
    // Dichiarazione di lettura e accettazione
    const declaration = 'Le parti dichiarano di aver letto, compreso e accettato tutte le clausole del presente contratto, ' +
                        'incluse le condizioni generali e le clausole speciali se presenti.';
    yPos += this.addWrappedText(doc, declaration, yPos);
    yPos += 20;
    
    // Data
    const oggi = new Date().toLocaleDateString('it-IT');
    doc.text(`Luogo e data: ___________________, ${oggi}`, 15, yPos);
    yPos += 30;
    
    // Spazio per firme
    doc.line(20, yPos, 90, yPos);  // Linea per firma locatore
    doc.line(110, yPos, 180, yPos); // Linea per firma conduttore
    yPos += 5;
    doc.text('Il Locatore', 55, yPos, { align: 'center' });
    doc.text('Il Conduttore', 145, yPos, { align: 'center' });
    
    // Spazio per firme specifiche (clausole vessatorie)
    yPos += 40;
    doc.text('Ai sensi degli articoli 1341 e 1342 del Codice Civile, il Conduttore dichiara di approvare specificamente le clausole:', 15, yPos);
    yPos += 10;
    doc.text('n. 2 (Durata), n. 3 (Canone), n. 4 (Termini e Condizioni) e n. 5 (Clausole Speciali) se presente.', 15, yPos);
    
    yPos += 20;
    doc.line(110, yPos, 180, yPos); // Linea per firma conduttore
    yPos += 5;
    doc.text('Il Conduttore (firma specifica)', 145, yPos, { align: 'center' });
    
    // Spazio per registrazione
    yPos += 40;
    doc.setFontSize(10);
    doc.text('SPAZIO RISERVATO ALLA REGISTRAZIONE', 105, yPos, { align: 'center' });
    doc.setFontSize(12);
  }

  /**
   * Aggiunge una pagina con l'inventario dell'appartamento
   */
  private addInventoryPage(doc: jsPDF, apartment: Apartment): void {
    doc.addPage();
    let yPos = 20;
    
    // Titolo inventario
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVENTARIO DEI BENI MOBILI', 105, yPos, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPos += 20;
    
    // Intestazione inventario
    doc.text(`Appartamento: ${apartment.name}`, 15, yPos);
    yPos += 10;
    
    // Lista arredamento (placeholder)
    doc.text('Lista dei beni mobili presenti nell\'immobile:', 15, yPos);
    yPos += 10;
    
    const inventoryItems = [
      'Cucina: mobili e elettrodomestici',
      'Camera: letto, armadio, comodini',
      'Soggiorno: divano, tavolo, sedie',
      'Bagno: arredo bagno'
      // Aggiungere qui altri elementi se disponibili nell'oggetto apartment
    ];
    
    inventoryItems.forEach(item => {
      doc.text(`- ${item}`, 20, yPos);
      yPos += 7;
    });
    
    yPos += 20;
    
    // Spazio per le firme
    doc.text('Le parti dichiarano che i beni sopra elencati sono presenti e in buono stato di conservazione.', 15, yPos);
    yPos += 30;
    
    doc.line(20, yPos, 90, yPos);  // Linea per firma locatore
    doc.line(110, yPos, 180, yPos); // Linea per firma conduttore
    yPos += 5;
    doc.text('Il Locatore', 55, yPos, { align: 'center' });
    doc.text('Il Conduttore', 145, yPos, { align: 'center' });
  }

  /**
   * Genera il nome del file per il contratto
   */
  private generateFilename(tenant: Tenant, lease: Lease): string {
    const timestamp = new Date().getTime();
    const startDateStr = new Date(lease.startDate).toISOString().split('T')[0];
    return `contratto_${tenant.lastName.toLowerCase()}_${startDateStr}_${timestamp}.pdf`;
  }
}