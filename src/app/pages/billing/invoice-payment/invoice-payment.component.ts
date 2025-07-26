import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';

import { Observable, Subject, takeUntil, switchMap, of } from 'rxjs';

import { Invoice, PaymentRecord } from '../../../shared/models/invoice.model';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

interface PaymentMethod {
  value: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-invoice-payment',
  templateUrl: './invoice-payment.component.html',
  styleUrls: ['./invoice-payment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatStepperModule,
    MatRadioModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatMenuModule
  ]
})
export class InvoicePaymentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  paymentForm!: FormGroup;
  invoice$!: Observable<Invoice | null>;
  paymentHistory$!: Observable<PaymentRecord[]>;
  isLoading = false;
  isProcessing = false;
  selectedTab = 0;
  
  // Dati per la tabella pagamenti
  displayedColumns: string[] = ['date', 'amount', 'method', 'reference', 'status', 'actions'];
  
  // Metodi di pagamento disponibili
  paymentMethods: PaymentMethod[] = [
    {
      value: 'bank_transfer',
      label: 'Bonifico Bancario',
      icon: 'account_balance',
      description: 'Trasferimento bancario diretto'
    },
    {
      value: 'cash',
      label: 'Contanti',
      icon: 'money',
      description: 'Pagamento in contanti'
    },
    {
      value: 'check',
      label: 'Assegno',
      icon: 'receipt',
      description: 'Pagamento tramite assegno'
    },
    {
      value: 'credit_card',
      label: 'Carta di Credito',
      icon: 'credit_card',
      description: 'Pagamento con carta di credito'
    },
    {
      value: 'paypal',
      label: 'PayPal',
      icon: 'payment',
      description: 'Pagamento tramite PayPal'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private notificationService: NotificationService,
    private confirmationDialogService: ConfirmationDialogService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadInvoiceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      // Informazioni pagamento
      amount: ['', [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['bank_transfer', Validators.required],
      paymentDate: [new Date(), Validators.required],
      reference: [''],
      
      // Note
      notes: [''],
      
      // Opzioni
      markAsPaid: [false],
      sendReceipt: [true]
    });
  }

  private loadInvoiceData(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = params['id'];
        if (id) {
          this.isLoading = true;
          return this.invoiceService.getInvoiceById(+id);
        }
        return of(null);
      })
    ).subscribe({
      next: (invoice) => {
        this.isLoading = false;
        if (invoice) {
          this.invoice$ = of(invoice);
          this.loadPaymentHistory(invoice.id);
          this.setupPaymentForm(invoice);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notificationService.showError('Errore nel caricamento della fattura');
        console.error('Errore caricamento fattura:', error);
      }
    });
  }

  private loadPaymentHistory(invoiceId: number): void {
    this.paymentHistory$ = this.invoiceService.getPaymentRecords(invoiceId);
  }

  private setupPaymentForm(invoice: Invoice): void {
    // Imposta l'importo rimanente come valore di default
    const remainingAmount = this.calculateRemainingAmount(invoice);
    this.paymentForm.patchValue({
      amount: remainingAmount
    });
  }

  private calculateRemainingAmount(invoice: Invoice): number {
    const totalPaid = invoice.paymentRecords?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    return Math.max(0, invoice.total - totalPaid);
  }

  // Gestione pagamento
  onSubmitPayment(): void {
    if (this.paymentForm.valid) {
      this.isProcessing = true;
      const formData = this.paymentForm.value;
      
      this.invoice$.pipe(
        takeUntil(this.destroy$),
        switchMap(invoice => {
          if (!invoice) throw new Error('Fattura non trovata');
          
          const payment: Partial<PaymentRecord> = {
            invoiceId: invoice.id,
            amount: formData.amount,
            paymentMethod: formData.paymentMethod,
            paymentDate: formData.paymentDate,
            reference: formData.reference,
            notes: formData.notes,
            status: 'completed'
          };

          return this.invoiceService.recordPayment(invoice.id, payment);
        })
      ).subscribe({
        next: (result) => {
          this.isProcessing = false;
          this.notificationService.showSuccess('Pagamento registrato con successo');
          
          // Ricarica i dati
          this.loadInvoiceData();
          
          // Reset form
          this.paymentForm.reset({
            paymentMethod: 'bank_transfer',
            paymentDate: new Date(),
            markAsPaid: false,
            sendReceipt: true
          });
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.showError('Errore nella registrazione del pagamento');
          console.error('Errore registrazione pagamento:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  // Gestione pagamento completo
  markAsPaid(): void {
    this.invoice$.pipe(
      takeUntil(this.destroy$),
      switchMap(invoice => {
        if (!invoice) throw new Error('Fattura non trovata');
        
        return this.confirmationDialogService.confirm(
          'Conferma Pagamento Completo',
          `Sei sicuro di voler marcare la fattura ${invoice.invoiceNumber} come completamente pagata?`,
          {
            cancelText: 'Annulla',
            confirmText: 'Conferma'
          }
        );
      })
    ).subscribe(result => {
      if (result) {
        this.invoice$.pipe(
          takeUntil(this.destroy$),
          switchMap(invoice => {
            if (!invoice) throw new Error('Fattura non trovata');
            return this.invoiceService.markAsPaid(invoice.id);
          })
        ).subscribe({
          next: () => {
            this.notificationService.showSuccess('Fattura marcata come pagata');
            this.loadInvoiceData();
          },
          error: (error) => {
            this.notificationService.showError('Errore nell\'aggiornamento della fattura');
            console.error('Errore aggiornamento fattura:', error);
          }
        });
      }
    });
  }

  // Gestione rimozione pagamento
  removePayment(payment: PaymentRecord): void {
    this.confirmationDialogService.confirm(
      'Conferma Rimozione',
      'Sei sicuro di voler rimuovere questo pagamento? L\'operazione non può essere annullata.',
      {
        cancelText: 'Annulla',
        confirmText: 'Rimuovi'
      }
    ).subscribe(result => {
      if (result) {
        this.invoiceService.removePayment(payment.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.notificationService.showSuccess('Pagamento rimosso con successo');
            this.loadInvoiceData();
          },
          error: (error) => {
            this.notificationService.showError('Errore nella rimozione del pagamento');
            console.error('Errore rimozione pagamento:', error);
          }
        });
      }
    });
  }

  // Utility methods
  getPaymentMethodLabel(method: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.value === method);
    return paymentMethod ? paymentMethod.label : method;
  }

  getPaymentMethodIcon(method: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.value === method);
    return paymentMethod ? paymentMethod.icon : 'payment';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warn';
      case 'failed': return 'error';
      default: return 'default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completato';
      case 'pending': return 'In Attesa';
      case 'failed': return 'Fallito';
      default: return status;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  // Validazione campi
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Campo obbligatorio';
      if (field.errors['min']) return `Valore minimo: ${field.errors['min'].min}`;
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.paymentForm.controls).forEach(key => {
      const control = this.paymentForm.get(key);
      control?.markAsTouched();
    });
  }

  // Utility methods per tenant e apartment
  getTenantName(tenantId: number): string {
    // TODO: Implementare servizio tenant
    return `Inquilino ${tenantId}`;
  }

  getApartmentName(apartmentId: number): string {
    // TODO: Implementare servizio apartment
    return `Appartamento ${apartmentId}`;
  }

  getTotalPaid(invoice: Invoice): number {
    return invoice.paymentRecords?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
  }

  getRemainingAmount(invoice: Invoice): number {
    return Math.max(0, invoice.total - this.getTotalPaid(invoice));
  }

  getPaymentProgress(invoice: Invoice): number {
    const totalPaid = this.getTotalPaid(invoice);
    return invoice.total > 0 ? Math.round((totalPaid / invoice.total) * 100) : 0;
  }

  getPaymentProgressColor(invoice: Invoice): string {
    const progress = this.getPaymentProgress(invoice);
    if (progress >= 100) return 'primary';
    if (progress >= 50) return 'accent';
    return 'warn';
  }

  getInvoiceStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'primary';
      case 'pending': return 'warn';
      case 'overdue': return 'error';
      default: return 'default';
    }
  }

  getInvoiceStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Pagata';
      case 'pending': return 'In Attesa';
      case 'overdue': return 'Scaduta';
      default: return status;
    }
  }

  // Navigazione
  onBack(): void {
    this.router.navigate(['/billing/list']);
  }

  onViewInvoice(invoice: Invoice): void {
    this.router.navigate(['/billing/detail', invoice.id]);
  }
} 