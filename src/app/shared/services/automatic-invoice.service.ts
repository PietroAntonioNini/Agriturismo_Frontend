import { Injectable } from '@angular/core';
import { Observable, of, switchMap, map, catchError, throwError, tap, forkJoin } from 'rxjs';
import { Invoice, InvoiceItem, Lease, Tenant, Apartment, UtilityReading } from '../models';
import { InvoiceService } from './invoice.service';
import { GenericApiService } from './generic-api.service';
import { WhatsAppService } from './whatsapp.service';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
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
    electricityReadingId?: number;
    electricityLaundryReadingId?: number;
    waterReadingId?: number;
    gasReadingId?: number;
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
    private authService: AuthService,
    private settings: SettingsService
  ) { }

  /**
   * Genera automaticamente una fattura quando viene creato un contratto
   */
  generateInvoiceFromLease(leaseData: AutomaticInvoiceData): Observable<Invoice> {
    // Calcola il periodo di riferimento (mese precedente a quello attuale)
    const now = new Date();
    const referenceDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const invoiceMonth = referenceDate.getMonth() + 1; // 1-based
    const invoiceYear = referenceDate.getFullYear();

    // Calcola le date del periodo (tutto il mese scorso)
    const periodStart = new Date(invoiceYear, invoiceMonth - 1, 1);
    const periodEnd = new Date(invoiceYear, invoiceMonth, 0);

    return this.generateInvoiceItems(leaseData, referenceDate).pipe(
      switchMap(items => {
        if (items.length === 0) {
          return throwError(() => new Error('Nessun elemento fattura generato'));
        }

        // Calcola il subtotale (solo utenze: electricity, water, gas, other)
        const subtotal = items
          .filter(item => ['electricity', 'water', 'gas', 'electricity_laundry', 'other', 'utility'].includes(item.type))
          .reduce((sum, item) => sum + item.amount, 0);

        // Calcola il totale (tutte le voci: utenze + affitto + costi fissi)
        const total = items.reduce((sum, item) => sum + item.amount, 0);

        const tax = 0; // IVA forzata a 0 per requisiti backend

        // Genera numero fattura
        const invoiceNumber = this.generateInvoiceNumber();

        // Calcola le date di emissione e scadenza (15 giorni dalla data di emissione)
        const issueDate = new Date();
        const dueDate = this.calculateDueDate();

        // Crea la fattura includendo items e userId in un unico payload per soddisfare i requisiti del backend
        const currentUser = this.authService.getCurrentUser() || (this.authService as any).getUserFromStorage?.();

        const invoice: any = {
          leaseId: leaseData.leaseId,
          tenantId: leaseData.tenantId,
          apartmentId: leaseData.apartmentId,
          userId: currentUser?.id || 0,
          invoiceNumber,
          month: invoiceMonth, // Usa il mese precedente
          year: invoiceYear,   // Usa l'anno del mese precedente
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          subtotal,
          tax,
          total,
          isPaid: false,
          status: 'pending',
          reminderSent: false,
          items: items.map(item => ({
            ...item,
            userId: currentUser?.id || 0
          })),
          // Invia anche i dati delle letture iniziali se forniti
          initialReadings: leaseData.utilityReadings
        };

        return this.invoiceService.createInvoice(invoice).pipe(
          tap(() => {
            // Invalida la cache
            this.apiService.invalidateCache('invoices');
          })
        );
      }),
      catchError(error => {
        console.error('Errore nella generazione automatica della fattura:', error);
        return throwError(() => new Error('Impossibile generare la fattura automatica'));
      })
    );
  }

  private generateInvoiceItems(leaseData: AutomaticInvoiceData, referenceDate: Date): Observable<InvoiceItem[]> {
    const monthName = referenceDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const currentUser = this.authService.getCurrentUser() || (this.authService as any).getUserFromStorage?.();
    const userId = currentUser?.id || 0;

    // Recupera i default (TARI, Contatori) e l'ultima lettura utile
    return forkJoin({
      defaults: this.settings.getStatementDefaults().pipe(catchError(() => of(null))),
      readings: this.apiService.getAll<any>('utilities', {
        apartmentId: leaseData.apartmentId,
        _sort: 'readingDate',
        _order: 'desc',
        _limit: 1
      }).pipe(catchError(() => of([])))
    }).pipe(
      map(({ defaults, readings }) => {
        const items: InvoiceItem[] = [];

        // 1. Affitto
        items.push({
          id: 0,
          invoiceId: 0,
          userId: userId,
          description: `Affitto ${monthName}`,
          amount: leaseData.monthlyRent,
          quantity: 1,
          unitPrice: leaseData.monthlyRent,
          type: 'rent'
        });

        // 2. Utenze da ultima lettura
        if (readings && readings.length > 0) {
          const lastReading = readings[0];

          // Luce
          if (lastReading.electricityCost > 0) {
            items.push({
              id: 0, invoiceId: 0, userId: userId,
              description: `Utenza Elettrica ${monthName}`,
              amount: lastReading.electricityCost,
              quantity: 1, unitPrice: lastReading.electricityCost,
              type: 'electricity'
            });
          }

          // Luce Lavanderia
          if (lastReading.laundryElectricityCost > 0) {
            items.push({
              id: 0, invoiceId: 0, userId: userId,
              description: `Elettricità Lavanderia ${monthName}`,
              amount: lastReading.laundryElectricityCost,
              quantity: 1, unitPrice: lastReading.laundryElectricityCost,
              type: 'electricity_laundry'
            });
          }

          // Acqua
          if (lastReading.waterCost > 0) {
            items.push({
              id: 0, invoiceId: 0, userId: userId,
              description: `Utenza Idrica ${monthName}`,
              amount: lastReading.waterCost,
              quantity: 1, unitPrice: lastReading.waterCost,
              type: 'water'
            });
          }

          // Gas
          if (lastReading.gasCost > 0) {
            items.push({
              id: 0, invoiceId: 0, userId: userId,
              description: `Utenza Gas ${monthName}`,
              amount: lastReading.gasCost,
              quantity: 1, unitPrice: lastReading.gasCost,
              type: 'gas'
            });
          }
        }

        // 3. Costi Fissi (TARI, Contatori) da impostazioni o fallback
        const tariVal = defaults?.tari ?? 15;
        const meterVal = defaults?.meterFee ?? 3;

        items.push({
          id: 0, invoiceId: 0, userId: userId,
          description: 'TARI (quota mensile)',
          amount: tariVal,
          quantity: 1, unitPrice: tariVal,
          type: 'tari'
        });

        items.push({
          id: 0, invoiceId: 0, userId: userId,
          description: 'Contatori (quota mensile)',
          amount: meterVal,
          quantity: 1, unitPrice: meterVal,
          type: 'meter_fee'
        });

        return items;
      })
    );
  }

  /**
   * Genera un numero fattura univoco
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `FAT-${timestamp}-${random}`;
  }

  private calculateDueDate(): Date {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 15);
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
