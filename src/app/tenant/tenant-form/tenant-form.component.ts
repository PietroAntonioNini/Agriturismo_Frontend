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
  currentTenant: Tenant = {} as Tenant;
  tenantForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  tenantId: number | null = null;
  errorMessage: string | null = null;
  frontPreview: string | null = null;
  backPreview: string | null = null;
  frontImageFile: File | null = null;
  backImageFile: File | null = null;
  fileInputFront: any;
  fileInputBack: any;

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
    } else {
      this.isEditMode = false;
      this.currentTenant = {} as Tenant;
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
      documentFrontImage: [null],
      documentBackImage: [null],
      address: [''],
      communicationPreferences: this.fb.group({
        email: [false],
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
        this.currentTenant = tenant;
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
      firstName: this.currentTenant.firstName,
      lastName: this.currentTenant.lastName,
      email: this.currentTenant.email || '',
      phone: this.currentTenant.phone,
      documentType: this.currentTenant.documentType,
      documentNumber: this.currentTenant.documentNumber,
      documentExpiryDate: this.currentTenant.documentExpiryDate,
      address: this.currentTenant.address || '',
      communicationPreferences: {
        email: this.currentTenant.communicationPreferences?.email || false,
        sms: this.currentTenant.communicationPreferences?.sms || false,
        whatsapp: this.currentTenant.communicationPreferences?.whatsapp || false
      },
      notes: this.currentTenant.notes || '',
      createdAt: this.currentTenant.createdAt,
      updatedAt: this.currentTenant.updatedAt,
    });
    
    // Set document image previews if available
    if (this.currentTenant.documentFrontImage) {
      this.frontPreview = this.currentTenant.documentFrontImage;
    }
    
    if (this.currentTenant.documentBackImage) {
      this.backPreview = this.currentTenant.documentBackImage;
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
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }
    if (control?.hasError('pattern')) {
      if (controlName === 'phone') {
        return 'Formato telefono non valido (solo numeri, spazi e +)';
      }
      return 'Formato non valido';
    }
    return 'Campo non valido';
  }

  // Fix method names to match HTML template
  onFrontImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.frontImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.frontPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onBackImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.backImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.backPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeFrontImage(): void {
    this.frontPreview = null;
    this.frontImageFile = null;
    this.tenantForm.get('documentFrontImage')?.setValue(null);
  }

  removeBackImage(): void {
    this.backPreview = null;
    this.backImageFile = null;
    this.tenantForm.get('documentBackImage')?.setValue(null);
  }

  onSubmit(): void {
    if (this.tenantForm.invalid) {
      // Mark fields as touched to show errors
      Object.keys(this.tenantForm.controls).forEach(key => {
        const control = this.tenantForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = null;
    
    // Update current tenant with form values
    this.currentTenant = {
      ...this.currentTenant,
      ...this.tenantForm.value
    };
    
    // Use the updated service methods with images
    if (this.isEditMode && this.tenantId) {
      this.tenantService.updateTenant(
        this.tenantId, 
        this.currentTenant,
        this.frontImageFile || undefined,
        this.backImageFile || undefined
      ).subscribe({
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
      // Create new tenant
      this.tenantService.createTenant(
        this.currentTenant,
        this.frontImageFile || undefined,
        this.backImageFile || undefined
      ).subscribe({
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
}