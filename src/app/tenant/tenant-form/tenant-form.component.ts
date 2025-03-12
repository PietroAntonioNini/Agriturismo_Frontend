import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TenantService } from '../../shared/services/tenant.service';
import { Tenant } from '../../shared/models';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.scss']
})
export class TenantFormComponent implements OnInit {
  tenantForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  tenantId: number | null = null;
  errorMessage: string | null = null;
  
  // Opzioni per tipo documento
  documentTypes = [
    'Carta d\'identità',
    'Passaporto',
    'Patente di guida',
    'Permesso di soggiorno'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tenantService: TenantService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Controlla se siamo in modalità modifica
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.tenantId = +id;
      this.loadTenantData(+id);
    }
  }

  initForm(): void {
    this.tenantForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      documentExpiryDate: ['', Validators.required],
      address: [''],
      communicationPreferences: this.fb.group({
        email: [true],
        sms: [false],
        whatsapp: [false]
      }),
      notes: ['']
    });
  }

  loadTenantData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.tenantService.getTenantById(id).subscribe({
      next: (tenant) => {
        this.updateForm(tenant);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei dati dell\'inquilino', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'inquilino.';
        this.isLoading = false;
      }
    });
  }

  updateForm(tenant: Tenant): void {
    this.tenantForm.patchValue({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      documentType: tenant.documentType,
      documentNumber: tenant.documentNumber,
      documentExpiryDate: tenant.documentExpiryDate,
      address: tenant.address,
      communicationPreferences: {
        email: tenant.communicationPreferences.email,
        sms: tenant.communicationPreferences.sms,
        whatsapp: tenant.communicationPreferences.whatsapp
      },
      notes: tenant.notes
    });
  }

  onSubmit(): void {
    if (this.tenantForm.invalid) {
      // Marca tutti i campi come touched per mostrare gli errori
      Object.keys(this.tenantForm.controls).forEach(key => {
        const control = this.tenantForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const tenantData = this.tenantForm.value;

    if (this.isEditMode && this.tenantId) {
      // Aggiorna un inquilino esistente
      this.tenantService.updateTenant(this.tenantId, tenantData).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Inquilino aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/tenant/detail', this.tenantId]);
        },
        error: (error) => {
          console.error('Errore durante l\'aggiornamento dell\'inquilino', error);
          this.errorMessage = 'Si è verificato un errore durante l\'aggiornamento dell\'inquilino.';
          this.isLoading = false;
        }
      });
    } else {
      // Crea un nuovo inquilino
      this.tenantService.createTenant(tenantData).subscribe({
        next: (tenant) => {
          this.isLoading = false;
          this.snackBar.open('Inquilino creato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/tenant/detail', tenant.id]);
        },
        error: (error) => {
          console.error('Errore durante la creazione dell\'inquilino', error);
          this.errorMessage = 'Si è verificato un errore durante la creazione dell\'inquilino.';
          this.isLoading = false;
        }
      });
    }
  }

  getFormControlError(controlName: string): string {
    const control = this.tenantForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    if (control?.hasError('pattern')) {
      return 'Formato non valido';
    }
    if (control?.hasError('maxlength')) {
      return `Massimo ${control.getError('maxlength').requiredLength} caratteri`;
    }
    return '';
  }
} 