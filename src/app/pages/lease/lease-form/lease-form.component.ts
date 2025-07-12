import { Component, OnInit, ViewChild, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';

// Services
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { ContractGeneratorService } from '../../../shared/services/contract-generator.service';
import { ContractTemplatesService } from '../../../shared/services/contract-templates.service';

// Models
import { Lease, LeaseFormData } from '../../../shared/models/lease.model';
import { Tenant } from '../../../shared/models';
import { Apartment } from '../../../shared/models';

// Configurazione formato date italiano
const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

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
    MatStepperModule,
    MatTooltipModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' }
  ],
  templateUrl: './lease-form.component.html',
  styleUrls: ['./lease-form.component.scss']
})
export class LeaseFormComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;
  
  // Form groups for stepper
  partiesFormGroup!: FormGroup;
  termsFormGroup!: FormGroup;
  conditionsFormGroup!: FormGroup;
  
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  leaseId: number | null = null;
  errorMessage: string | null = null;
  
  // Proprietà per gestire dialog vs pagina normale
  isDialogMode = false;
  
  tenants: Tenant[] = [];
  apartments: Apartment[] = [];
  selectedTenant: Tenant | null = null;
  selectedApartment: Apartment | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    private contractGenerator: ContractGeneratorService,
    private contractTemplates: ContractTemplatesService,
    private dateAdapter: DateAdapter<Date>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    @Optional() public dialogRef: MatDialogRef<LeaseFormComponent>
  ) {
    // Configura il locale italiano per i datepicker
    this.dateAdapter.setLocale('it-IT');
    
    // Determina se siamo in modalità dialog
    this.isDialogMode = !!this.dialogRef;
    
    // Se siamo in modalità dialog e abbiamo dati, configura l'edit mode
    if (this.isDialogMode && this.dialogData?.leaseId) {
      this.isEditMode = true;
      this.leaseId = this.dialogData.leaseId;
    }
  }

  ngOnInit(): void {
    this.initFormGroups();
    this.loadTenants();
    this.loadApartments();
    
    // Controlla se siamo in modalità modifica
    // Può essere sia dalla rotta che dai dati del dialog
    const routeId = this.route.snapshot.paramMap.get('id');
    const dialogLeaseId = this.dialogData?.leaseId;
    
    if (routeId || dialogLeaseId) {
      this.isEditMode = true;
      this.leaseId = dialogLeaseId || +routeId!;
      if (this.leaseId) {
        this.loadLease(this.leaseId);
      }
    }

    // Aggiungi listener per i cambiamenti di tenant e apartment
    this.partiesFormGroup.get('tenantId')?.valueChanges.subscribe(tenantId => {
      this.selectedTenant = this.tenants.find(t => t.id === tenantId) || null;
    });

    this.partiesFormGroup.get('apartmentId')?.valueChanges.subscribe(apartmentId => {
      this.selectedApartment = this.apartments.find(a => a.id === apartmentId) || null;
    });
    
    // Date validation
    this.termsFormGroup.get('endDate')?.valueChanges.subscribe(() => {
      this.termsFormGroup.get('endDate')?.updateValueAndValidity();
    });
    
    this.termsFormGroup.get('startDate')?.valueChanges.subscribe(() => {
      this.termsFormGroup.get('endDate')?.updateValueAndValidity();
    });
  }

  initFormGroups(): void {
    // Form group per step 1: Parti contraenti
    this.partiesFormGroup = this.fb.group({
      tenantId: ['', Validators.required],
      apartmentId: ['', Validators.required]
    });
    
    // Form group per step 2: Durata e canone
    this.termsFormGroup = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', [Validators.required, this.endDateValidator]],
      monthlyRent: ['', [Validators.required, Validators.min(0)]],
      securityDeposit: ['', [Validators.required, Validators.min(0)]],
      paymentDueDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
    });
    
    // Form group per step 3: Termini e condizioni
    this.conditionsFormGroup = this.fb.group({
      termsAndConditions: ['', Validators.required],
      specialClauses: [''],
      notes: ['']
    });
  }
  
  // Validatore per la data di fine che deve essere successiva alla data di inizio
  endDateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) return null;
    
    const startDate = control.parent.get('startDate')?.value;
    const endDate = control.value;
    
    if (!startDate || !endDate) return null;
    
    return new Date(endDate) <= new Date(startDate) 
      ? { dateInvalid: true } 
      : null;
  }

  // Funzione helper per formattare le date senza problemi di timezone
  private formatDateForServer(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadLease(id: number): void {
    this.isLoading = true;
    this.apiService.getById<Lease>('leases', id).subscribe({
      next: (lease) => {
        // Aggiorna i valori nei vari form group
        this.partiesFormGroup.patchValue({
          tenantId: lease.tenantId,
          apartmentId: lease.apartmentId
        });
        
        this.termsFormGroup.patchValue({
          startDate: new Date(lease.startDate),
          endDate: new Date(lease.endDate),
          monthlyRent: lease.monthlyRent,
          securityDeposit: lease.securityDeposit,
          paymentDueDay: lease.paymentDueDay
        });
        
        this.conditionsFormGroup.patchValue({
          termsAndConditions: lease.termsAndConditions,
          specialClauses: lease.specialClauses || '',
          notes: lease.notes || ''
        });
        
        // Aggiorna anche selectedTenant e selectedApartment
        this.selectedTenant = this.tenants.find(t => t.id === lease.tenantId) || null;
        this.selectedApartment = this.apartments.find(a => a.id === lease.apartmentId) || null;
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
        // Se siamo in modalità modifica, aggiorna selectedTenant
        if (this.isEditMode && this.partiesFormGroup.get('tenantId')?.value) {
          this.selectedTenant = this.tenants.find(t => t.id === this.partiesFormGroup.get('tenantId')?.value) || null;
        }
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
        this.snackBar.open('Errore nel caricamento degli inquilini', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }
  
  loadApartments(): void {
    this.apiService.getAll<Apartment>('apartments').subscribe({
      next: (apartments) => {
        this.apartments = apartments;
        // Se siamo in modalità modifica, aggiorna selectedApartment
        if (this.isEditMode && this.partiesFormGroup.get('apartmentId')?.value) {
          this.selectedApartment = this.apartments.find(a => a.id === this.partiesFormGroup.get('apartmentId')?.value) || null;
        }
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
        this.snackBar.open('Errore nel caricamento degli appartamenti', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }

  // Gestisce il cambio di template per i termini e condizioni
  onTemplateChange(templateType: string): void {
    const template = this.contractTemplates.getTemplateByType(templateType);
    if (template) {
      this.conditionsFormGroup.get('termsAndConditions')?.setValue(template);
    }
  }

  isFormValid(): boolean {
    return this.partiesFormGroup.valid && this.termsFormGroup.valid && this.conditionsFormGroup.valid;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.markFormGroupsTouched();
      this.snackBar.open('Completa tutti i campi obbligatori', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      return;
    }

    // Combina i dati dai diversi form group
    const formData = {
      ...this.partiesFormGroup.value,
      ...this.termsFormGroup.value,
      ...this.conditionsFormGroup.value
    };

    // Formatta le date rimuovendo le informazioni orarie - correzione timezone
    if (formData.startDate && formData.startDate instanceof Date) {
      formData.startDate = this.formatDateForServer(formData.startDate);
    }
    
    if (formData.endDate && formData.endDate instanceof Date) {
      formData.endDate = this.formatDateForServer(formData.endDate);
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.leaseId) {
      this.apiService.update<Lease>('leases', this.leaseId, formData).subscribe({
        next: () => {
          this.snackBar.open('Contratto aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          if (this.isDialogMode && this.dialogRef) {
            // Se siamo in modalità dialog, chiudi il dialog con successo
            this.dialogRef.close({ success: true });
          } else {
            // Se siamo in modalità pagina normale, naviga alla lista
            this.router.navigate(['/lease/list']);
          }
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
          
          if (this.isDialogMode && this.dialogRef) {
            // Se siamo in modalità dialog, chiudi il dialog con successo
            this.dialogRef.close({ success: true });
          } else {
            // Se siamo in modalità pagina normale, naviga alla lista
            this.router.navigate(['/lease/list']);
          }
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

  markFormGroupsTouched(): void {
    this.markFormGroupTouched(this.partiesFormGroup);
    this.markFormGroupTouched(this.termsFormGroup);
    this.markFormGroupTouched(this.conditionsFormGroup);
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
    if (this.isDialogMode && this.dialogRef) {
      // Se siamo in modalità dialog, chiudi il dialog
      this.dialogRef.close();
    } else {
      // Se siamo in modalità pagina normale, naviga alla lista
      this.router.navigate(['/lease/list']);
    }
  }

  getFormTitle(): string {
    return this.isEditMode ? 'Modifica Contratto' : 'Nuovo Contratto';
  }

  getSubmitButtonText(): string {
    return this.isEditMode ? 'Aggiorna' : 'Crea';
  }

  generateContract(): void {
    if (!this.isFormValid() || !this.selectedTenant || !this.selectedApartment) {
      this.markFormGroupsTouched();
      this.snackBar.open('Completa tutti i campi obbligatori prima di generare il contratto', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      return;
    }

    // Combina i dati dai diversi form group
    const formData = {
      ...this.partiesFormGroup.value,
      ...this.termsFormGroup.value,
      ...this.conditionsFormGroup.value
    };

    // Crea l'oggetto Lease completo
    const leaseData: Lease = {
      ...formData,
      id: this.leaseId || 0,
      tenantId: this.selectedTenant.id,
      apartmentId: this.selectedApartment.id,
      isActive: true,
      signingDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      depositPaid: false,
      paymentFrequency: 'monthly',
      renewalOption: false,
      lateFee: 0,
      terminationNotice: 30
    };

    try {
      this.contractGenerator.generateRentalContract(
        leaseData,
        this.selectedTenant,
        this.selectedApartment
      );
      
      this.snackBar.open('Contratto generato con successo', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Errore durante la generazione del contratto:', error);
      this.snackBar.open('Si è verificato un errore durante la generazione del contratto', 'Chiudi', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }
}