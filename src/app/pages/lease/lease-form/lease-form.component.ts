import { Component, OnInit, ViewChild, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Importazioni Material
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
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';

// Components
import { BaseContractUtilitiesComponent } from './base-contract-utilities.component';

// Services
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { LeaseService } from '../../../shared/services/lease.service';
import { ContractGeneratorService } from '../../../shared/services/contract-generator.service';
import { ContractTemplatesService } from '../../../shared/services/contract-templates.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { AutomaticInvoiceService } from '../../../shared/services/automatic-invoice.service';
import { AuthService } from '../../../shared/services/auth.service';

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

// DateAdapter personalizzato per gestire input manuali in formato dd/MM/yyyy
class ItalianDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      const str = value.trim();
      // Supporta separatori / - .
      const parts = str.split(/[\/\-.]/);
      if (parts.length === 3) {
        const [dayStr, monthStr, yearStr] = parts;
        const day = Number(dayStr);
        const month = Number(monthStr) - 1; // mesi 0-based
        const year = Number(yearStr.length === 2 ? (Number(yearStr) >= 70 ? '19' + yearStr : '20' + yearStr) : yearStr);
        const date = new Date(year, month, day);
        // Valida che la data costruita corrisponda ai valori inseriti
        if (
          !isNaN(date.getTime()) &&
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
        ) {
          return date;
        }
      }

      // Fallback al parsing nativo se non rispetta il formato atteso
      const timestamp = Date.parse(str);
      return isNaN(timestamp) ? null : new Date(timestamp);
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: any): string {
    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }
}

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
    MatNativeDateModule,
    MatAutocompleteModule,
    BaseContractUtilitiesComponent
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
    { provide: DateAdapter, useClass: ItalianDateAdapter, deps: [MAT_DATE_LOCALE] }
  ],
  templateUrl: './lease-form.component.html',
  styleUrls: ['./lease-form.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class LeaseFormComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  // Gruppi di form per lo stepper
  currentStepIndex = 0;
  partiesFormGroup!: FormGroup;
  termsFormGroup!: FormGroup;
  conditionsFormGroup!: FormGroup;
  utilitiesFormGroup!: FormGroup;

  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  leaseId: number | null = null;
  errorMessage: string | null = null;

  // Proprietà per gestire dialog vs pagina normale
  isDialogMode = false;

  tenants: Tenant[] = [];
  apartments: Apartment[] = [];

  filteredTenants!: Observable<Tenant[]>;
  filteredApartments!: Observable<Apartment[]>;



  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    private leaseService: LeaseService,
    private contractGenerator: ContractGeneratorService,
    private contractTemplates: ContractTemplatesService,
    private dateAdapter: DateAdapter<Date>,
    private notificationService: NotificationService,
    private automaticInvoiceService: AutomaticInvoiceService,
    private authService: AuthService,
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
    this.loadInitialData();

    // Controlla se siamo in modalità modifica
    // Può essere sia dalla rotta che dai dati del dialog
    const routeId = this.route.snapshot.paramMap.get('id');
    const dialogLeaseId = this.dialogData?.leaseId;

    if (routeId || dialogLeaseId) {
      this.isEditMode = true;
      this.leaseId = dialogLeaseId || +routeId!;
    }

    // Date validation
    this.termsFormGroup.get('endDate')?.valueChanges.subscribe(() => {
      this.termsFormGroup.get('endDate')?.updateValueAndValidity();
    });

    this.termsFormGroup.get('startDate')?.valueChanges.subscribe(() => {
      this.termsFormGroup.get('endDate')?.updateValueAndValidity();
    });

    // Sottoscrizione per auto-popolamento canone e deposito al cambio appartamento
    this.partiesFormGroup.get('apartment')?.valueChanges.subscribe(apartment => {
      if (apartment && typeof apartment !== 'string') {
        const monthlyRent = apartment.monthlyRent || 0;
        this.termsFormGroup.patchValue({
          monthlyRent: monthlyRent,
          securityDeposit: monthlyRent * 2,
          paymentDueDay: 5
        });
      }
    });
  }

  initFormGroups(): void {
    // Gruppo di form per step 1: Parti contraenti
    this.partiesFormGroup = this.fb.group({
      tenant: ['', Validators.required],
      apartment: ['', Validators.required]
    });

    // Gruppo di form per step 2: Durata e canone
    this.termsFormGroup = this.fb.group({
      startDate: [new Date(), Validators.required],
      endDate: [this.calculateDefaultEndDate(), [this.endDateValidator]],
      monthlyRent: ['', [Validators.required, Validators.min(0)]],
      securityDeposit: ['', [Validators.required, Validators.min(0)]],
      paymentDueDay: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
    });

    // Gruppo di form per step 3: Termini e condizioni
    this.conditionsFormGroup = this.fb.group({
      termsAndConditions: ['', Validators.required],
      specialClauses: [''],
      notes: ['']
    });

    // Gruppo di form per step 5: Utenze
    this.utilitiesFormGroup = this.fb.group({
      electricity: [null, [Validators.min(0)]],
      electricityId: [null],
      electricityLaundry: [null, [Validators.min(0)]],
      electricityLaundryId: [null],
      water: [null, [Validators.min(0)]],
      waterId: [null],
      gas: [null, [Validators.min(0)]],
      gasId: [null]
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

  // Funzioni di visualizzazione per autocomplete
  displayTenant(tenant: Tenant): string {
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : '';
  }

  displayApartment(apartment: Apartment): string {
    return apartment ? apartment.name : '';
  }

  private _filterTenants(value: string | Tenant): Tenant[] {
    const filterValue = (typeof value === 'string' ? value : `${value.firstName} ${value.lastName}`).toLowerCase();
    return this.tenants.filter(tenant =>
      `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(filterValue)
    );
  }

  private _filterApartments(value: string | Apartment): Apartment[] {
    const filterValue = (typeof value === 'string' ? value : value?.description)?.toLowerCase() || '';
    return this.apartments.filter(apartment =>
      apartment.description?.toLowerCase().includes(filterValue)
    );
  }

  // Funzione helper per formattare le date senza problemi di timezone
  private formatDate(date: Date): string {
    if (!date) {
      return '';
    }
    // Clona la data per non modificare l'originale
    const newDate = new Date(date);
    // Azzera l'offset del fuso orario per evitare che la data venga alterata
    newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset());
    // Restituisce la data in formato 'YYYY-MM-DD'
    return newDate.toISOString().split('T')[0];
  }

  loadInitialData(): void {
    this.isLoading = true;
    // Carica inquilini e appartamenti in parallelo
    this.apiService.getAll<Tenant>('tenants').subscribe({
      next: tenants => {
        this.tenants = tenants;
        this.setupTenantAutocomplete();
        // Se siamo in edit mode, potremmo dover caricare il contratto
        if (this.isEditMode && this.leaseId) {
          this.loadLease(this.leaseId);
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
        this.errorMessage = 'Errore nel caricamento degli inquilini.';
        this.isLoading = false;
      }
    });

    this.apiService.getAll<Apartment>('apartments').subscribe({
      next: apartments => {
        this.apartments = apartments;
        this.setupApartmentAutocomplete();
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
        this.errorMessage = 'Errore nel caricamento degli appartamenti.';
        this.isLoading = false;
      }
    });
  }

  setupTenantAutocomplete(): void {
    this.filteredTenants = this.partiesFormGroup.get('tenant')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTenants(value || ''))
    );
  }

  setupApartmentAutocomplete(): void {
    this.filteredApartments = this.partiesFormGroup.get('apartment')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterApartments(value || ''))
    );
  }


  loadLease(id: number): void {
    if (!this.isLoading) this.isLoading = true;
    this.apiService.getById<Lease>('leases', id).subscribe({
      next: (lease) => {
        // Trova l'oggetto tenant e apartment corrispondente
        const tenant = this.tenants.find(t => t.id === lease.tenantId);
        const apartment = this.apartments.find(a => a.id === lease.apartmentId);

        // Aggiorna i valori nei vari form group
        this.partiesFormGroup.patchValue({
          tenant: tenant,
          apartment: apartment
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



        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento del contratto', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento del contratto.';
        this.isLoading = false;
      }
    });
  }

  get selectedTenant(): Tenant | null {
    const tenantControl = this.partiesFormGroup.get('tenant');
    return tenantControl && tenantControl.value && typeof tenantControl.value !== 'string'
      ? tenantControl.value
      : null;
  }

  get selectedApartment(): Apartment | null {
    const apartmentControl = this.partiesFormGroup.get('apartment');
    return apartmentControl && apartmentControl.value && typeof apartmentControl.value !== 'string'
      ? apartmentControl.value
      : null;
  }

  get summaryEndDate(): Date | null {
    const startDate = this.termsFormGroup.get('startDate')?.value;
    const endDate = this.termsFormGroup.get('endDate')?.value;
    if (endDate) return new Date(endDate);
    if (startDate) return this.calculateDefaultEndDate();
    return this.calculateDefaultEndDate();
  }

  /**
   * Default data fine: 1 anno dalla data di creazione.
   */
  private calculateDefaultEndDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  /**
   * Costruisce initialReadings in formato ibrido:
   * - usa gli ID quando esiste storico
   * - usa i valori inseriti quando non esiste una lettura precedente
   */
  private buildInitialReadingsPayload(): Record<string, number> {
    const initialReadings: Record<string, number> = {};
    const mappings = [
      {
        idControl: 'electricityId',
        valueControl: 'electricity',
        idKey: 'electricityReadingId',
        valueKey: 'electricityValue'
      },
      {
        idControl: 'electricityLaundryId',
        valueControl: 'electricityLaundry',
        idKey: 'electricityLaundryReadingId',
        valueKey: 'electricityLaundryValue'
      },
      {
        idControl: 'waterId',
        valueControl: 'water',
        idKey: 'waterReadingId',
        valueKey: 'waterValue'
      },
      {
        idControl: 'gasId',
        valueControl: 'gas',
        idKey: 'gasReadingId',
        valueKey: 'gasValue'
      }
    ];

    mappings.forEach(({ idControl, valueControl, idKey, valueKey }) => {
      const readingId = this.utilitiesFormGroup.get(idControl)?.value;
      const readingValue = this.utilitiesFormGroup.get(valueControl)?.value;

      if (readingId !== null && readingId !== undefined) {
        initialReadings[idKey] = Number(readingId);
        return;
      }

      if (readingValue !== null && readingValue !== undefined && readingValue !== '') {
        initialReadings[valueKey] = Number(readingValue);
      }
    });

    return initialReadings;
  }

  // Rimosse le funzioni loadTenants e loadApartments separate
  // Sostituite con loadInitialData

  onTemplateChange(templateType: string): void {
    const template = this.contractTemplates.getTemplateByType(templateType);
    this.conditionsFormGroup.patchValue({
      termsAndConditions: template
    });
  }

  isFormValid(): boolean {
    return this.partiesFormGroup.valid && this.termsFormGroup.valid && this.conditionsFormGroup.valid && this.utilitiesFormGroup.valid;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.snackBar.open('Per favore, compila tutti i campi obbligatori.', 'Chiudi', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;

    // Estrai gli ID da tenant e apartment
    const tenant = this.partiesFormGroup.get('tenant')?.value;
    const apartment = this.partiesFormGroup.get('apartment')?.value;

    if (!tenant?.id || !apartment?.id) {
      this.snackBar.open('Inquilino o appartamento non valido.', 'Chiudi', { duration: 3000 });
      this.isSubmitting = false;
      return;
    }

    // Rimuovo la formattazione manuale delle date. Angular HttpClient le gestirà.
    const terms = this.termsFormGroup.value;
    const currentUser = this.authService.getCurrentUser() || this.authService.getUserFromStorage?.();
    if (!currentUser || !currentUser.id) {
      this.isSubmitting = false;
      this.snackBar.open('Sessione non valida. Accedi di nuovo.', 'Chiudi', { duration: 3000 });
      return;
    }
    const finalEndDate = terms.endDate ? new Date(terms.endDate) : this.calculateDefaultEndDate();

    const leasePayload = {
      tenantId: tenant.id,
      apartmentId: apartment.id,
      userId: currentUser.id, // ← AGGIUNGI userId
      ...terms,
      startDate: this.formatDate(terms.startDate),
      endDate: this.formatDate(finalEndDate),
      ...this.conditionsFormGroup.value,
      propertyCondition: 'ottimo',
      boilerCondition: 'ottimo',
      initialReadings: this.buildInitialReadingsPayload()
    };

    if (this.isEditMode && this.leaseId) {
      this.apiService.update<Lease>('leases', this.leaseId, leasePayload).subscribe({
        next: () => {
          this.snackBar.open('Contratto aggiornato con successo', 'Chiudi', { duration: 3000 });
          this.isSubmitting = false;

          // Invalida cache fatture (nel caso in cui il backend abbia fatto cambiamenti)
          this.apiService.invalidateCache('invoices');

          // Aggiungi notifica
          const apartment = this.apartments.find(a => a.id === this.partiesFormGroup.get('apartment')?.value?.id);
          const tenant = this.tenants.find(t => t.id === this.partiesFormGroup.get('tenant')?.value?.id);
          const apartmentName = apartment?.name || 'Appartamento';
          const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Inquilino';
          this.notificationService.notifyLease('updated', apartmentName, tenantName, this.leaseId || undefined);

          this.closeDialog(true);
        },
        error: (error) => {
          console.error('Errore durante l\'aggiornamento del contratto', error);
          this.snackBar.open('Errore durante l\'aggiornamento del contratto', 'Chiudi', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    } else {
      this.apiService.create<Lease>('leases', leasePayload).subscribe({
        next: (createdLease) => {
          this.snackBar.open('Contratto creato con successo', 'Chiudi', { duration: 3000 });

          // Invalida cache fatture (importante perché il backend genera auto-invoice)
          this.apiService.invalidateCache('invoices');

          // Aggiungi notifica di creazione contratto
          const apartment = this.apartments.find(a => a.id === leasePayload.apartmentId);
          const tenant = this.tenants.find(t => t.id === leasePayload.tenantId);
          const apartmentName = apartment?.name || 'Appartamento';
          const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Inquilino';
          this.notificationService.notifyLease('created', apartmentName, tenantName);

          this.isSubmitting = false;
          this.closeDialog(true);
        },
        error: (error) => {
          console.error('Errore durante la creazione del contratto', error);
          this.snackBar.open('Errore durante la creazione del contratto', 'Chiudi', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  closeDialog(success: boolean): void {
    if (this.isDialogMode) {
      this.dialogRef.close({ success });
    } else {
      if (success) {
        this.router.navigate(['/leases']);
      }
    }
  }

  markFormGroupsTouched(): void {
    this.markFormGroupTouched(this.partiesFormGroup);
    this.markFormGroupTouched(this.termsFormGroup);
    this.markFormGroupTouched(this.conditionsFormGroup);
    this.markFormGroupTouched(this.utilitiesFormGroup);
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
    if (this.isDialogMode) {
      // Se siamo in modalità dialog, chiudi direttamente il dialog
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

  shouldShowBackButton(): boolean {
    return this.isDialogMode && this.currentStepIndex > 0;
  }

  goBack(): void {
    if (this.isDialogMode && this.currentStepIndex > 0) {
      this.stepper.previous();
      // Non c'è bisogno di decrementare currentStepIndex manualmente
      // perché onStepChange() lo gestisce automaticamente
    } else if (!this.isDialogMode) {
      this.router.navigate(['/lease/list']);
    }
  }

  onStepChange(event: any): void {
    this.currentStepIndex = event.selectedIndex;
  }

  generateContract(): void {
    const tenant = this.partiesFormGroup.get('tenant')?.value;
    const apartment = this.partiesFormGroup.get('apartment')?.value;
    const terms = this.termsFormGroup.value;
    const conditions = this.conditionsFormGroup.value;

    if (tenant && apartment && this.termsFormGroup.valid && this.conditionsFormGroup.valid) {
      // Crea un oggetto Lease completo per la generazione del contratto
      const currentUser = this.authService.getCurrentUser();
      const finalEndDate = terms.endDate ? new Date(terms.endDate) : this.calculateDefaultEndDate();

      const leaseDataForContract: Lease = {
        id: this.leaseId ?? 0,
        tenantId: tenant.id,
        apartmentId: apartment.id,
        userId: currentUser?.id || 0,
        startDate: this.formatDate(new Date(terms.startDate)),
        endDate: this.formatDate(finalEndDate),
        monthlyRent: terms.monthlyRent,
        securityDeposit: terms.securityDeposit,
        paymentDueDay: terms.paymentDueDay,
        termsAndConditions: conditions.termsAndConditions,
        specialClauses: conditions.specialClauses || '',
        notes: conditions.notes || '',
        isActive: true, // Valore di default
        status: 'active', // Valore di default
        createdAt: this.formatDate(new Date()),
        updatedAt: this.formatDate(new Date()),
        // Baseline IDs dal form delle utenze
        electricityReadingId: this.utilitiesFormGroup.get('electricityId')?.value ?? null,
        electricityLaundryReadingId: this.utilitiesFormGroup.get('electricityLaundryId')?.value ?? null,
        waterReadingId: this.utilitiesFormGroup.get('waterId')?.value ?? null,
        gasReadingId: this.utilitiesFormGroup.get('gasId')?.value ?? null
      };

      // Prepara eventuali letture manuali inserite nello step Utenze
      const manualUtilities = {
        electricity: this.utilitiesFormGroup.get('electricity')?.value ?? null,
        electricityId: this.utilitiesFormGroup.get('electricityId')?.value ?? null,
        electricityLaundry: this.utilitiesFormGroup.get('electricityLaundry')?.value ?? null,
        electricityLaundryId: this.utilitiesFormGroup.get('electricityLaundryId')?.value ?? null,
        water: this.utilitiesFormGroup.get('water')?.value ?? null,
        waterId: this.utilitiesFormGroup.get('waterId')?.value ?? null,
        gas: this.utilitiesFormGroup.get('gas')?.value ?? null,
        gasId: this.utilitiesFormGroup.get('gasId')?.value ?? null
      };

      // Genera il contratto HTML dettagliato con priorità alle letture manuali
      this.contractGenerator.generateDetailedHTMLContract(leaseDataForContract, tenant, apartment, manualUtilities)
        .subscribe({
          next: (htmlContent: string) => {
            // Crea una nuova finestra con il contratto HTML
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(htmlContent);
              newWindow.document.close();
              newWindow.focus();

              // Mostra messaggio di successo
              this.snackBar.open('Contratto generato con successo! Apri la finestra per stamparlo.', 'Chiudi', {
                duration: 5000,
                panelClass: ['success-snackbar']
              });
            } else {
              this.snackBar.open('Impossibile aprire la finestra del contratto. Controlla i popup blocker.', 'Chiudi', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
            }
          },
          error: (error) => {
            console.error('Errore nella generazione del contratto:', error);
            this.snackBar.open('Errore nella generazione del contratto. Riprova.', 'Chiudi', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
    } else {
      this.snackBar.open('Compila tutti i campi prima di generare il contratto.', 'Chiudi', { duration: 3000 });
    }
  }

  onUtilitiesChange(utilitiesData: any): void {
    // Aggiorna i valori nel form group incluse le ID delle letture
    this.utilitiesFormGroup.patchValue({
      electricity: utilitiesData.electricity,
      electricityId: utilitiesData.electricityId,
      electricityLaundry: utilitiesData.electricityLaundry,
      electricityLaundryId: utilitiesData.electricityLaundryId,
      water: utilitiesData.water,
      waterId: utilitiesData.waterId,
      gas: utilitiesData.gas,
      gasId: utilitiesData.gasId
    });
  }

  onUtilitiesValidationChange(isValid: boolean): void {
    // Gestisce la validazione del form delle utilities
    console.log('Utilities validation changed:', isValid);
  }
}
