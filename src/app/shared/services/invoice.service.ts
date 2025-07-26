import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Invoice, InvoiceItem, PaymentRecord } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = `${environment.apiUrl}/invoices`;
  
  private mockInvoiceItems: InvoiceItem[] = [
    {
      id: 1,
      invoiceId: 1,
      description: 'Affitto Giugno 2023',
      amount: 750,
      quantity: 1,
      unitPrice: 750,
      type: 'rent'
    },
    {
      id: 2,
      invoiceId: 1,
      description: 'Utenza Elettrica Giugno 2023',
      amount: 95.50,
      quantity: 1,
      unitPrice: 95.50,
      type: 'electricity'
    },
    {
      id: 3,
      invoiceId: 1,
      description: 'Utenza Idrica Giugno 2023',
      amount: 45.80,
      quantity: 1,
      unitPrice: 45.80,
      type: 'water'
    },
    {
      id: 4,
      invoiceId: 2,
      description: 'Affitto Giugno 2023',
      amount: 600,
      quantity: 1,
      unitPrice: 600,
      type: 'rent'
    },
    {
      id: 5,
      invoiceId: 2,
      description: 'Utenza Gas Giugno 2023',
      amount: 30.25,
      quantity: 1,
      unitPrice: 30.25,
      type: 'gas'
    },
    {
      id: 6,
      invoiceId: 3,
      description: 'Affitto Luglio 2023',
      amount: 750,
      quantity: 1,
      unitPrice: 750,
      type: 'rent'
    }
  ];

  private mockInvoices: Invoice[] = [
    {
      id: 1,
      leaseId: 1,
      tenantId: 1,
      apartmentId: 1,
      invoiceNumber: 'INV-2023-001',
      month: 6,
      year: 2023,
      issueDate: new Date('2023-06-01'),
      dueDate: new Date('2023-06-10'),
      periodStart: new Date('2023-06-01'),
      periodEnd: new Date('2023-06-30'),
      items: this.mockInvoiceItems.filter(item => item.invoiceId === 1),
      subtotal: 891.30,
      tax: 0,
      total: 891.30,
      isPaid: true,
      status: 'paid',
      paymentDate: new Date('2023-06-08'),
      paymentMethod: 'bank_transfer',
      notes: 'Fattura di giugno',
      reminderSent: false,
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date('2023-06-08')
    },
    {
      id: 2,
      leaseId: 2,
      tenantId: 2,
      apartmentId: 3,
      invoiceNumber: 'INV-2023-002',
      month: 6,
      year: 2023,
      issueDate: new Date('2023-06-01'),
      dueDate: new Date('2023-06-10'),
      periodStart: new Date('2023-06-01'),
      periodEnd: new Date('2023-06-30'),
      items: this.mockInvoiceItems.filter(item => item.invoiceId === 2),
      subtotal: 630.25,
      tax: 0,
      total: 630.25,
      isPaid: false,
      status: 'pending',
      reminderSent: true,
      reminderDate: new Date('2023-06-15'),
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date('2023-06-15')
    },
    {
      id: 3,
      leaseId: 1,
      tenantId: 1,
      apartmentId: 1,
      invoiceNumber: 'INV-2023-003',
      month: 7,
      year: 2023,
      issueDate: new Date('2023-07-01'),
      dueDate: new Date('2023-07-10'),
      periodStart: new Date('2023-07-01'),
      periodEnd: new Date('2023-07-31'),
      items: this.mockInvoiceItems.filter(item => item.invoiceId === 3),
      subtotal: 750,
      tax: 0,
      total: 750,
      isPaid: false,
      status: 'pending',
      reminderSent: false,
      createdAt: new Date('2023-07-01'),
      updatedAt: new Date('2023-07-01')
    }
  ];

  private mockPaymentRecords: PaymentRecord[] = [
    {
      id: 1,
      invoiceId: 1,
      amount: 891.30,
      paymentDate: new Date('2023-06-08'),
      paymentMethod: 'bank_transfer',
      reference: 'TRNX-123456',
      status: 'completed',
      createdAt: new Date('2023-06-08'),
      updatedAt: new Date('2023-06-08')
    }
  ];

  constructor(private http: HttpClient) { }

  // Operazioni CRUD per le fatture
  getAllInvoices(): Observable<Invoice[]> {
    return of(this.mockInvoices).pipe(delay(500));
  }

  getInvoiceById(id: number): Observable<Invoice> {
    const invoice = this.mockInvoices.find(i => i.id === id);
    return of(invoice as Invoice).pipe(delay(300));
  }

  createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Observable<Invoice> {
    const newInvoice: Invoice = {
      ...invoice as any,
      id: Math.max(...this.mockInvoices.map(i => i.id)) + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockInvoices.push(newInvoice);
    return of(newInvoice).pipe(delay(500));
  }

  updateInvoice(id: number, invoice: Partial<Invoice>): Observable<Invoice> {
    const index = this.mockInvoices.findIndex(i => i.id === id);
    if (index !== -1) {
      this.mockInvoices[index] = {
        ...this.mockInvoices[index],
        ...invoice,
        updatedAt: new Date()
      };
      return of(this.mockInvoices[index]).pipe(delay(300));
    }
    return of({} as Invoice);
  }

  deleteInvoice(id: number): Observable<void> {
    const index = this.mockInvoices.findIndex(i => i.id === id);
    if (index !== -1) {
      this.mockInvoices.splice(index, 1);
      // Elimina anche gli elementi della fattura
      this.mockInvoiceItems = this.mockInvoiceItems.filter(item => item.invoiceId !== id);
    }
    return of(void 0).pipe(delay(300));
  }

  // Metodi per gli elementi della fattura
  getInvoiceItems(invoiceId: number): Observable<InvoiceItem[]> {
    return of(this.mockInvoiceItems.filter(item => item.invoiceId === invoiceId)).pipe(delay(300));
  }

  addInvoiceItem(invoiceId: number, item: Omit<InvoiceItem, 'id' | 'invoiceId'>): Observable<InvoiceItem> {
    const newItem: InvoiceItem = {
      ...item as any,
      id: Math.max(...this.mockInvoiceItems.map(i => i.id)) + 1,
      invoiceId
    };
    this.mockInvoiceItems.push(newItem);
    
    // Aggiorna il subtotal e total della fattura
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.items.push(newItem);
      const totals = this.calculateInvoiceTotal(invoice.items);
      invoice.subtotal = totals.subtotal;
      invoice.tax = totals.tax;
      invoice.total = totals.total;
      invoice.updatedAt = new Date();
    }
    
    return of(newItem).pipe(delay(300));
  }

  updateInvoiceItem(invoiceId: number, itemId: number, item: Partial<InvoiceItem>): Observable<InvoiceItem> {
    const index = this.mockInvoiceItems.findIndex(i => i.id === itemId && i.invoiceId === invoiceId);
    if (index !== -1) {
      this.mockInvoiceItems[index] = {
        ...this.mockInvoiceItems[index],
        ...item
      };
      
      // Aggiorna il subtotal e total della fattura
      const invoice = this.mockInvoices.find(i => i.id === invoiceId);
      if (invoice) {
        invoice.items = this.mockInvoiceItems.filter(item => item.invoiceId === invoiceId);
        const totals = this.calculateInvoiceTotal(invoice.items);
        invoice.subtotal = totals.subtotal;
        invoice.tax = totals.tax;
        invoice.total = totals.total;
        invoice.updatedAt = new Date();
      }
      
      return of(this.mockInvoiceItems[index]).pipe(delay(300));
    }
    return of({} as InvoiceItem);
  }

  deleteInvoiceItem(invoiceId: number, itemId: number): Observable<void> {
    this.mockInvoiceItems = this.mockInvoiceItems.filter(i => !(i.id === itemId && i.invoiceId === invoiceId));
    
    // Aggiorna il subtotal e total della fattura
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.items = this.mockInvoiceItems.filter(item => item.invoiceId === invoiceId);
      const totals = this.calculateInvoiceTotal(invoice.items);
      invoice.subtotal = totals.subtotal;
      invoice.tax = totals.tax;
      invoice.total = totals.total;
      invoice.updatedAt = new Date();
    }
    
    return of(void 0).pipe(delay(300));
  }

  // Metodi per i pagamenti
  getPaymentRecords(invoiceId: number): Observable<PaymentRecord[]> {
    return of(this.mockPaymentRecords.filter(p => p.invoiceId === invoiceId)).pipe(delay(300));
  }

  addPaymentRecord(invoiceId: number, payment: Omit<PaymentRecord, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>): Observable<PaymentRecord> {
    const newPayment: PaymentRecord = {
      ...payment as any,
      id: this.mockPaymentRecords.length > 0 ? Math.max(...this.mockPaymentRecords.map(p => p.id)) + 1 : 1,
      invoiceId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockPaymentRecords.push(newPayment);
    
    // Aggiorna lo stato della fattura
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice && payment.amount >= invoice.total) {
      invoice.isPaid = true;
      invoice.paymentDate = payment.paymentDate;
      invoice.paymentMethod = payment.paymentMethod;
      invoice.updatedAt = new Date();
    }
    
    return of(newPayment).pipe(delay(300));
  }

  // Metodi specifici per le fatture
  getInvoicesByTenant(tenantId: number): Observable<Invoice[]> {
    return of(this.mockInvoices.filter(i => i.tenantId === tenantId)).pipe(delay(300));
  }

  getInvoicesByApartment(apartmentId: number): Observable<Invoice[]> {
    return of(this.mockInvoices.filter(i => i.apartmentId === apartmentId)).pipe(delay(300));
  }

  getInvoicesByMonth(month: number, year: number): Observable<Invoice[]> {
    return of(this.mockInvoices.filter(i => i.month === month && i.year === year)).pipe(delay(300));
  }

  getUnpaidInvoices(): Observable<Invoice[]> {
    return of(this.mockInvoices.filter(i => !i.isPaid)).pipe(delay(300));
  }

  getOverdueInvoices(): Observable<Invoice[]> {
    const today = new Date();
    return of(this.mockInvoices.filter(i => !i.isPaid && new Date(i.dueDate) < today)).pipe(delay(300));
  }

  markInvoiceAsPaid(invoiceId: number, paymentDate: Date, paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check'): Observable<Invoice> {
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.isPaid = true;
      invoice.paymentDate = paymentDate;
      invoice.paymentMethod = paymentMethod;
      invoice.updatedAt = new Date();
      
      // Crea un record di pagamento
      this.addPaymentRecord(invoiceId, {
        amount: invoice.total,
        paymentDate,
        paymentMethod,
        reference: `PAY-${Date.now()}`,
        status: 'completed'
      }).subscribe();
      
      return of(invoice).pipe(delay(300));
    }
    return of({} as Invoice);
  }

  sendInvoiceReminder(invoiceId: number): Observable<{ success: boolean; message: string }> {
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice && !invoice.isPaid) {
      invoice.reminderSent = true;
      invoice.reminderDate = new Date();
      invoice.updatedAt = new Date();
      return of({
        success: true,
        message: 'Promemoria inviato con successo'
      }).pipe(delay(500));
    }
    return of({
      success: false,
      message: 'Impossibile inviare il promemoria: fattura non trovata o già pagata'
    }).pipe(delay(500));
  }

  generateInvoicePdf(invoiceId: number): Observable<Blob> {
    // Simula un file PDF vuoto
    const emptyPdf = new Blob(['%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< >>\nendobj\n5 0 obj\n<< /Length 16 >>\nstream\n0.5 0 0 RG\n1 1 594 840 re\nS\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000218 00000 n\n0000000239 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n304\n%%EOF'], { type: 'application/pdf' });
    return of(emptyPdf).pipe(delay(1000));
  }

  // Metodo per generare automaticamente le fatture mensili
  generateMonthlyInvoices(month: number, year: number): Observable<Invoice[]> {
    // Simula la generazione di nuove fatture
    const today = new Date();
    const newInvoices: Invoice[] = [];
    
    // Per semplicità, generiamo solo una nuova fattura
    const newInvoice: Invoice = {
      id: Math.max(...this.mockInvoices.map(i => i.id)) + 1,
      leaseId: 1,
      tenantId: 1,
      apartmentId: 1,
      invoiceNumber: `INV-${year}-${String(newInvoices.length + 1).padStart(3, '0')}`,
      month,
      year,
      issueDate: today,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
      periodStart: new Date(year, month - 1, 1),
      periodEnd: new Date(year, month, 0),
      items: [{
        id: Math.max(...this.mockInvoiceItems.map(i => i.id)) + 1,
        invoiceId: Math.max(...this.mockInvoices.map(i => i.id)) + 1,
        description: `Affitto ${month}/${year}`,
        amount: 750,
        quantity: 1,
        unitPrice: 750,
        type: 'rent'
      }],
      subtotal: 750,
      tax: 0,
      total: 750,
      isPaid: false,
      status: 'pending',
      reminderSent: false,
      createdAt: today,
      updatedAt: today
    };
    
    this.mockInvoices.push(newInvoice);
    this.mockInvoiceItems.push(newInvoice.items[0]);
    newInvoices.push(newInvoice);
    
    return of(newInvoices).pipe(delay(1000));
  }

  // Metodo per calcolare il totale della fattura
  calculateInvoiceTotal(items: InvoiceItem[], taxRate: number = 0): { subtotal: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  // Metodi aggiuntivi per i componenti di fatturazione
  markAsPaid(invoiceId: number): Observable<Invoice> {
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.isPaid = true;
      invoice.status = 'paid';
      invoice.paymentDate = new Date();
      invoice.updatedAt = new Date();
      return of(invoice).pipe(delay(300));
    }
    return of({} as Invoice);
  }

  recordPayment(invoiceId: number, payment: Partial<PaymentRecord>): Observable<PaymentRecord> {
    const newPayment: PaymentRecord = {
      id: this.mockPaymentRecords.length > 0 ? Math.max(...this.mockPaymentRecords.map(p => p.id)) + 1 : 1,
      invoiceId,
      amount: payment.amount || 0,
      paymentDate: payment.paymentDate || new Date(),
      paymentMethod: payment.paymentMethod || 'bank_transfer',
      reference: payment.reference,
      notes: payment.notes,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mockPaymentRecords.push(newPayment);
    
    // Aggiorna lo stato della fattura
    const invoice = this.mockInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      const totalPaid = this.mockPaymentRecords
        .filter(p => p.invoiceId === invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid >= invoice.total) {
        invoice.isPaid = true;
        invoice.status = 'paid';
        invoice.paymentDate = new Date();
      }
      invoice.updatedAt = new Date();
    }
    
    return of(newPayment).pipe(delay(300));
  }

  removePayment(paymentId: number): Observable<void> {
    const index = this.mockPaymentRecords.findIndex(p => p.id === paymentId);
    if (index !== -1) {
      const payment = this.mockPaymentRecords[index];
      this.mockPaymentRecords.splice(index, 1);
      
      // Ricalcola lo stato della fattura
      const invoice = this.mockInvoices.find(i => i.id === payment.invoiceId);
      if (invoice) {
        const totalPaid = this.mockPaymentRecords
          .filter(p => p.invoiceId === payment.invoiceId)
          .reduce((sum, p) => sum + p.amount, 0);
        
        if (totalPaid < invoice.total) {
          invoice.isPaid = false;
          invoice.status = 'pending';
          invoice.paymentDate = undefined;
        }
        invoice.updatedAt = new Date();
      }
    }
    return of(void 0).pipe(delay(300));
  }
}
