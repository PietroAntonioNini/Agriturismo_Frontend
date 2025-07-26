import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Observable, Subject, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

import { Invoice, InvoiceItem, PaymentRecord } from '../../../shared/models';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

interface InvoiceTimeline {
  date: Date;
  action: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-invoice-detail',
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatExpansionModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ]
})
export class InvoiceDetailComponent implements OnInit, OnDestroy {
  // Esposizione di Math per il template
  Math = Math;

  // Data
  invoice$: Observable<Invoice | null> = of(null);
  paymentRecords$: Observable<PaymentRecord[]> = of([]);
  timeline$: Observable<InvoiceTimeline[]> = of([]);

  // Loading states
  isLoading = false;
  isLoadingPayments = false;

  // UI state
  selectedTab = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private notificationService: NotificationService,
    private confirmationDialog: ConfirmationDialogService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInvoiceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica i dati della fattura
   */
  private loadInvoiceData(): void {
    this.isLoading = true;

    this.invoice$ = this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const invoiceId = +params['id'];
        return this.invoiceService.getInvoiceById(invoiceId).pipe(
          catchError(error => {
            console.error('Errore caricamento fattura:', error);
            this.showError('Errore nel caricamento della fattura');
            return of(null);
          })
        );
      })
    );

    // Carica i record di pagamento
    this.paymentRecords$ = this.invoice$.pipe(
      takeUntil(this.destroy$),
      switchMap(invoice => {
        if (invoice) {
          this.isLoadingPayments = true;
          return this.invoiceService.getPaymentRecords(invoice.id).pipe(
            catchError(error => {
              console.error('Errore caricamento pagamenti:', error);
              return of([]);
            })
          );
        }
        return of([]);
      })
    );

    // Genera timeline
    this.timeline$ = this.invoice$.pipe(
      takeUntil(this.destroy$),
      switchMap(invoice => {
        if (invoice) {
          return of(this.generateTimeline(invoice));
        }
        return of([]);
      })
    );

    // Gestisce il loading
    this.invoice$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.isLoadingPayments = false;
      },
      error: () => {
        this.isLoading = false;
        this.isLoadingPayments = false;
      }
    });
  }

  /**
   * Genera la timeline della fattura
   */
  private generateTimeline(invoice: Invoice): InvoiceTimeline[] {
    const timeline: InvoiceTimeline[] = [];

    // Creazione fattura
    timeline.push({
      date: invoice.createdAt,
      action: 'Fattura creata',
      description: `Fattura ${invoice.invoiceNumber} creata per ${this.getTenantName(invoice.tenantId)}`,
      icon: 'receipt',
      color: '#2D7D46'
    });

    // Emissione
    timeline.push({
      date: invoice.issueDate,
      action: 'Fattura emessa',
      description: `Fattura emessa il ${this.formatDate(invoice.issueDate)}`,
      icon: 'send',
      color: '#3b82f6'
    });

    // Promemoria inviato
    if (invoice.reminderSent && invoice.reminderDate) {
      timeline.push({
        date: invoice.reminderDate,
        action: 'Promemoria inviato',
        description: 'Promemoria di pagamento inviato all\'inquilino',
        icon: 'notifications',
        color: '#f59e0b'
      });
    }

    // Pagamento
    if (invoice.isPaid && invoice.paymentDate) {
      timeline.push({
        date: invoice.paymentDate,
        action: 'Fattura pagata',
        description: `Pagamento ricevuto via ${this.getPaymentMethodLabel(invoice.paymentMethod)}`,
        icon: 'payments',
        color: '#10b981'
      });
    }

    // Aggiornamento
    if (invoice.updatedAt && invoice.updatedAt.getTime() !== invoice.createdAt.getTime()) {
      timeline.push({
        date: invoice.updatedAt,
        action: 'Fattura aggiornata',
        description: 'Ultimo aggiornamento della fattura',
        icon: 'edit',
        color: '#6366f1'
      });
    }

    // Ordina per data (più recente prima)
    return timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Azioni
   */
  editInvoice(invoice: Invoice): void {
    this.router.navigate(['/billing/edit', invoice.id]);
  }

  async deleteInvoice(invoice: Invoice): Promise<void> {
    const confirmed = await this.confirmationDialog.confirm(
      'Elimina Fattura',
      `Sei sicuro di voler eliminare la fattura ${invoice.invoiceNumber}? Questa azione non può essere annullata.`,
      {
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        dangerMode: true
      }
    ).toPromise();

    if (confirmed) {
      this.invoiceService.deleteInvoice(invoice.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.showSuccess('Fattura eliminata con successo');
          this.router.navigate(['/billing/list']);
          
          // Notifica
          this.notificationService.addNotification({
            type: 'lease',
            action: 'deleted',
            title: 'Fattura eliminata',
            subtitle: `Fattura ${invoice.invoiceNumber} rimossa`,
            icon: 'delete',
            color: '#ef4444'
          });
        },
        error: (error) => {
          this.showError('Errore durante l\'eliminazione della fattura');
          console.error('Errore eliminazione fattura:', error);
        }
      });
    }
  }

  async markAsPaid(invoice: Invoice): Promise<void> {
    const confirmed = await this.confirmationDialog.confirm(
      'Conferma Pagamento',
      'Sei sicuro di voler marcare questa fattura come pagata?',
      {
        confirmText: 'Conferma',
        cancelText: 'Annulla'
      }
    ).toPromise();

    if (confirmed) {
      this.invoiceService.markInvoiceAsPaid(invoice.id, new Date(), 'bank_transfer').pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (updatedInvoice) => {
          this.showSuccess('Fattura marcata come pagata');
          this.loadInvoiceData(); // Ricarica i dati
          
          // Notifica
          this.notificationService.addNotification({
            type: 'lease',
            action: 'updated',
            title: 'Fattura pagata',
            subtitle: `Fattura ${invoice.invoiceNumber} marcata come pagata`,
            icon: 'payments',
            color: '#10b981'
          });
        },
        error: (error) => {
          this.showError('Errore durante l\'aggiornamento della fattura');
          console.error('Errore aggiornamento fattura:', error);
        }
      });
    }
  }

  async sendReminder(invoice: Invoice): Promise<void> {
    this.invoiceService.sendInvoiceReminder(invoice.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.showSuccess('Promemoria inviato con successo');
          this.loadInvoiceData(); // Ricarica i dati
          
          // Notifica
          this.notificationService.addNotification({
            type: 'lease',
            action: 'updated',
            title: 'Promemoria inviato',
            subtitle: `Promemoria inviato per fattura ${invoice.invoiceNumber}`,
            icon: 'notifications',
            color: '#f59e0b'
          });
        } else {
          this.showWarning(result.message);
        }
      },
      error: (error) => {
        this.showError('Errore durante l\'invio del promemoria');
        console.error('Errore invio promemoria:', error);
      }
    });
  }

  printInvoice(invoice: Invoice): void {
    this.router.navigate(['/billing/print', invoice.id]);
  }

  recordPayment(invoice: Invoice): void {
    this.router.navigate(['/billing/payment', invoice.id]);
  }

  /**
   * Utility methods
   */
  getTenantName(tenantId: number): string {
    // TODO: Implementare servizio tenant
    return `Inquilino ${tenantId}`;
  }

  getApartmentName(apartmentId: number): string {
    // TODO: Implementare servizio apartment
    return `Appartamento ${apartmentId}`;
  }

  getStatusClass(invoice: Invoice): string {
    if (invoice.isPaid) return 'status-paid';
    
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (dueDate < today) return 'status-overdue';
    if (dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'status-due-soon';
    
    return 'status-unpaid';
  }

  getStatusLabel(invoice: Invoice): string {
    if (invoice.isPaid) return 'Pagata';
    
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (dueDate < today) return 'Scaduta';
    if (dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'In Scadenza';
    
    return 'Non Pagata';
  }

  getStatusIcon(invoice: Invoice): string {
    if (invoice.isPaid) return 'check_circle';
    
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    
    if (dueDate < today) return 'warning';
    if (dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'schedule';
    
    return 'pending';
  }

  getPaymentMethodLabel(method?: string): string {
    const methods = {
      'cash': 'Contanti',
      'bank_transfer': 'Bonifico Bancario',
      'credit_card': 'Carta di Credito',
      'check': 'Assegno'
    };
    return methods[method as keyof typeof methods] || 'Non specificato';
  }

  getItemTypeLabel(type: string): string {
    const types = {
      'rent': 'Affitto',
      'electricity': 'Elettricità',
      'water': 'Acqua',
      'gas': 'Gas',
      'maintenance': 'Manutenzione',
      'other': 'Altro'
    };
    return types[type as keyof typeof types] || type;
  }

  getItemTypeIcon(type: string): string {
    const icons = {
      'rent': 'home',
      'electricity': 'bolt',
      'water': 'water_drop',
      'gas': 'local_fire_department',
      'maintenance': 'build',
      'other': 'more_horiz'
    };
    return icons[type as keyof typeof icons] || 'label';
  }

  getItemTypeColor(type: string): string {
    const colors = {
      'rent': '#2D7D46',
      'electricity': '#f59e0b',
      'water': '#3b82f6',
      'gas': '#ef4444',
      'maintenance': '#8b5cf6',
      'other': '#6b7280'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('it-IT');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  getPeriodLabel(invoice: Invoice): string {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[invoice.month - 1]} ${invoice.year}`;
  }

  getDaysUntilDue(invoice: Invoice): number {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(invoice: Invoice): boolean {
    return !invoice.isPaid && new Date(invoice.dueDate) < new Date();
  }

  isDueSoon(invoice: Invoice): boolean {
    if (invoice.isPaid) return false;
    const daysUntilDue = this.getDaysUntilDue(invoice);
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  }

  /**
   * Notifiche
   */
  private showSuccess(message: string): void {
    this.notificationService.showSuccess(message);
  }

  private showWarning(message: string): void {
    this.notificationService.showError(message);
  }

  private showError(message: string): void {
    this.notificationService.showError(message);
  }
} 