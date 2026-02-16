import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Invoice, PaymentRecord } from '../../../shared/models/invoice.model';
import { InvoiceService } from '../../../shared/services/invoice.service';

export interface RegisterPaymentDialogData {
  invoice: Invoice;
  totalPaid: number;
}

@Component({
  standalone: true,
  selector: 'app-register-payment-dialog',
  templateUrl: './register-payment-dialog.component.html',
  styleUrls: ['./register-payment-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class RegisterPaymentDialogComponent {
  private dialogRef = inject(MatDialogRef<RegisterPaymentDialogComponent>);
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);

  form!: FormGroup;
  isSubmitting = false;

  paymentMethods = [
    { value: 'bank_transfer', label: 'Bonifico Bancario', icon: 'account_balance' },
    { value: 'cash', label: 'Contanti', icon: 'money' },
    { value: 'credit_card', label: 'Carta di Credito', icon: 'credit_card' },
    { value: 'check', label: 'Assegno', icon: 'receipt_long' }
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: RegisterPaymentDialogData) {
    const remaining = Math.max(0, data.invoice.total - data.totalPaid);
    this.form = this.fb.group({
      amount: [remaining, [Validators.required, Validators.min(0.01)]],
      paymentDate: [new Date(), Validators.required],
      paymentMethod: ['bank_transfer', Validators.required],
      reference: ['']
    });
  }

  get totalInvoice(): number {
    return this.data.invoice.total;
  }

  get totalPaid(): number {
    return this.data.totalPaid;
  }

  get remainingAmount(): number {
    return Math.max(0, this.totalInvoice - this.totalPaid);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  }

  getPaymentMethodLabel(value: string): string {
    return this.paymentMethods.find(m => m.value === value)?.label || value;
  }

  getPaymentMethodIcon(value: string): string {
    return this.paymentMethods.find(m => m.value === value)?.icon || 'payment';
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    const raw = this.form.getRawValue();
    const payload = {
      amount: Number(raw.amount),
      paymentDate: raw.paymentDate,
      paymentMethod: raw.paymentMethod,
      reference: raw.reference || undefined,
      status: 'completed' as const
    };
    this.invoiceService.recordPayment(this.data.invoice.id, payload).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
