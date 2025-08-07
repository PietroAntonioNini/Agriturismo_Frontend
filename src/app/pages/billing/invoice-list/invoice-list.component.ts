import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';

import { Invoice, InvoiceItem, PaymentRecord } from '../../../shared/models';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

interface InvoiceKPI {
  totalInvoiced: number;
  totalPaid: number;
  totalUnpaid: number;
  overdueInvoices: number;
  thisMonthInvoices: number;
  averagePaymentTime: number;
}

interface InvoiceFilter {
  status: 'all' | 'paid' | 'unpaid' | 'overdue';
  period: 'all' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  tenantId?: number;
  apartmentId?: number;
  searchText: string;
  startDate?: Date;
  endDate?: Date;
}

@Component({
  selector: 'app-invoice-list',
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    MatCheckboxModule
  ]
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Esposizione di Math per il template
  Math = Math;

  // Data
  dataSource = new MatTableDataSource<Invoice>([]);
  invoices$: Observable<Invoice[]> = of([]);
  kpi$: Observable<InvoiceKPI> = of({
    totalInvoiced: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    overdueInvoices: 0,
    thisMonthInvoices: 0,
    averagePaymentTime: 0
  });

  // Loading states
  isLoading = false;
  isLoadingKPI = false;

  // View mode
  viewMode: 'grid' | 'list' = 'grid';
  
  // Filters
  filter: InvoiceFilter = {
    status: 'all',
    period: 'all',
    searchText: ''
  };

  // Form controls
  searchControl = new FormControl('');
  statusFilterControl = new FormControl('all');
  periodFilterControl = new FormControl('all');
  tenantFilterControl = new FormControl<number | null>(null);
  apartmentFilterControl = new FormControl<number | null>(null);
  startDateControl = new FormControl<Date | null>(null);
  endDateControl = new FormControl<Date | null>(null);

  // Bulk actions
  selectedInvoices: Set<number> = new Set();
  selectAll = false;

  // Table columns
  displayedColumns: string[] = [
    'select',
    'invoiceNumber',
    'tenant',
    'apartment',
    'period',
    'total',
    'status',
    'dueDate',
    'actions'
  ];

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  private destroy$ = new Subject<void>();

  // Cache per nomi di inquilini e appartamenti
  private tenantNames: { [id: number]: string } = {};
  private apartmentNames: { [id: number]: string } = {};

  constructor(
    private invoiceService: InvoiceService,
    private notificationService: NotificationService,
    private confirmationDialog: ConfirmationDialogService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inizializza i dati e le osservazioni
   */
  private initializeData(): void {
    this.isLoading = true;
    
    // Carica le fatture
    this.invoices$ = this.invoiceService.getAllInvoices();
    
    // Calcola i KPI
    this.kpi$ = this.invoices$.pipe(
      map(invoices => this.calculateKPI(invoices))
    );

    // Setup del data source
    this.invoices$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (invoices) => {
        this.dataSource.data = invoices;
        this.setupTable();
        // Forza l'applicazione del filtro per attivare il filterPredicate
        this.dataSource.filter = ' ';
        this.dataSource.filter = '';
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Errore nel caricamento delle fatture');
        console.error('Errore caricamento fatture:', error);
      }
    });
  }

  /**
   * Configura i filtri reattivi
   */
  private setupFilters(): void {
    // Ricerca con debounce
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchText => {
      this.filter.searchText = searchText || '';
      this.dataSource.filter = searchText || '';
    });

    // Filtri di stato
    this.statusFilterControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.filter.status = (status as 'all' | 'paid' | 'unpaid' | 'overdue') || 'all';
      this.applyFilters();
    });

    // Filtri di periodo
    this.periodFilterControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(period => {
      this.filter.period = (period as 'all' | 'this_month' | 'last_month' | 'this_year' | 'custom') || 'all';
      this.applyFilters();
    });

    // Filtri date
    combineLatest([
      this.startDateControl.valueChanges.pipe(startWith(null)),
      this.endDateControl.valueChanges.pipe(startWith(null))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([startDate, endDate]) => {
      this.filter.startDate = startDate || undefined;
      this.filter.endDate = endDate || undefined;
      this.applyFilters();
    });
  }



  /**
   * Configura la tabella
   */
  private setupTable(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Filtro personalizzato che gestisce tutti i tipi di filtri
    this.dataSource.filterPredicate = (invoice: Invoice, filter: string) => {
      // Filtro di ricerca testuale
      const searchText = filter.toLowerCase();
      const matchesSearch = !searchText || 
        invoice.invoiceNumber.toLowerCase().includes(searchText) ||
        this.getTenantName(invoice.tenantId).toLowerCase().includes(searchText) ||
        this.getApartmentName(invoice.apartmentId).toLowerCase().includes(searchText);

      if (!matchesSearch) return false;

      // Filtro per stato
      if (this.filter.status !== 'all') {
        const today = new Date();
        switch (this.filter.status) {
          case 'paid':
            if (!invoice.isPaid) return false;
            break;
          case 'unpaid':
            if (invoice.isPaid || new Date(invoice.dueDate) < today) return false;
            break;
          case 'overdue':
            if (invoice.isPaid || new Date(invoice.dueDate) >= today) return false;
            break;
        }
      }

      // Filtro per periodo
      if (this.filter.period !== 'all') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        switch (this.filter.period) {
          case 'this_month':
            if (invoice.month !== currentMonth + 1 || invoice.year !== currentYear) return false;
            break;
          case 'last_month':
            const lastMonth = currentMonth === 0 ? 12 : currentMonth;
            const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            if (invoice.month !== lastMonth || invoice.year !== lastYear) return false;
            break;
          case 'this_year':
            if (invoice.year !== currentYear) return false;
            break;
        }
      }

      // Filtro per date personalizzate
      if (this.filter.startDate || this.filter.endDate) {
        const issueDate = new Date(invoice.issueDate);
        if (this.filter.startDate && issueDate < this.filter.startDate) return false;
        if (this.filter.endDate && issueDate > this.filter.endDate) return false;
      }

      return true;
    };
  }

  /**
   * Applica i filtri
   */
  private applyFilters(): void {
    // Forza il refresh del filtro per applicare tutti i filtri
    const currentFilter = this.dataSource.filter;
    this.dataSource.filter = '';
    this.dataSource.filter = currentFilter || ' ';
  }

  /**
   * Calcola i KPI
   */
  private calculateKPI(invoices: Invoice[]): InvoiceKPI {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paidInvoices = invoices.filter(invoice => invoice.isPaid);
    const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalUnpaid = totalInvoiced - totalPaid;
    const overdueInvoices = invoices.filter(invoice => 
      !invoice.isPaid && new Date(invoice.dueDate) < today
    ).length;
    const thisMonthInvoices = invoices.filter(invoice => 
      invoice.month === currentMonth && invoice.year === currentYear
    ).length;

    // Calcola tempo medio di pagamento
    const paymentTimes = paidInvoices
      .filter(invoice => invoice.paymentDate)
      .map(invoice => {
        const issueDate = new Date(invoice.issueDate);
        const paymentDate = new Date(invoice.paymentDate!);
        return (paymentDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24);
      });

    const averagePaymentTime = paymentTimes.length > 0 
      ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
      : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      overdueInvoices,
      thisMonthInvoices,
      averagePaymentTime
    };
  }

  /**
   * Cambia modalità di visualizzazione
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  /**
   * Resetta tutti i filtri
   */
  resetFilters(): void {
    this.filter = {
      status: 'all',
      period: 'all',
      searchText: ''
    };
    
    this.searchControl.setValue('');
    this.statusFilterControl.setValue('all');
    this.periodFilterControl.setValue('all');
    this.tenantFilterControl.setValue(null);
    this.apartmentFilterControl.setValue(null);
    this.startDateControl.setValue(null);
    this.endDateControl.setValue(null);
    
    this.dataSource.filter = '';
  }

  /**
   * Gestisce la selezione di tutte le fatture
   */
  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedInvoices.clear();
    } else {
      this.dataSource.filteredData.forEach(invoice => {
        this.selectedInvoices.add(invoice.id);
      });
    }
    this.selectAll = !this.selectAll;
  }

  /**
   * Gestisce la selezione di una singola fattura
   */
  toggleInvoiceSelection(invoiceId: number): void {
    if (this.selectedInvoices.has(invoiceId)) {
      this.selectedInvoices.delete(invoiceId);
    } else {
      this.selectedInvoices.add(invoiceId);
    }
    
    // Aggiorna lo stato "seleziona tutto"
    this.selectAll = this.selectedInvoices.size === this.dataSource.filteredData.length;
  }

  /**
   * Verifica se una fattura è selezionata
   */
  isInvoiceSelected(invoiceId: number): boolean {
    return this.selectedInvoices.has(invoiceId);
  }

  /**
   * Azioni bulk
   */
  async markSelectedAsPaid(): Promise<void> {
    if (this.selectedInvoices.size === 0) {
      this.showWarning('Seleziona almeno una fattura');
      return;
    }

    const confirmed = await this.confirmationDialog.confirm(
      'Conferma Pagamento',
      `Sei sicuro di voler marcare ${this.selectedInvoices.size} fattura/e come pagate?`,
      {
        confirmText: 'Conferma',
        cancelText: 'Annulla'
      }
    ).toPromise();

    if (confirmed) {
      this.isLoading = true;
      
      const promises = Array.from(this.selectedInvoices).map(invoiceId =>
        this.invoiceService.markInvoiceAsPaid(invoiceId, new Date(), 'bank_transfer').toPromise()
      );

      try {
        await Promise.all(promises);
        this.selectedInvoices.clear();
        this.selectAll = false;
        // Ricarica i dati
        this.invoices$ = this.invoiceService.getAllInvoices();
        this.showSuccess(`${promises.length} fattura/e marcate come pagate`);
        
        // Notifica
        this.notificationService.addNotification({
          type: 'lease',
          action: 'updated',
          title: 'Fatture pagate',
          subtitle: `${promises.length} fatture marcate come pagate`,
          icon: 'payments',
          color: '#10b981'
        });
      } catch (error) {
        this.showError('Errore durante l\'aggiornamento delle fatture');
        console.error('Errore aggiornamento fatture:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  async sendRemindersToSelected(): Promise<void> {
    if (this.selectedInvoices.size === 0) {
      this.showWarning('Seleziona almeno una fattura');
      return;
    }

    const confirmed = await this.confirmationDialog.confirm(
      'Invia Promemoria',
      `Sei sicuro di voler inviare promemoria per ${this.selectedInvoices.size} fattura/e?`,
      {
        confirmText: 'Invia',
        cancelText: 'Annulla'
      }
    ).toPromise();

    if (confirmed) {
      this.isLoading = true;
      
      const promises = Array.from(this.selectedInvoices).map(invoiceId =>
        this.invoiceService.sendInvoiceReminder(invoiceId).toPromise()
      );

      try {
        await Promise.all(promises);
        this.showSuccess(`Promemoria inviati per ${promises.length} fattura/e`);
        
        // Notifica
        this.notificationService.addNotification({
          type: 'lease',
          action: 'updated',
          title: 'Promemoria inviati',
          subtitle: `${promises.length} promemoria inviati`,
          icon: 'notifications',
          color: '#f59e0b'
        });
      } catch (error) {
        this.showError('Errore durante l\'invio dei promemoria');
        console.error('Errore invio promemoria:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  /**
   * Azioni singole
   */
  viewInvoice(invoiceId: number): void {
    this.router.navigate(['/billing/detail', invoiceId]);
  }

  editInvoice(invoiceId: number): void {
    this.router.navigate(['/billing/edit', invoiceId]);
  }

  async deleteInvoice(invoiceId: number): Promise<void> {
    const confirmed = await this.confirmationDialog.confirm(
      'Elimina Fattura',
      'Sei sicuro di voler eliminare questa fattura? Questa azione non può essere annullata.',
      {
        confirmText: 'Elimina',
        cancelText: 'Annulla',
        dangerMode: true
      }
    ).toPromise();

    if (confirmed) {
      this.invoiceService.deleteInvoice(invoiceId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          // Ricarica i dati
          this.invoices$ = this.invoiceService.getAllInvoices();
          this.showSuccess('Fattura eliminata con successo');
          
          // Notifica
          this.notificationService.addNotification({
            type: 'lease',
            action: 'deleted',
            title: 'Fattura eliminata',
            subtitle: 'Fattura rimossa dal sistema',
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

  async markAsPaid(invoiceId: number): Promise<void> {
    const confirmed = await this.confirmationDialog.confirm(
      'Conferma Pagamento',
      'Sei sicuro di voler marcare questa fattura come pagata?',
      {
        confirmText: 'Conferma',
        cancelText: 'Annulla'
      }
    ).toPromise();

    if (confirmed) {
      this.invoiceService.markInvoiceAsPaid(invoiceId, new Date(), 'bank_transfer').pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          // Ricarica i dati
          this.invoices$ = this.invoiceService.getAllInvoices();
          this.showSuccess('Fattura marcata come pagata');
        },
        error: (error) => {
          this.showError('Errore durante l\'aggiornamento della fattura');
          console.error('Errore aggiornamento fattura:', error);
        }
      });
    }
  }

  async sendReminder(invoiceId: number): Promise<void> {
    this.invoiceService.sendInvoiceReminder(invoiceId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.showSuccess('Promemoria inviato con successo');
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

  printInvoice(invoiceId: number): void {
    this.router.navigate(['/billing/print', invoiceId]);
  }

  /**
   * Utility methods
   */
  getTenantName(tenantId: number): string {
    // Cache locale per i nomi dei tenant
    if (!this.tenantNames[tenantId]) {
      this.invoiceService.getTenantName(tenantId).subscribe(name => {
        this.tenantNames[tenantId] = name;
      });
      return `Inquilino ${tenantId}`;
    }
    return this.tenantNames[tenantId];
  }

  getApartmentName(apartmentId: number): string {
    // Cache locale per i nomi degli appartamenti
    if (!this.apartmentNames[apartmentId]) {
      this.invoiceService.getApartmentName(apartmentId).subscribe(name => {
        this.apartmentNames[apartmentId] = name;
      });
      return `Appartamento ${apartmentId}`;
    }
    return this.apartmentNames[apartmentId];
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

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  getPeriodLabel(invoice: Invoice): string {
    const months = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ];
    return `${months[invoice.month - 1]} ${invoice.year}`;
  }

  getDaysOverdue(invoice: Invoice): number {
    if (invoice.isPaid) return 0;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    if (dueDate < today) {
      return Math.abs(Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 0;
  }

  getDaysUntilDue(invoice: Invoice): number {
    if (invoice.isPaid) return 0;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    if (dueDate >= today) {
      return Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  isOverdue(invoice: Invoice): boolean {
    return !invoice.isPaid && new Date(invoice.dueDate) < new Date();
  }

  getPageInfo(): string {
    const start = (this.paginator?.pageIndex || 0) * (this.paginator?.pageSize || 10) + 1;
    const end = Math.min((this.paginator?.pageIndex || 0 + 1) * (this.paginator?.pageSize || 10), this.dataSource.filteredData.length);
    return `${start} - ${end} di ${this.dataSource.filteredData.length}`;
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