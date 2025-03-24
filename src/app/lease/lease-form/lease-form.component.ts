import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNativeDateModule } from '@angular/material/core';

// Services
import { GenericApiService } from '../../shared/services/generic-api.service';

// Models
import { Lease, LeaseFormData } from '../../shared/models/lease.model';
import { Tenant } from '../../shared/models';
import { Apartment } from '../../shared/models';

@Component({
  selector: 'app-lease-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatNativeDateModule
  ],
  templateUrl: './lease-form.component.html',
  styleUrls: ['./lease-form.component.scss']
})
export class LeaseFormComponent implements OnInit {
  leaseForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  leaseId: number | null = null;
  errorMessage: string | null = null;
  
  tenants: Tenant[] = [];
  apartments: Apartment[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTenants();
    this.loadApartments();
    
    // Controlla se siamo in modalità modifica
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.leaseId = +id;
      this.loadLease(+id);
    }
  }

  initForm(): void {
    this.leaseForm = this.fb.group({
      tenantId: ['', Validators.required],
      apartmentId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      monthlyRent: ['', [Validators.required, Validators.min(0)]],
      securityDeposit: ['', [Validators.required, Validators.min(0)]],
      paymentDueDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      termsAndConditions: ['', Validators.required],
      specialClauses: [''],
      notes: ['']
    });
  }

  loadLease(id: number): void {
    this.isLoading = true;
    this.apiService.getById<Lease>('leases', id).subscribe({
      next: (lease) => {
        this.leaseForm.patchValue({
          tenantId: lease.tenantId,
          apartmentId: lease.apartmentId,
          startDate: new Date(lease.startDate),
          endDate: new Date(lease.endDate),
          monthlyRent: lease.monthlyRent,
          securityDeposit: lease.securityDeposit,
          paymentDueDay: lease.paymentDueDay,
          termsAndConditions: lease.termsAndConditions,
          specialClauses: lease.specialClauses || '',
          notes: lease.notes || ''
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento del contratto', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento del contratto.';
        this.isLoading = false;
      }
    });
  }

  loadTenants(): void {
    this.apiService.getAll<Tenant>('tenants').subscribe({
      next: (tenants) => {
        this.tenants = tenants;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
      }
    });
  }
  
  loadApartments(): void {
    this.apiService.getAll<Apartment>('apartments').subscribe({
      next: (apartments) => {
        this.apartments = apartments;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
      }
    });
  }

  onSubmit(): void {
    if (this.leaseForm.invalid) {
      this.markFormGroupTouched(this.leaseForm);
      return;
    }

    const formData = this.leaseForm.value;
    this.isSubmitting = true;

    if (this.isEditMode && this.leaseId) {
      this.apiService.update<Lease>('leases', this.leaseId, formData).subscribe({
        next: () => {
          this.snackBar.open('Contratto aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/lease/list']);
        },
        error: (error) => {
          console.error('Errore durante l\'aggiornamento del contratto', error);
          this.snackBar.open('Si è verificato un errore durante l\'aggiornamento del contratto', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.isSubmitting = false;
        }
      });
    } else {
      this.apiService.create<Lease>('leases', formData).subscribe({
        next: () => {
          this.snackBar.open('Contratto creato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/lease/list']);
        },
        error: (error) => {
          console.error('Errore durante la creazione del contratto', error);
          this.snackBar.open('Si è verificato un errore durante la creazione del contratto', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.isSubmitting = false;
        }
      });
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/lease/list']);
  }

  getFormTitle(): string {
    return this.isEditMode ? 'Modifica Contratto' : 'Nuovo Contratto';
  }

  getSubmitButtonText(): string {
    return this.isEditMode ? 'Aggiorna' : 'Crea';
  }
}