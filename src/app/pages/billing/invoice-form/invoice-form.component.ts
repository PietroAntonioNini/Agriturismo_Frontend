import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { Observable, Subject, combineLatest, takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, map, catchError, of } from 'rxjs';

import { Invoice, InvoiceItem } from '../../../shared/models/invoice.model';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Apartment {
  id: number;
  name: string;
  address: string;
  rent: number;
}

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss'],
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
    MatStepperModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatAutocompleteModule
  ]
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  invoiceForm!: FormGroup;
  isEditMode = false;
  invoiceId?: number;
  isLoading = false;
  isSaving = false;
  
  // Dati per autocomplete
  tenants: Tenant[] = [];
  apartments: Apartment[] = [];
  filteredTenants: Observable<Tenant[]> = new Observable();
  filteredApartments: Observable<Apartment[]> = new Observable();
  
  // Tipi di item disponibili
  itemTypes = [
    { value: 'rent', label: 'Affitto' },
    { value: 'electricity', label: 'Elettricità' },
    { value: 'water', label: 'Acqua' },
    { value: 'gas', label: 'Gas' },
    { value: 'heating', label: 'Riscaldamento' },
    { value: 'internet', label: 'Internet' },
    { value: 'cleaning', label: 'Pulizie' },
    { value: 'maintenance', label: 'Manutenzione' },
    { value: 'other', label: 'Altro' }
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
    this.loadMockData();
  }

  ngOnInit(): void {
    this.setupAutocomplete();
    this.loadInvoiceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.invoiceForm = this.fb.group({
      // Informazioni principali
      tenantId: ['', Validators.required],
      apartmentId: ['', Validators.required],
      invoiceNumber: ['', Validators.required],
      issueDate: [new Date(), Validators.required],
      dueDate: ['', Validators.required],
      
      // Periodo di riferimento
      periodStart: ['', Validators.required],
      periodEnd: ['', Validators.required],
      
      // Items della fattura
      items: this.fb.array([]),
      
      // Note e opzioni
      notes: [''],
      includePaymentInstructions: [true],
      sendReminder: [false]
    });

    // Aggiungi primo item di default
    this.addInvoiceItem();
  }

  private setupAutocomplete(): void {
    // Autocomplete per inquilini
    this.filteredTenants = this.invoiceForm.get('tenantId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => this.filterTenants(value))
    );

    // Autocomplete per appartamenti
    this.filteredApartments = this.invoiceForm.get('apartmentId')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => this.filterApartments(value))
    );
  }

  private loadMockData(): void {
    // Carica tenant attivi
    this.invoiceService.getActiveTenants().subscribe(tenants => {
      this.tenants = tenants.map(tenant => ({
        id: tenant.id,
        name: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email || '',
        phone: tenant.phone || ''
      }));
    });

    // Carica appartamenti occupati
    this.invoiceService.getOccupiedApartments().subscribe(apartments => {
      this.apartments = apartments.map(apartment => ({
        id: apartment.id,
        name: apartment.name || `Appartamento ${apartment.id}`,
        address: apartment.address || '',
        rent: apartment.monthlyRent || 0
      }));
    });
  }

  private loadInvoiceData(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = params['id'];
        if (id) {
          this.isEditMode = true;
          this.invoiceId = +id;
          this.isLoading = true;
          return this.invoiceService.getInvoiceById(+id);
        }
        return of(null);
      })
    ).subscribe({
      next: (invoice) => {
        this.isLoading = false;
        if (invoice) {
          this.populateForm(invoice);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notificationService.showError('Errore nel caricamento della fattura');
        console.error('Errore caricamento fattura:', error);
      }
    });
  }

  private populateForm(invoice: Invoice): void {
    // Pulisci array items esistente
    const itemsArray = this.invoiceForm.get('items') as FormArray;
    itemsArray.clear();

    // Popola form con dati della fattura
    this.invoiceForm.patchValue({
      tenantId: invoice.tenantId,
      apartmentId: invoice.apartmentId,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: new Date(invoice.issueDate),
      dueDate: new Date(invoice.dueDate),
      periodStart: new Date(invoice.periodStart),
      periodEnd: new Date(invoice.periodEnd),
      notes: invoice.notes
    });

    // Aggiungi items
    invoice.items.forEach(item => {
      this.addInvoiceItem(item);
    });
  }

  // Gestione items della fattura
  get itemsArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addInvoiceItem(item?: InvoiceItem): void {
    const itemForm = this.fb.group({
      description: [item?.description || '', Validators.required],
      type: [item?.type || 'rent', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      amount: [item?.amount || 0, [Validators.required, Validators.min(0)]]
    });

    // Calcola automaticamente l'importo
    itemForm.get('quantity')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => this.calculateItemAmount(itemForm));

    itemForm.get('unitPrice')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => this.calculateItemAmount(itemForm));

    this.itemsArray.push(itemForm);
  }

  removeInvoiceItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
      this.calculateTotal();
    }
  }

  private calculateItemAmount(itemForm: FormGroup): void {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    itemForm.patchValue({ amount: Math.round(amount * 100) / 100 });
    this.calculateTotal();
  }

  private calculateTotal(): void {
    const items = this.itemsArray.value;
    const total = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    // Aggiorna il totale nel form se necessario
  }

  // Autocomplete filters
  private filterTenants(value: string): Tenant[] {
    const filterValue = value?.toString().toLowerCase() || '';
    return this.tenants.filter(tenant => 
      tenant.name.toLowerCase().includes(filterValue) ||
      tenant.email.toLowerCase().includes(filterValue)
    );
  }

  private filterApartments(value: string): Apartment[] {
    const filterValue = value?.toString().toLowerCase() || '';
    return this.apartments.filter(apartment => 
      apartment.name.toLowerCase().includes(filterValue) ||
      apartment.address.toLowerCase().includes(filterValue)
    );
  }

  // Display functions per autocomplete
  displayTenant(tenant: Tenant): string {
    return tenant ? `${tenant.name} (${tenant.email})` : '';
  }

  displayApartment(apartment: Apartment): string {
    return apartment ? `${apartment.name} - ${apartment.address}` : '';
  }

  // Gestione salvataggio
  onSubmit(): void {
    if (this.invoiceForm.valid) {
      this.isSaving = true;
      const formData = this.invoiceForm.value;
      
      const invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        leaseId: 1, // TODO: Implementare selezione lease
        month: formData.periodStart.getMonth() + 1,
        year: formData.periodStart.getFullYear(),
        subtotal: this.calculateFormTotal(),
        tax: 0,
        total: this.calculateFormTotal(),
        isPaid: false,
        status: 'pending',
        reminderSent: false
      };

      const saveObservable = this.isEditMode && this.invoiceId
        ? this.invoiceService.updateInvoice(this.invoiceId, invoice)
        : this.invoiceService.createInvoice(invoice);

      saveObservable.pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (savedInvoice) => {
          this.isSaving = false;
          this.notificationService.showSuccess(
            this.isEditMode ? 'Fattura aggiornata con successo' : 'Fattura creata con successo'
          );
          this.router.navigate(['/billing/detail', savedInvoice.id]);
        },
        error: (error) => {
          this.isSaving = false;
          this.notificationService.showError('Errore nel salvataggio della fattura');
          console.error('Errore salvataggio fattura:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  calculateFormTotal(): number {
    const items = this.itemsArray.value;
    return items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.invoiceForm.controls).forEach(key => {
      const control = this.invoiceForm.get(key);
      control?.markAsTouched();
    });
  }

  // Gestione cancellazione
  onCancel(): void {
    if (this.invoiceForm.dirty) {
      this.confirmationDialogService.confirm(
        'Conferma cancellazione',
        'Sei sicuro di voler annullare? Le modifiche non salvate andranno perse.',
        {
          cancelText: 'Annulla',
          confirmText: 'Continua'
        }
      ).subscribe(result => {
        if (result) {
          this.router.navigate(['/billing/list']);
        }
      });
    } else {
      this.router.navigate(['/billing/list']);
    }
  }

  // Utility methods
  getItemTypeLabel(type: string): string {
    const itemType = this.itemTypes.find(t => t.value === type);
    return itemType ? itemType.label : type;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  // Validazione campi
  isFieldInvalid(fieldName: string): boolean {
    const field = this.invoiceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.invoiceForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Campo obbligatorio';
      if (field.errors['min']) return `Valore minimo: ${field.errors['min'].min}`;
    }
    return '';
  }
} 