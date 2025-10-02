import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map, catchError, throwError, tap, forkJoin } from 'rxjs';
import { Invoice, InvoiceItem, Lease, Tenant, Apartment, UtilityReading } from '../models';
import { InvoiceService } from './invoice.service';
import { GenericApiService } from './generic-api.service';
import { WhatsAppService } from './whatsapp.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface AutomaticInvoiceData {
  leaseId: number;
  tenantId: number;
  apartmentId: number;
  monthlyRent: number;
  paymentDueDay: number;
  startDate: Date;
  endDate: Date;
  utilityReadings?: {
    electricity?: number;
    water?: number;
    gas?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AutomaticInvoiceService {
  constructor(
    private invoiceService: InvoiceService,
    private apiService: GenericApiService,
    private whatsappService: WhatsAppService,
    private authService: AuthService
  ) {}

  /**
   * Genera automaticamente una fattura quando viene creato un contratto
   */
  generateInvoiceFromLease(leaseData: AutomaticInvoiceData): Observable<Invoice> {
    return this.generateInvoiceItems(leaseData).pipe(
      switchMap(items => {
        if (items.length === 0) {
          return throwError(() => new Error('Nessun elemento fattura generato'));
        }

        // Calcola il totale
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const tax = 0; // IVA 0% per affitti residenziali
        const total = subtotal + tax;

        // Genera numero fattura
        const invoiceNumber = this.generateInvoiceNumber();

        // Calcola le date
        const issueDate = new Date();
        const dueDate = this.calculateDueDate(leaseData.paymentDueDay);

        // Crea la fattura
        const invoice: Partial<Invoice> = {
          leaseId: leaseData.leaseId,
          tenantId: leaseData.tenantId,
          apartmentId: leaseData.apartmentId,
          invoiceNumber,
          month: issueDate.getMonth() + 1,
          year: issueDate.getFullYear(),
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          periodStart: this.getPeriodStartDate(issueDate).toISOString().split('T')[0],
          periodEnd: this.getPeriodEndDate(issueDate).toISOString().split('T')[0],
          subtotal,
          tax,
          total,
          isPaid: false,
          status: 'pending',
          reminderSent: false
        };

        return this.invoiceService.createInvoice(invoice).pipe(
          switchMap(createdInvoice => {
            // Aggiungi gli elementi della fattura
            const itemObservables = items.map(item => 
              this.invoiceService.addInvoiceItem(createdInvoice.id, {
                ...item,
                invoiceId: createdInvoice.id
              })
            );

            return forkJoin(itemObservables).pipe(
              map(() => createdInvoice),
              tap(() => {
                // Invalida la cache
                this.apiService.invalidateCache('invoices');
              })
            );
          })
        );
      }),
      catchError(error => {
        console.error('Errore nella generazione automatica della fattura:', error);
        return throwError(() => new Error('Impossibile generare la fattura automatica'));
      })
    );
  }

  /**
   * Genera gli elementi della fattura (affitto + utenze)
   */
  private generateInvoiceItems(leaseData: AutomaticInvoiceData): Observable<InvoiceItem[]> {
    const items: InvoiceItem[] = [];
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // Aggiungi voce affitto
    const currentUser = this.authService.getCurrentUser();
    items.push({
      id: 0,
      invoiceId: 0,
      userId: currentUser?.id || 0, // ← AGGIUNGI userId
      description: `Affitto ${monthName}`,
      amount: leaseData.monthlyRent,
      quantity: 1,
      unitPrice: leaseData.monthlyRent,
      type: 'rent'
    });

    // Se ci sono letture utenze iniziali, calcola i costi
    if (leaseData.utilityReadings) {
      return this.calculateUtilityCosts(leaseData.apartmentId, leaseData.utilityReadings).pipe(
        map(utilityCosts => {
          // Gestione speciale per l'appartamento 8 - elettricità
          // Gestione speciale per l'appartamento 8 - elettricità della lavanderia
          const currentUser = this.authService.getCurrentUser();
          const isApartment8 = leaseData.apartmentId === 8;
          
          if (isApartment8) {
            // Elettricità principale
            if (utilityCosts.electricity > 0) {
              items.push({
                id: 0,
                invoiceId: 0,
                userId: currentUser?.id || 0, // ← AGGIUNGI userId
                description: `Utenza Elettrica ${monthName}`,
                amount: utilityCosts.electricity,
                quantity: 1,
                unitPrice: utilityCosts.electricity,
                type: 'electricity'
              });
            }

            // Elettricità lavanderia (se presente)
            if (utilityCosts.laundryElectricity && utilityCosts.laundryElectricity > 0) {
              items.push({
                id: 0,
                invoiceId: 0,
                userId: currentUser?.id || 0, // ← AGGIUNGI userId
                description: `Elettricità Lavanderia ${monthName}`,
                amount: utilityCosts.laundryElectricity,
                quantity: 1,
                unitPrice: utilityCosts.laundryElectricity,
                type: 'other'
              });
            }
          } else {
            // Gestione normale per tutti gli altri appartamenti
            if (utilityCosts.electricity > 0) {
              items.push({
                id: 0,
                invoiceId: 0,
                userId: currentUser?.id || 0, // ← AGGIUNGI userId
                description: `Utenza Elettrica ${monthName}`,
                amount: utilityCosts.electricity,
                quantity: 1,
                unitPrice: utilityCosts.electricity,
                type: 'electricity'
              });
            }
          }

          if (utilityCosts.water > 0) {
            items.push({
              id: 0,
              invoiceId: 0,
              userId: currentUser?.id || 0, // ← AGGIUNGI userId
              description: `Utenza Idrica ${monthName}`,
              amount: utilityCosts.water,
              quantity: 1,
              unitPrice: utilityCosts.water,
              type: 'water'
            });
          }

          if (utilityCosts.gas > 0) {
            items.push({
              id: 0,
              invoiceId: 0,
              userId: currentUser?.id || 0, // ← AGGIUNGI userId
              description: `Utenza Gas ${monthName}`,
              amount: utilityCosts.gas,
              quantity: 1,
              unitPrice: utilityCosts.gas,
              type: 'gas'
            });
          }

          return items;
        })
      );
    }

    return of(items);
  }

  /**
   * Calcola i costi delle utenze basati sulle letture iniziali
   */
  private calculateUtilityCosts(apartmentId: number, readings: any): Observable<{ electricity: number; water: number; gas: number; laundryElectricity?: number }> {
    // Per ora, calcola costi base basati sui consumi tipici
    // TODO: Integrare con il sistema di letture reali
    const costs: { electricity: number; water: number; gas: number; laundryElectricity?: number } = {
      electricity: 0,
      water: 0,
      gas: 0
    };

    // Se è l'appartamento 8 (ID 8), aggiungi il campo per l'elettricità della lavanderia
    if (apartmentId === 8) {
      costs.laundryElectricity = 0;
    }

    // Calcola costi basati sui consumi tipici mensili
    if (readings.electricity !== undefined) {
      // Consumo tipico: 200-400 kWh/mese
      const consumption = readings.electricity || 300;
      costs.electricity = Math.round(consumption * 0.25 * 100) / 100; // €0.25/kWh
    }

    // Per l'appartamento 8 (ID 8), calcola anche l'elettricità della lavanderia
    if (apartmentId === 8 && readings.laundryElectricity !== undefined) {
      // Consumo tipico lavanderia: 20-50 kWh/mese
      const consumption = readings.laundryElectricity || 35;
      costs.laundryElectricity = Math.round(consumption * 0.25 * 100) / 100; // €0.25/kWh
    }

    if (readings.water !== undefined) {
      // Consumo tipico: 10-20 m³/mese
      const consumption = readings.water || 15;
      costs.water = Math.round(consumption * 2.50 * 100) / 100; // €2.50/m³
    }

    if (readings.gas !== undefined) {
      // Consumo tipico: 50-150 m³/mese
      const consumption = readings.gas || 100;
      costs.gas = Math.round(consumption * 1.20 * 100) / 100; // €1.20/m³
    }

    return of(costs);
  }

  /**
   * Genera un numero fattura univoco
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `FAT-${timestamp}-${random}`;
  }

  /**
   * Calcola la data di scadenza basata sul giorno di pagamento
   */
  private calculateDueDate(paymentDueDay: number): Date {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), paymentDueDay);
    
    // Se la data di scadenza è già passata questo mese, passa al mese successivo
    if (dueDate < now) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    return dueDate;
  }

  /**
   * Ottiene la data di inizio periodo (primo giorno del mese corrente)
   */
  private getPeriodStartDate(currentDate: Date): Date {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  /**
   * Ottiene la data di fine periodo (ultimo giorno del mese corrente)
   */
  private getPeriodEndDate(currentDate: Date): Date {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }

  /**
   * Invia automaticamente la fattura via WhatsApp
   */
  sendInvoiceViaWhatsApp(invoiceId: number, tenantPhone: string): Observable<{ success: boolean; message: string }> {
    // Formatta il numero di telefono
    const formattedPhone = this.whatsappService.formatPhoneNumber(tenantPhone);
    
    // Verifica se il numero è valido
    if (!this.whatsappService.validatePhoneNumber(formattedPhone)) {
      return of({
        success: false,
        message: 'Numero di telefono non valido per WhatsApp'
      });
    }

    // Invia la fattura via WhatsApp
    return this.whatsappService.sendInvoice(formattedPhone, invoiceId).pipe(
      map(response => ({
        success: response.success,
        message: response.success ? 'Fattura inviata con successo via WhatsApp' : 'Errore nell\'invio WhatsApp'
      }))
    );
  }

  /**
   * Genera PDF della fattura
   */
  generateInvoicePdf(invoiceId: number): Observable<Blob> {
    return this.invoiceService.generateInvoicePdf(invoiceId);
  }
}
