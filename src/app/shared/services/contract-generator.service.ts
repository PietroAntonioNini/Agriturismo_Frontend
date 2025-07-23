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
  generateDetailedHTMLContract(lease: Lease, tenant: Tenant, apartment: Apartment): Observable<string> {
    // Ottieni le ultime letture delle utility per l'appartamento
    return this.getLastUtilityReadings(apartment.id!).pipe(
      map(utilityReadings => {
        return this.createHTMLContract(lease, tenant, apartment, utilityReadings);
      })
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
            line-height: 1.4;
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }

        .contract-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: bold;
        }

        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .date-location {
            text-align: right;
            margin-bottom: 30px;
            font-size: 14px;
            color: #666;
        }

        .section {
            margin-bottom: 35px;
        }

        .section h2 {
            background: #f8f9fa;
            padding: 12px 20px;
            border-left: 4px solid #3498db;
            color: #2c3e50;
            font-size: 16px;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .parties-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }

        .party-box {
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            background: #fafbfc;
        }

        .party-title {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .field-group {
            margin-bottom: 12px;
        }

        .field-label {
            font-weight: bold;
            color: #555;
            font-size: 12px;
            margin-bottom: 4px;
            display: block;
        }

        .field-value {
            border-bottom: 1px solid #ddd;
            padding: 4px 0;
            min-height: 20px;
            font-size: 14px;
        }

        .property-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
        }

        .property-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .description-list {
            list-style: none;
            padding: 0;
        }

        .description-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            position: relative;
            padding-left: 20px;
        }

        .description-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #27ae60;
            font-weight: bold;
        }

        .utilities-section {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .utilities-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 15px;
        }

        .utility-box {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #ddd;
        }

        .utility-label {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .utility-value {
            font-size: 18px;
            font-weight: bold;
            color: #3498db;
            border: 2px solid #3498db;
            padding: 8px;
            border-radius: 4px;
            background: #f8f9fa;
        }

        .financial-section {
            background: #e8f5e8;
            border: 1px solid #27ae60;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
        }

        .financial-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }

        .amount-box {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #ddd;
        }

        .amount-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        .amount-value {
            font-size: 18px;
            font-weight: bold;
            color: #27ae60;
        }

        .inventory-section {
            border: 2px solid #e74c3c;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #fdf2f2;
        }

        .inventory-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        .checkbox-item input[type="checkbox"] {
            margin-right: 10px;
            transform: scale(1.2);
        }

        .signatures-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #34495e;
        }

        .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-top: 30px;
        }

        .signature-box {
            text-align: center;
        }

        .signature-title {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .signature-line {
            border-bottom: 2px solid #34495e;
            height: 60px;
            margin-bottom: 10px;
            position: relative;
        }

        .signature-date {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .legal-notice {
            background: #f8f9fa;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 30px 0;
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }

        .page-break {
            page-break-before: always;
        }

        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
                font-size: 11px;
            }
            
            .contract-container {
                box-shadow: none;
                border-radius: 0;
                max-width: 210mm;
                margin: 0 auto;
                padding: 0;
            }
            
            .header {
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .header h1 {
                font-size: 18px;
                margin-bottom: 5px;
            }
            
            .header .subtitle {
                font-size: 11px;
            }
            
            .content {
                padding: 20px;
            }
            
            .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            
            .section h2 {
                font-size: 13px;
                padding: 8px 15px;
                margin-bottom: 12px;
            }
            
            .parties-grid {
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .party-box {
                padding: 12px;
            }
            
            .party-title {
                font-size: 11px;
                margin-bottom: 10px;
            }
            
            .field-label {
                font-size: 10px;
            }
            
            .field-value {
                font-size: 11px;
                min-height: 16px;
            }
            
            .property-details {
                padding: 15px;
                margin: 15px 0;
            }
            
            .property-grid {
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .description-list li {
                padding: 5px 0;
                font-size: 10px;
            }
            
            .utilities-section {
                padding: 15px;
                margin: 15px 0;
            }
            
            .utilities-grid {
                gap: 15px;
                margin-top: 10px;
            }
            
            .utility-box {
                padding: 10px;
            }
            
            .utility-label {
                font-size: 11px;
                margin-bottom: 8px;
            }
            
            .utility-value {
                font-size: 14px;
                padding: 6px;
            }
            
            .financial-section {
                padding: 15px;
                margin: 15px 0;
            }
            
            .financial-grid {
                gap: 15px;
            }
            
            .amount-box {
                padding: 10px;
            }
            
            .amount-label {
                font-size: 10px;
            }
            
            .amount-value {
                font-size: 14px;
            }
            
            .inventory-section {
                padding: 15px;
                margin: 15px 0;
            }
            
            .inventory-grid {
                gap: 10px;
                margin-top: 10px;
            }
            
            .checkbox-item {
                padding: 6px;
                font-size: 10px;
            }
            
            .signatures-section {
                margin-top: 30px;
                padding-top: 20px;
            }
            
            .signatures-grid {
                gap: 30px;
                margin-top: 20px;
            }
            
            .signature-line {
                height: 40px;
            }
            
            .signature-date {
                font-size: 10px;
            }
            
            .no-print {
                display: none;
            }
            
            /* Forza il break di pagina per mantenere le sezioni insieme */
            .page-break {
                page-break-before: always;
            }
            
            /* Evita che le sezioni si spezzino */
            .section {
                page-break-inside: avoid;
            }
            
            /* Ottimizza per A4 */
            @page {
                size: A4;
                margin: 15mm;
            }
        }

        .form-control {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            font-size: 14px;
            width: 100%;
        }

        .text-center {
            text-align: center;
        }

        .font-bold {
            font-weight: bold;
        }

        .text-small {
            font-size: 12px;
        }

        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: background 0.3s;
        }

        .print-button:hover {
            background: #2980b9;
        }

        .print-button:active {
            transform: translateY(1px);
        }

        .print-info {
            position: fixed;
            top: 70px;
            right: 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px;
            font-size: 12px;
            color: #666;
            max-width: 200px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <!-- Pulsante di stampa -->
    <button class="print-button no-print" onclick="printContract()">
        🖨️ Stampa Contratto
    </button>
    
    <!-- Informazioni di stampa -->
    <div class="print-info no-print">
        <strong>💡 Suggerimenti:</strong><br>
        • Usa Ctrl+P per stampare<br>
        • Seleziona "A4" come formato<br>
        • Rimuovi margini se necessario
    </div>

    <div class="contract-container">
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
                        <div class="party-title">IL PROPRIETARIO (Locatore)</div>
                        <div class="field-group">
                            <label class="field-label">Nome e Cognome:</label>
                            <div class="field-value">[Nome Proprietario]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Codice Fiscale:</label>
                            <div class="field-value">[Codice Fiscale Proprietario]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Data di Nascita:</label>
                            <div class="field-value">[Data Nascita Proprietario]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Luogo di Nascita:</label>
                            <div class="field-value">[Luogo Nascita Proprietario]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Residenza:</label>
                            <div class="field-value">[Residenza Proprietario]</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Telefono:</label>
                            <div class="field-value">[Telefono Proprietario]</div>
                        </div>
                    </div>

                    <div class="party-box">
                        <div class="party-title">IL CONDUTTORE (Inquilino)</div>
                        <div class="field-group">
                            <label class="field-label">Nome e Cognome:</label>
                            <div class="field-value">${tenant.firstName} ${tenant.lastName}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Documento:</label>
                            <div class="field-value">${tenant.documentType} n° ${tenant.documentNumber}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Telefono:</label>
                            <div class="field-value">${tenant.phone}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Dati Immobile -->
            <div class="section">
                <h2>IDENTIFICAZIONE DELL'IMMOBILE</h2>
                <div class="property-details">
                    <div class="property-grid">
                        <div class="field-group">
                            <label class="field-label">Appartamento:</label>
                            <div class="field-value">${apartment.name}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Piano:</label>
                            <div class="field-value">${apartment.floor}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Superficie:</label>
                            <div class="field-value">${apartment.squareMeters} m²</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Vani:</label>
                            <div class="field-value">${apartment.rooms} locali</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Bagni:</label>
                            <div class="field-value">${apartment.bathrooms}</div>
                        </div>
                        <div class="field-group">
                            <label class="field-label">Stato:</label>
                            <div class="field-value">${apartment.isFurnished ? 'Arredato' : 'Non arredato'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Descrizione Appartamento -->
            <div class="section">
                <h2>DESCRIZIONE DELL'APPARTAMENTO</h2>
                <div class="property-details">
                    <p style="margin-bottom: 10px; font-weight: bold;">Il proprietario fornisce l'appartamento così descritto:</p>
                    <ul class="description-list">
                        <li>Cucina con elettrodomestici, tavolo, sedie, divano, mobiletto TV, camino</li>
                        <li>Camera con letto matrimoniale, armadio, comodini, cassettone con specchio</li>
                        <li>Bagno con doccia, sanitari e accessori</li>
                        <li>Condizioni generali: ottimo stato</li>
                        <li>Caldaia: perfetto funzionamento</li>
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
                            <div class="utility-value">${utilityReadings.gas || 0}</div>
                            <div class="text-small" style="margin-top: 5px; color: #666;">mc</div>
                        </div>
                        <div class="utility-box">
                            <div class="utility-label">LUCE</div>
                            <div class="utility-value">${utilityReadings.electricity || 0}</div>
                            <div class="text-small" style="margin-top: 5px; color: #666;">kWh</div>
                        </div>
                        <div class="utility-box">
                            <div class="utility-label">ACQUA</div>
                            <div class="utility-value">${utilityReadings.water || 0}</div>
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
                            <div class="amount-value">€ ${lease.monthlyRent.toFixed(2)}</div>
                        </div>
                        <div class="amount-box">
                            <div class="amount-label">Deposito Cauzionale</div>
                            <div class="amount-value">€ ${lease.securityDeposit.toFixed(2)}</div>
                        </div>
                        <div class="amount-box">
                            <div class="amount-label">Durata Contratto</div>
                            <div class="amount-value" style="color: #2c3e50;">${months} mesi</div>
                        </div>
                        <div class="amount-box">
                            <div class="amount-label">Periodo</div>
                            <div class="amount-value" style="color: #2c3e50;">${startDate} - ${endDate}</div>
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
                    <p style="font-weight: bold; margin-bottom: 10px;">Lista dei beni mobili presenti nell'immobile:</p>
                    <div class="inventory-grid">
                        <div class="checkbox-item">
                            <input type="checkbox" id="cucina" checked>
                            <label for="cucina">Cucina attrezzata e elettrodomestici</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="camera" checked>
                            <label for="camera">Camera letto completa</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="soggiorno" checked>
                            <label for="soggiorno">Soggiorno: divano, tavolo, sedie</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="bagno" checked>
                            <label for="bagno">Bagno: sanitari e accessori</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="tv" checked>
                            <label for="tv">Televisore e mobiletto TV</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="armadi" checked>
                            <label for="armadi">Armadi e cassettoni</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="biancheria" checked>
                            <label for="biancheria">Biancheria per casa</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="altro">
                            <label for="altro">Altro: _________________</label>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                        <p style="font-size: 11px; color: #666;">
                            La presente descrizione è quella dei beni arredati presenti al momento della consegna dell'immobile. 
                            Eventuali danni o deterioramenti dovranno essere risarciti.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Firme -->
            <div class="signatures-section">
                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="font-weight: bold; font-size: 14px;">VISTO E ACCETTATO</p>
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
        // Auto-fill current date
        document.addEventListener('DOMContentLoaded', function() {
            const today = new Date();
            const dateStr = today.getDate().toString().padStart(2, '0') + '/' + 
                           (today.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                           today.getFullYear();
            
            // Auto-fill the date
            const dateElement = document.querySelector('.date-location span');
            if (dateElement) {
                dateElement.textContent = dateStr;
            }
        });

        // Print functionality
        function printContract() {
            // Nascondi i pulsanti prima della stampa
            const printElements = document.querySelectorAll('.no-print');
            printElements.forEach(el => el.style.display = 'none');
            
            // Stampa
            window.print();
            
            // Mostra di nuovo i pulsanti dopo la stampa
            setTimeout(() => {
                printElements.forEach(el => el.style.display = '');
            }, 1000);
        }

        // Keyboard shortcut per stampa (Ctrl+P)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                printContract();
            }
        });

        // Focus sul documento per migliorare l'esperienza
        window.focus();
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