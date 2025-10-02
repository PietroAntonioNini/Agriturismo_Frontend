import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, switchMap, tap, throwError } from 'rxjs';
import { 
  Invoice, 
  InvoiceItem, 
  PaymentRecord, 
  InvoiceCreate, 
  InvoiceItemCreate, 
  PaymentRecordCreate,
  InvoiceFilters,
  InvoiceStatistics,
  Tenant,
  Apartment,
  Lease
} from '../models';
import { GenericApiService } from './generic-api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'invoices';

  constructor(
    private http: HttpClient,
    private apiService: GenericApiService,
    private authService: AuthService
  ) { }

  // Operazioni CRUD per le fatture - SOLO DATI REALI
  getAllInvoices(params?: any): Observable<Invoice[]> {
    return this.apiService.getAll<Invoice>('invoices', params).pipe(
      tap(list => console.debug('[InvoiceService] getAllInvoices →', Array.isArray(list) ? list.length : 'n/a')),
      catchError(error => {
        console.error('Errore nel recupero delle fatture:', error);
        return throwError(() => new Error('Impossibile recuperare le fatture dal database'));
      })
    );
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.apiService.getById<Invoice>('invoices', id).pipe(
      catchError(error => {
        console.error(`Errore nel recupero della fattura ${id}:`, error);
        return throwError(() => new Error(`Fattura con ID ${id} non trovata`));
      })
    );
  }

  createInvoice(invoice: Partial<Invoice>): Observable<Invoice> {
    console.debug('[InvoiceService] createInvoice payload=', invoice);
    return this.apiService.create<Invoice>('invoices', invoice).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices');
      }),
      catchError(error => {
        console.error('Errore nella creazione della fattura:', error);
        return throwError(() => new Error('Impossibile creare la fattura'));
      })
    );
  }

  updateInvoice(id: number, invoice: Partial<Invoice>): Observable<Invoice> {
    return this.apiService.update<Invoice>('invoices', id, invoice).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices', id);
      }),
      catchError(error => {
        console.error(`Errore nell'aggiornamento della fattura ${id}:`, error);
        return throwError(() => new Error(`Impossibile aggiornare la fattura ${id}`));
      })
    );
  }

  deleteInvoice(id: number): Observable<void> {
    return this.apiService.delete('invoices', id).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices', id);
      }),
      catchError(error => {
        console.error(`Errore nell'eliminazione della fattura ${id}:`, error);
        return throwError(() => new Error(`Impossibile eliminare la fattura ${id}`));
      })
    );
  }

  // Metodi per gli elementi della fattura - SOLO DATI REALI
  getInvoiceItems(invoiceId: number): Observable<InvoiceItem[]> {
    return this.apiService.getRelatedRecords<InvoiceItem>('invoices', invoiceId, 'items').pipe(
      catchError(error => {
        console.error(`Errore nel recupero degli elementi della fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile recuperare gli elementi della fattura ${invoiceId}`));
      })
    );
  }

  addInvoiceItem(invoiceId: number, item: Partial<InvoiceItem>): Observable<InvoiceItem> {
    return this.apiService.addRelatedRecord<InvoiceItem>('invoices', invoiceId, 'items', item).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      catchError(error => {
        console.error(`Errore nell'aggiunta dell'elemento alla fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile aggiungere l'elemento alla fattura ${invoiceId}`));
      })
    );
  }

  updateInvoiceItem(invoiceId: number, itemId: number, item: Partial<InvoiceItem>): Observable<InvoiceItem> {
    return this.apiService.updateRelatedRecord<InvoiceItem>('invoices', invoiceId, 'items', itemId, item).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      catchError(error => {
        console.error(`Errore nell'aggiornamento dell'elemento ${itemId} della fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile aggiornare l'elemento ${itemId} della fattura ${invoiceId}`));
      })
    );
  }

  deleteInvoiceItem(invoiceId: number, itemId: number): Observable<void> {
    return this.apiService.deleteRelatedRecord('invoices', invoiceId, 'items', itemId).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      catchError(error => {
        console.error(`Errore nell'eliminazione dell'elemento ${itemId} della fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile eliminare l'elemento ${itemId} della fattura ${invoiceId}`));
      })
    );
  }

  // Metodi per i pagamenti - SOLO DATI REALI
  getPaymentRecords(invoiceId: number): Observable<PaymentRecord[]> {
    return this.apiService.getRelatedRecords<PaymentRecord>('invoices', invoiceId, 'payment-records').pipe(
      catchError(error => {
        console.error(`Errore nel recupero dei pagamenti della fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile recuperare i pagamenti della fattura ${invoiceId}`));
      })
    );
  }

  addPaymentRecord(invoiceId: number, payment: Partial<PaymentRecord>): Observable<PaymentRecord> {
    return this.apiService.addRelatedRecord<PaymentRecord>('invoices', invoiceId, 'payment-records', payment).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      catchError(error => {
        console.error(`Errore nell'aggiunta del pagamento alla fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile aggiungere il pagamento alla fattura ${invoiceId}`));
      })
    );
  }

  // Metodi specifici per le fatture - SOLO DATI REALI
  getInvoicesByTenant(tenantId: number): Observable<Invoice[]> {
    return this.apiService.getAll<Invoice>('invoices', { tenant_id: tenantId }).pipe(
      catchError(error => {
        console.error(`Errore nel recupero delle fatture del tenant ${tenantId}:`, error);
        return throwError(() => new Error(`Impossibile recuperare le fatture del tenant ${tenantId}`));
      })
    );
  }

  getInvoicesByApartment(apartmentId: number): Observable<Invoice[]> {
    return this.apiService.getAll<Invoice>('invoices', { apartment_id: apartmentId }).pipe(
      catchError(error => {
        console.error(`Errore nel recupero delle fatture dell'appartamento ${apartmentId}:`, error);
        return throwError(() => new Error(`Impossibile recuperare le fatture dell'appartamento ${apartmentId}`));
      })
    );
  }

  getInvoicesByMonth(month: number, year: number): Observable<Invoice[]> {
    return this.apiService.getAll<Invoice>('invoices', { month, year }).pipe(
      catchError(error => {
        console.error(`Errore nel recupero delle fatture per ${month}/${year}:`, error);
        return throwError(() => new Error(`Impossibile recuperare le fatture per ${month}/${year}`));
      })
    );
  }

  getUnpaidInvoices(): Observable<Invoice[]> {
    return this.apiService.getAll<Invoice>('invoices', { status: 'unpaid' }).pipe(
      catchError(error => {
        console.error('Errore nel recupero delle fatture non pagate:', error);
        return throwError(() => new Error('Impossibile recuperare le fatture non pagate'));
      })
    );
  }

  getOverdueInvoices(): Observable<Invoice[]> {
    return this.apiService.getAllWithCache<Invoice>(`${this.apiUrl}/overdue`).pipe(
      catchError(error => {
        console.error('Errore nel recupero delle fatture scadute:', error);
        return throwError(() => new Error('Impossibile recuperare le fatture scadute'));
      })
    );
  }

  markInvoiceAsPaid(invoiceId: number, paymentDate: Date, paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check'): Observable<Invoice> {
    return this.apiService.post<Invoice>(`${this.apiUrl}/${invoiceId}/mark-as-paid`, {
      paymentDate: paymentDate.toISOString().split('T')[0],
      paymentMethod
    }).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      catchError(error => {
        console.error(`Errore nel marcare come pagata la fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile marcare come pagata la fattura ${invoiceId}`));
      })
    );
  }

  sendInvoiceReminder(invoiceId: number, reminderData?: any): Observable<{ success: boolean; message: string }> {
    const data = reminderData || { send_via: 'whatsapp' };
    
    return this.apiService.post<any>(`${this.apiUrl}/${invoiceId}/send-reminder`, data).pipe(
      tap(() => {
        // Invalida la cache della fattura
        this.apiService.invalidateCache('invoices', invoiceId);
      }),
      map(response => ({
        success: response.success,
        message: response.message
      })),
      catchError(error => {
        console.error(`Errore nell'invio del promemoria per la fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile inviare il promemoria per la fattura ${invoiceId}`));
      })
    );
  }

  generateInvoicePdf(invoiceId: number): Observable<Blob> {
    return this.apiService.getBlob(`${this.apiUrl}/${invoiceId}/pdf`).pipe(
      catchError(error => {
        console.error(`Errore nella generazione del PDF per la fattura ${invoiceId}:`, error);
        return throwError(() => new Error(`Impossibile generare il PDF per la fattura ${invoiceId}`));
      })
    );
  }

  // Metodo per generare automaticamente le fatture mensili - SOLO DATI REALI
  generateMonthlyInvoices(month: number, year: number, options?: any): Observable<any> {
    const data = {
      month,
      year,
      include_utilities: options?.include_utilities ?? true,
      send_notifications: options?.send_notifications ?? false
    };
    
    return this.apiService.post<any>(`${this.apiUrl}/generate-monthly`, data).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices');
      }),
      catchError(error => {
        console.error(`Errore nella generazione delle fatture mensili per ${month}/${year}:`, error);
        return throwError(() => new Error(`Impossibile generare le fatture mensili per ${month}/${year}`));
      })
    );
  }

  // Metodo per calcolare il totale della fattura
  calculateInvoiceTotal(items: InvoiceItem[], taxRate: number = 0): { subtotal: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  // Metodi aggiuntivi per i componenti di fatturazione - SOLO DATI REALI
  markAsPaid(invoiceId: number): Observable<Invoice> {
    return this.markInvoiceAsPaid(invoiceId, new Date(), 'bank_transfer');
  }

  recordPayment(invoiceId: number, payment: Partial<PaymentRecord>): Observable<PaymentRecord> {
    return this.addPaymentRecord(invoiceId, payment);
  }

  removePayment(paymentId: number): Observable<void> {
    // Questo metodo richiede di conoscere l'invoiceId dal paymentId
    // Per ora, restituiamo un errore che indica che il metodo non è supportato
    return throwError(() => new Error('Rimozione pagamento non supportata. Utilizzare i metodi specifici per gestire i pagamenti.'));
  }

  // === METODI PER INTEGRAZIONE CON SERVIZI REALI ===

  /**
   * Ottiene tutti i tenant attivi per l'autocomplete
   */
  getActiveTenants(): Observable<any[]> {
    return this.apiService.getAll<any>('tenants', { status: 'active', has_active_lease: true }).pipe(
      catchError(error => {
        console.error('Errore nel recupero dei tenant:', error);
        return of([]);
      })
    );
  }

  /**
   * Ottiene tutti gli appartamenti occupati per l'autocomplete
   */
  getOccupiedApartments(): Observable<any[]> {
    return this.apiService.getAll<any>('apartments', { status: 'occupied' }).pipe(
      catchError(error => {
        console.error('Errore nel recupero degli appartamenti:', error);
        return of([]);
      })
    );
  }

  /**
   * Ottiene tutti i contratti attivi per l'autocomplete
   */
  getActiveLeases(): Observable<any[]> {
    return this.apiService.getAll<any>('leases', { status: 'active' }).pipe(
      catchError(error => {
        console.error('Errore nel recupero dei contratti:', error);
        return of([]);
      })
    );
  }

  /**
   * Ottiene il nome di un tenant per ID
   */
  getTenantName(tenantId: number): Observable<string> {
    return this.apiService.getById<any>('tenants', tenantId).pipe(
      map(tenant => `${tenant.firstName} ${tenant.lastName}`),
      catchError(error => {
        console.error(`Errore nel recupero del tenant ${tenantId}:`, error);
        return of(`Inquilino ${tenantId}`);
      })
    );
  }

  /**
   * Ottiene il nome di un appartamento per ID
   */
  getApartmentName(apartmentId: number): Observable<string> {
    return this.apiService.getById<any>('apartments', apartmentId).pipe(
      map(apartment => apartment.name || `Appartamento ${apartmentId}`),
      catchError(error => {
        console.error(`Errore nel recupero dell'appartamento ${apartmentId}:`, error);
        return of(`Appartamento ${apartmentId}`);
      })
    );
  }

  /**
   * Cerca tenant per autocomplete
   */
  searchTenants(query: string): Observable<any[]> {
    return this.apiService.search<any>('tenants', query).pipe(
      catchError(error => {
        console.error('Errore nella ricerca tenant:', error);
        return of([]);
      })
    );
  }

  /**
   * Cerca appartamenti per autocomplete
   */
  searchApartments(query: string): Observable<any[]> {
    return this.apiService.search<any>('apartments', query).pipe(
      catchError(error => {
        console.error('Errore nella ricerca appartamenti:', error);
        return of([]);
      })
    );
  }

  /**
   * Ottiene le letture utility per un appartamento e periodo
   */
  getUtilityReadingsForPeriod(apartmentId: number, startDate: Date, endDate: Date): Observable<any[]> {
    const params = {
      apartmentId: apartmentId.toString(),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    return this.apiService.getAll<any>('utilities', params).pipe(
      catchError(error => {
        console.error('Errore nel recupero delle letture utility:', error);
        return of([]);
      })
    );
  }

  /**
   * Genera automaticamente le voci fattura basate su affitto e utenze
   */
  generateInvoiceItemsFromLease(leaseId: number, periodStart: Date, periodEnd: Date): Observable<InvoiceItem[]> {
    return this.apiService.getById<any>('leases', leaseId).pipe(
      switchMap(lease => {
        const items: InvoiceItem[] = [];
        
        // Aggiungi voce affitto
        const currentUser = this.authService.getCurrentUser();
        items.push({
          id: 0,
          invoiceId: 0,
          userId: currentUser?.id || 0, // ← AGGIUNGI userId
          description: `Affitto ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
          amount: lease.monthlyRent,
          quantity: 1,
          unitPrice: lease.monthlyRent,
          type: 'rent'
        });

        // Aggiungi voci utenze se presenti
        return this.getUtilityReadingsForPeriod(lease.apartmentId, periodStart, periodEnd).pipe(
          map(readings => {
            // Raggruppa le letture per tipo per gestire letture speciali
            const electricityReadings = readings.filter(r => r.type === 'electricity' && r.totalCost > 0);
            const waterReadings = readings.filter(r => r.type === 'water' && r.totalCost > 0);
            const gasReadings = readings.filter(r => r.type === 'gas' && r.totalCost > 0);

            // Gestione speciale per l'appartamento 8 - elettricità
            // Gestione speciale per l'appartamento 8 - elettricità della lavanderia
            const currentUser = this.authService.getCurrentUser();
            const isApartment8 = lease.apartmentId === 8;
            
            if (isApartment8 && electricityReadings.length > 0) {
              const mainElectricity = electricityReadings.find(r => !r.isSpecialReading || r.subtype === 'main');
              const laundryElectricity = electricityReadings.find(r => r.isSpecialReading && r.subtype === 'laundry');

              // Elettricità principale
              if (mainElectricity) {
                items.push({
                  id: 0,
                  invoiceId: 0,
                  userId: currentUser?.id || 0, // ← AGGIUNGI userId
                  description: `Utenza Elettrica ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                  amount: mainElectricity.totalCost,
                  quantity: 1,
                  unitPrice: mainElectricity.totalCost,
                  type: 'electricity'
                });
              }

              // Elettricità lavanderia (solo per appartamento 8)
              if (laundryElectricity) {
                items.push({
                  id: 0,
                  invoiceId: 0,
                  userId: currentUser?.id || 0, // ← AGGIUNGI userId
                  description: `Elettricità Lavanderia ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                  amount: laundryElectricity.totalCost,
                  quantity: 1,
                  unitPrice: laundryElectricity.totalCost,
                  type: 'other' // Usa 'other' per distinguerla dall'elettricità principale
                });
              }
            } else {
              // Gestione normale per tutti gli altri appartamenti
              electricityReadings.forEach(reading => {
                items.push({
                  id: 0,
                  invoiceId: 0,
                  userId: currentUser?.id || 0, // ← AGGIUNGI userId
                  description: `Utenza Elettrica ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                  amount: reading.totalCost,
                  quantity: 1,
                  unitPrice: reading.totalCost,
                  type: 'electricity'
                });
              });
            }

            // Acqua e Gas (gestione normale per tutti)
            waterReadings.forEach(reading => {
              items.push({
                id: 0,
                invoiceId: 0,
                userId: currentUser?.id || 0, // ← AGGIUNGI userId
                description: `Utenza Idrica ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                amount: reading.totalCost,
                quantity: 1,
                unitPrice: reading.totalCost,
                type: 'water'
              });
            });

            gasReadings.forEach(reading => {
              items.push({
                id: 0,
                invoiceId: 0,
                userId: currentUser?.id || 0, // ← AGGIUNGI userId
                description: `Utenza Gas ${periodStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                amount: reading.totalCost,
                quantity: 1,
                unitPrice: reading.totalCost,
                type: 'gas'
              });
            });
            return items;
          })
        );
      }),
      catchError(error => {
        console.error('Errore nella generazione automatica delle voci fattura:', error);
        return of([]);
      })
    );
  }

  /**
   * Genera fattura da contratto specifico
   */
  generateInvoiceFromLease(leaseId: number, month: number, year: number, customItems?: any[]): Observable<any> {
    const data = {
      lease_id: leaseId,
      month,
      year,
      include_utilities: true,
      custom_items: customItems || []
    };
    
    return this.apiService.post<any>(`${this.apiUrl}/generate-from-lease`, data).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices');
      }),
      catchError(error => {
        console.error(`Errore nella generazione della fattura dal contratto ${leaseId}:`, error);
        return throwError(() => new Error(`Impossibile generare la fattura dal contratto ${leaseId}`));
      })
    );
  }

  /**
   * Ottiene statistiche delle fatture
   */
  getInvoiceStatistics(period?: string): Observable<InvoiceStatistics> {
    const params = period ? { period } : {};
    return this.apiService.getAllWithCache<InvoiceStatistics>(`${this.apiUrl}/statistics`, params).pipe(
      map(response => Array.isArray(response) ? response[0] : response),
      catchError(error => {
        console.error('Errore nel recupero delle statistiche fatture:', error);
        return throwError(() => new Error('Impossibile recuperare le statistiche fatture'));
      })
    );
  }

  /**
   * Invia promemoria multipli
   */
  sendBulkReminders(invoiceIds: number[], options?: any): Observable<any> {
    const data = {
      invoice_ids: invoiceIds,
      send_via: options?.send_via || 'whatsapp',
      template: options?.template || 'overdue_reminder',
      custom_message: options?.custom_message
    };
    
    return this.apiService.post<any>(`${this.apiUrl}/send-bulk-reminders`, data).pipe(
      tap(() => {
        // Invalida la cache delle fatture
        this.apiService.invalidateCache('invoices');
      }),
      catchError(error => {
        console.error('Errore nell\'invio dei promemoria multipli:', error);
        return throwError(() => new Error('Impossibile inviare i promemoria multipli'));
      })
    );
  }
}
