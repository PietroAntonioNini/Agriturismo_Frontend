import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Lease } from '../models/lease.model';
import { Tenant } from '../models/tenant.model';
import { Apartment } from '../models/apartment.model';
import { ContractTemplatesService } from './contract-templates.service';
import { GenericApiService } from './generic-api.service';
import { forkJoin, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ContractGeneratorService {
  constructor(
    private contractTemplatesService: ContractTemplatesService,
    private apiService: GenericApiService
  ) {}

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
   * Genera un contratto HTML dettagliato e pronto per la stampa
   * @param lease - Dati del contratto di locazione
   * @param tenant - Dati dell'inquilino
   * @param apartment - Dati dell'appartamento
   */
  generateDetailedHTMLContract(
    lease: Lease,
    tenant: Tenant,
    apartment: Apartment,
    manualUtilities?: { electricity?: number | null; water?: number | null; gas?: number | null }
  ): Observable<string> {
    // Se arrivano letture dal form, usale; altrimenti recupera le ultime letture registrate
    if (manualUtilities && (
      manualUtilities.electricity !== undefined ||
      manualUtilities.water !== undefined ||
      manualUtilities.gas !== undefined
    )) {
      const utilityReadings = {
        electricity: manualUtilities.electricity ?? 0,
        water: manualUtilities.water ?? 0,
        gas: manualUtilities.gas ?? 0
      };
      return new Observable<string>(subscriber => {
        subscriber.next(this.createHTMLContract(lease, tenant, apartment, utilityReadings));
        subscriber.complete();
      });
    }

    // Fallback: carica ultime letture dal sistema utilities
    return this.getLastUtilityReadings(apartment.id!).pipe(
      map(utilityReadings => this.createHTMLContract(lease, tenant, apartment, utilityReadings))
    );
  }

  /**
   * Ottiene le ultime letture delle utility per un appartamento
   */
  private getLastUtilityReadings(apartmentId: number): Observable<any> {
    const utilityTypes = ['electricity', 'water', 'gas'];
    const readingRequests = utilityTypes.map(type => 
      this.apiService.getLastUtilityReading(apartmentId, type)
    );

    return forkJoin(readingRequests).pipe(
      map(readings => {
        const result: any = {};
        utilityTypes.forEach((type, index) => {
          result[type] = readings[index]?.lastReading || 0;
        });
        return result;
      })
    );
  }

  /**
   * Crea il contratto HTML completo
   */
  private createHTMLContract(lease: Lease, tenant: Tenant, apartment: Apartment, utilityReadings: any): string {
    const startDate = new Date(lease.startDate).toLocaleDateString('it-IT');
    const endDate = new Date(lease.endDate).toLocaleDateString('it-IT');
    const today = new Date().toLocaleDateString('it-IT');
    
    // Calcola la durata in mesi
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contratto di Locazione ad Uso Abitativo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.3;
            color: #000;
            background: white;
            padding: 20px 24px 12px; /* margini laterali e superiori maggiorati in anteprima */
        }

        .contract-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
        }

        .header {
            background: #000;
            color: white;
            padding: 15px;
            text-align: center;
            margin-bottom: 15px;
        }

        .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .header .subtitle {
            font-size: 11px;
        }

        .content {
            padding: 0;
        }

        .date-location {
            text-align: right;
            margin-bottom: 15px;
            font-size: 12px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }

        .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }

        .section h2 {
            background: #f0f0f0;
            padding: 6px 10px;
            border: 2px solid #000;
            color: #000;
            font-size: 12px;
            margin-bottom: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .parties-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }

        .party-box {
            border: 2px solid #000;
            padding: 8px;
            background: white;
        }

        .party-title {
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            font-size: 11px;
            text-transform: uppercase;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .field-group {
            margin-bottom: 6px;
            display: flex;
            align-items: center;
        }

        .field-label {
            font-weight: bold;
            color: #000;
            font-size: 9px;
            margin-right: 5px;
            min-width: 60px;
        }

        .field-value {
            border-bottom: 1px solid #000;
            padding: 1px 3px;
            flex: 1;
            font-size: 10px;
            min-height: 12px;
        }

        .property-details {
            background: #f8f8f8;
            border: 1px solid #000;
            padding: 8px;
            margin: 5px 0;
        }

        .property-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 8px;
        }

        .description-list {
            list-style: none;
            padding: 0;
            font-size: 9px;
            columns: 2;
            column-gap: 10px;
        }

        .description-list li {
            padding: 2px 0;
            position: relative;
            padding-left: 12px;
            break-inside: avoid;
        }

        .description-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #000;
            font-weight: bold;
        }

        .utilities-section {
            background: #f5f5f5;
            border: 2px solid #000;
            padding: 8px;
            margin: 8px 0;
        }

        .utilities-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 5px;
        }

        .utility-box {
            text-align: center;
            padding: 6px;
            background: white;
            border: 1px solid #000;
        }

        .utility-label {
            font-weight: bold;
            color: #000;
            margin-bottom: 3px;
            font-size: 10px;
        }

        .utility-input {
            border: none;
            border-bottom: 2px solid #000;
            padding: 2px;
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            background: transparent;
            width: 100%;
        }

        .financial-section {
            background: #f0f0f0;
            border: 2px solid #000;
            padding: 8px;
            margin: 8px 0;
        }

        .financial-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }

        .amount-box {
            background: white;
            padding: 6px;
            text-align: center;
            border: 1px solid #000;
        }

        .amount-label {
            font-size: 9px;
            color: #000;
            margin-bottom: 2px;
            font-weight: bold;
        }

        .amount-value {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            border: none;
            background: transparent;
            text-align: center;
            width: 100%;
        }

        .cauzione-text {
            margin-top: 8px;
            padding: 6px;
            background: white;
            border: 1px solid #000;
            font-size: 9px;
            color: #000;
            line-height: 1.2;
        }

        .inventory-section {
            border: 2px solid #000;
            padding: 8px;
            margin: 8px 0;
            background: #f8f8f8;
        }

        .inventory-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            margin-top: 5px;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            padding: 3px;
            background: white;
            border: 1px solid #000;
            font-size: 9px;
        }

        .checkbox-item input[type="checkbox"] {
            margin-right: 5px;
            transform: scale(0.8);
        }

        .legal-notice {
            background: #f0f0f0;
            border: 2px solid #000;
            padding: 8px;
            margin: 10px 0;
            font-size: 9px;
            color: #000;
            line-height: 1.2;
        }

        .signatures-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 3px solid #000;
            page-break-inside: avoid;
        }

        .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 10px;
        }

        .signature-box {
            text-align: center;
        }

        .signature-title {
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            font-size: 11px;
        }

        .signature-line {
            border-bottom: 2px solid #000;
            height: 35px;
            margin-bottom: 5px;
        }

        .signature-date {
            font-size: 9px;
            color: #000;
            margin-top: 3px;
        }

        .compact-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }

        .toolbar {
            position: fixed;
            top: 10px;
            right: 10px;
          display: flex;
          gap: 8px;
          z-index: 1000;
        }

        .toolbar button {
          padding: 6px 12px;
          background: #000;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        }

        .toolbar button:hover {
            background: #333;
        }

        /* OTTIMIZZAZIONE STAMPA */
        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
                font-size: 10px;
                line-height: 1.2;
            }
            
            .contract-container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
            
            .header {
                padding: 8px;
                margin-bottom: 8px;
            }
            
            .header h1 {
                font-size: 14px;
                margin-bottom: 3px;
            }
            
            .header .subtitle {
                font-size: 9px;
            }
            
            .content {
                padding: 0;
            }
            
            .section {
                margin-bottom: 10px;
                page-break-inside: avoid;
            }
            
            .section h2 {
                font-size: 10px;
                padding: 4px 8px;
                margin-bottom: 5px;
            }
            
            .parties-grid {
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .party-box {
                padding: 6px;
            }
            
            .party-title {
                font-size: 9px;
                margin-bottom: 5px;
            }
            
            .field-group {
                margin-bottom: 4px;
            }
            
            .field-label {
                font-size: 8px;
                min-width: 50px;
            }
            
            .field-value {
                font-size: 9px;
                min-height: 10px;
            }
            
            .property-details {
                padding: 6px;
                margin: 4px 0;
            }
            
            .property-grid {
                gap: 6px;
                margin-bottom: 6px;
            }
            
            .description-list {
                font-size: 8px;
            }
            
            .description-list li {
                padding: 1px 0;
                padding-left: 10px;
            }
            
            .utilities-section {
                padding: 6px;
                margin: 6px 0;
            }
            
            .utilities-grid {
                gap: 6px;
                margin-top: 4px;
            }
            
            .utility-box {
                padding: 4px;
            }
            
            .utility-label {
                font-size: 8px;
                margin-bottom: 2px;
            }
            
            .utility-input {
                font-size: 10px;
                padding: 1px;
            }
            
            .financial-section {
                padding: 6px;
                margin: 6px 0;
            }
            
            .financial-grid {
                gap: 6px;
            }
            
            .amount-box {
                padding: 4px;
            }
            
            .amount-label {
                font-size: 8px;
                margin-bottom: 1px;
            }
            
            .amount-value {
                font-size: 9px;
            }
            
            .cauzione-text {
                margin-top: 6px;
                padding: 4px;
                font-size: 8px;
            }
            
            .inventory-section {
                padding: 6px;
                margin: 6px 0;
            }
            
            .inventory-grid {
                gap: 3px;
                margin-top: 4px;
            }
            
            .checkbox-item {
                padding: 2px;
                font-size: 8px;
            }
            
            .legal-notice {
                padding: 6px;
                margin: 8px 0;
                font-size: 8px;
            }
            
            .signatures-section {
                margin-top: 10px;
                padding-top: 8px;
            }
            
            .signatures-grid {
                gap: 15px;
                margin-top: 8px;
            }
            
            .signature-line {
                height: 25px;
            }
            
            .signature-date {
                font-size: 8px;
            }
            
            .no-print {
                display: none !important;
            }
            
            /* Pagina senza margini */
            @page {
                size: A4;
                /* margini di stampa: top e laterali più ampi, bottom leggermente ridotto */
                margin: 14mm 14mm 10mm 14mm;
            }
            
            /* Forza il contenuto in 2 pagine max */
            .page-break-after { page-break-after: always; }
            
            /* Mantieni le sezioni insieme */
            .signatures-section,
            .inventory-section {
                page-break-inside: avoid;
            }

            /* Compatta per rientrare in 1 facciata quando possibile */
            .header { margin-bottom: 6px; }
            .date-location { margin-bottom: 6px; }
            .inventory-section { display: none; } /* nasconde inventario in stampa per ridurre lunghezza */
        }

        .text-center {
            text-align: center;
        }

        .font-bold {
            font-weight: bold;
        }

        .text-small {
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <!-- Toolbar azioni -->
        <div class="toolbar no-print">
            <button onclick="printContract()">Scarica PDF</button>
            <button onclick="window.close()">Chiudi</button>
        </div>
        <!-- Header -->
        <div class="header">
            <h1>CONTRATTO DI LOCAZIONE</h1>
            <div class="subtitle">Documento di Consegna Appartamento ad Uso Abitativo</div>
            <div class="subtitle">Ai sensi della Legge 431/98 e successive modificazioni</div>
        </div>

        <div class="content">
            <!-- Data e Luogo -->
            <div class="date-location">
                <strong>Data:</strong> <span style="border-bottom: 1px solid #333; padding: 2px 20px; margin-left: 10px;">${today}</span>
            </div>

            <!-- Parti Contraenti -->
            <div class="section">
                <h2>PARTI CONTRAENTI</h2>
                <div class="parties-grid">
                    <div class="party-box">
                        <div class="party-title">IL CONDUTTORE (Inquilino)</div>
                        <div class="field-group">
                            <label class="field-label">Nome e Cognome:</label>
                            <div class="field-value">${tenant.firstName} ${tenant.lastName}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Codice Fiscale:</label>
                            <div class="field-value">[Codice Fiscale Inquilino]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Data di Nascita:</label>
                            <div class="field-value">[Data Nascita Inquilino]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Luogo di Nascita:</label>
                            <div class="field-value">[Luogo Nascita Inquilino]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Residenza:</label>
                            <div class="field-value">${tenant.address || '[Residenza Inquilino]'}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Telefono:</label>
                            <div class="field-value">${tenant.phone}</div>
                        </div>
                    </div>

                    <div class="party-box">
                        <div class="party-title">IMMOBILE</div>
                        <div class="field-group">
                            <label class="field-label">Nome/Indirizzo:</label>
                            <div class="field-value">${apartment.name}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Superficie:</label>
                            <div class="field-value">${apartment.squareMeters} m²</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Stanze:</label>
                            <div class="field-value">${apartment.rooms}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Piano:</label>
                            <div class="field-value">${apartment.floor}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- La sezione dettagli immobile estesa è stata rimossa per compattezza -->

            <!-- Descrizione Appartamento -->
            <div class="section">
                <h2>DESCRIZIONE DELL'APPARTAMENTO</h2>
                <div class="property-details">
                    <p style="margin-bottom: 15px; font-weight: bold;">Il proprietario fornisce l'appartamento così descritto:</p>
                    <ul class="description-list">
                        <li>Cucina perfettamente funzionante con elettrodomestici funzionanti, in perfetto stato, tavolo con 4 sedie, divano, mobiletto TV, camino</li>
                        <li>Camera con letto matrimoniale, rete doghe, materasso, coprimaterasso, armadio, 2 comodini, 2 abat-jour, cassettone con specchio, tutto in ottimo stato</li>
                        <li>Bagno con doccia, sanitari e accessori in perfetto stato</li>
                        <li>Condizioni dell'appartamento al momento della consegna: ottimo stato generale</li>
                        <li>Condizioni della caldaia di riscaldamento in perfetto stato di funzionamento</li>
                    </ul>
                </div>
            </div>

            <!-- Letture Contatori -->
            <div class="section">
                <h2>LETTURE DELLE FORNITURE</h2>
                <div class="utilities-section">
                    <p style="font-weight: bold; margin-bottom: 15px; text-align: center;">Letture delle forniture relative alla consegna dell'appartamento</p>
                    <div class="utilities-grid">
                        <div class="utility-box">
                            <div class="utility-label">GAS</div>
                            <input type="text" class="utility-input" value="${utilityReadings.gas || 0}">
                            <div class="text-small" style="margin-top: 5px; color: #666;">mc</div>
                        </div>
                        <div class="utility-box">
                            <div class="utility-label">LUCE</div>
                            <input type="text" class="utility-input" value="${utilityReadings.electricity || 0}">
                            <div class="text-small" style="margin-top: 5px; color: #666;">kWh</div>
                        </div>
                        <div class="utility-box">
                            <div class="utility-label">ACQUA</div>
                            <input type="text" class="utility-input" value="${utilityReadings.water || 0}">
                            <div class="text-small" style="margin-top: 5px; color: #666;">litri</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Condizioni Economiche -->
            <div class="section">
                <h2>CONDIZIONI ECONOMICHE</h2>
                <div class="financial-section">
                    <div class="financial-grid">
                        <div class="amount-box">
                            <div class="amount-label">Canone Mensile</div>
                            <div style="display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 14px; margin-right: 5px;">€</span>
                                <input type="text" class="amount-value" value="${lease.monthlyRent.toFixed(2)}">
                            </div>
                        </div>
                        <div class="amount-box">
                            <div class="amount-label">Deposito Cauzionale</div>
                            <div style="display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 14px; margin-right: 5px;">€</span>
                                <input type="text" class="amount-value" value="${lease.securityDeposit.toFixed(2)}">
                            </div>
                        </div>
                        <!-- Spese condominiali rimosse -->
                        <div class="amount-box">
                            <div class="amount-label">Durata Contratto</div>
                            <input type="text" class="amount-value" value="${months >= 48 ? '4+4 anni' : months >= 36 ? '3+2 anni' : 'Transitorio'}" style="color: #2c3e50;">
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 6px;">
                        <p style="font-size: 13px; color: #666; line-height: 1.4;">
                            <strong>Caparra concessa dal conduttore al proprietario per un importo di:</strong> 
                            <span style="border-bottom: 1px solid #333; padding: 2px 10px; margin: 0 10px;">€ ${lease.securityDeposit.toFixed(2)}</span> 
                            che sarà restituita alla chiusura del rapporto previo controllo dell'appartamento. 
                            Il medesimo dovrà essere rilasciato nello stato in cui è stato consegnato, pena trattenuta della caparra.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Inventario Beni Mobili -->
            <div class="section">
                <h2>INVENTARIO DEI BENI MOBILI</h2>
                <div class="inventory-section">
                    <p style="font-weight: bold; margin-bottom: 15px;">Lista dei beni mobili presenti nell'immobile:</p>
                    <div class="inventory-grid">
                        <div class="checkbox-item">
                            <input type="checkbox" id="cucina" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="cucina">Cucina attrezzata e elettrodomestici</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="camera" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="camera">Camera letto completa</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="soggiorno" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="soggiorno">Soggiorno: divano, tavolo, sedie</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="bagno" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="bagno">Bagno: sanitari e accessori</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="tv" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="tv">Televisore e mobiletto TV</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="armadi" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="armadi">Armadi e cassettoni</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="biancheria" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="biancheria">Biancheria per casa</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="altro" ${apartment.isFurnished ? 'checked' : ''}>
                            <label for="altro">Altro: _________________</label>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 6px;">
                        <p style="font-size: 12px; color: #666;">
                            La presente descrizione è quella dei beni arredati presenti al momento della consegna dell'immobile. 
                            Eventuali danni o deterioramenti dovranno essere risarciti.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Clausole importanti rimosse per richiesta -->

            <!-- Firme -->
            <div class="signatures-section">
                <div style="text-align: center; margin-bottom: 30px;">
                    <p style="font-weight: bold; font-size: 16px;">VISTO E ACCETTATO</p>
                </div>
                
                <div class="signatures-grid">
                    <div class="signature-box">
                        <div class="signature-title">IL CONDUTTORE</div>
                        <div class="signature-line"></div>
                        <div class="signature-date">
                            Luogo e data: ________________________
                        </div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-title">IL PROPRIETARIO</div>
                        <div class="signature-line"></div>
                        <div class="signature-date">
                            Luogo e data: ________________________
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Funzione Scarica/Stampa PDF
        function printContract() {
            // Nascondi elementi non necessari per la stampa
            const printElements = document.querySelectorAll('.no-print');
            printElements.forEach(el => el.style.display = 'none');
            
            // Prepara il documento per stampa ottimale
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            
            // Stampa il documento
            window.print();
            
            // Ripristina gli elementi dopo la stampa
            setTimeout(() => {
                printElements.forEach(el => el.style.display = '');
                document.body.style.margin = '';
                document.body.style.padding = '';
            }, 1000);
        }

        // Scorciatoia tastiera (Ctrl+P)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                printContract();
            }
        });

        // Focus sul documento per migliorare l'esperienza
        document.addEventListener('DOMContentLoaded', function() {
            window.focus();
            
            // Aggiungi funzionalità di auto-salvataggio locale se necessario
            const inputs = document.querySelectorAll('input, .field-value');
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    // Qui potresti aggiungere logica di auto-salvataggio
                    // per ora manteniamo solo la funzionalità di stampa
                });
            });
        });

        // Funzione per resettare il form
        function resetContract() {
            const inputs = document.querySelectorAll('input[type="text"]');
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            
            inputs.forEach(input => input.value = '');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        }

        // Aggiunge tooltip informativi ai campi principali
        document.addEventListener('DOMContentLoaded', function() {
            const amountInputs = document.querySelectorAll('.amount-value');
            amountInputs.forEach(input => {
                input.addEventListener('focus', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });
                
                input.addEventListener('blur', function() {
                    this.style.backgroundColor = '';
                });
            });
        });
    </script>
</body>
</html>`;
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