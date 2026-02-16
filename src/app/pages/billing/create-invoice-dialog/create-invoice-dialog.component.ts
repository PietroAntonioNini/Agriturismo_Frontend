import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { InvoiceCreate, InvoiceItemCreate } from '../../../shared/models';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { SettingsService, StatementDefaultsPayload } from '../../../shared/services/settings.service';
import { AuthService } from '../../../shared/services/auth.service';

export interface UtilityRow {
  label: string;
  type: 'gas' | 'electricity' | 'water' | 'laundry';
  itemType: 'gas' | 'electricity' | 'water' | 'electricity_laundry';
  unit: string;
  icon: string;
  color: string;
  readingDate: string | null;
  previous: number | null;
  current: number | null;
  consumption: number;
  unitCost: number;
  amount: number;
  included: boolean;
}

interface ManualItem {
  description: string;
  amount: number;
  type: 'maintenance' | 'other';
}

@Component({
  standalone: true,
  selector: 'app-create-invoice-dialog',
  templateUrl: './create-invoice-dialog.component.html',
  styleUrls: ['./create-invoice-dialog.component.scss'],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatTooltipModule, MatProgressSpinnerModule
  ]
})
export class CreateInvoiceDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<CreateInvoiceDialogComponent>);
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);
  private api = inject(GenericApiService);
  private settings = inject(SettingsService);
  private authService = inject(AuthService);

  private destroy$ = new Subject<void>();

  form!: FormGroup;

  leases: any[] = [];
  apartments: any[] = [];
  tenants: any[] = [];

  invoiceTypes = [
    { value: 'entry', label: 'Caparra / Ingresso', icon: 'meeting_room', color: '#2D7D46' },
    { value: 'monthly', label: 'Mensilità', icon: 'description', color: '#2563eb' }
  ];

  private monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  utilityRows: UtilityRow[] = [
    { label: 'Gas', type: 'gas', itemType: 'gas', unit: 'm³', icon: 'local_fire_department', color: '#ef4444', readingDate: null, previous: null, current: null, consumption: 0, unitCost: 0, amount: 0, included: true },
    { label: 'Elettricità', type: 'electricity', itemType: 'electricity', unit: 'kWh', icon: 'bolt', color: '#f59e0b', readingDate: null, previous: null, current: null, consumption: 0, unitCost: 0, amount: 0, included: true },
    { label: 'Acqua', type: 'water', itemType: 'water', unit: 'm³', icon: 'water_drop', color: '#3b82f6', readingDate: null, previous: null, current: null, consumption: 0, unitCost: 0, amount: 0, included: true },
  ];

  laundryRow: UtilityRow = {
    label: 'Lavanderia', type: 'laundry', itemType: 'electricity_laundry', unit: 'kWh', icon: 'local_laundry_service', color: '#d97706',
    readingDate: null, previous: null, current: null, consumption: 0, unitCost: 0, amount: 0, included: true
  };

  defaults: StatementDefaultsPayload | null = null;
  manualItems: ManualItem[] = [];

  loading = false;
  loadingReadings = false;
  submitting = false;
  error: string | null = null;
  readingsLoaded = false;
  /** True se per il contratto selezionato esiste almeno una lettura con subtype laundry */
  hasLaundryReading = false;

  generatedInvoiceNumber = '';
  selectedLease: any = null;

  ngOnInit(): void {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    this.form = this.fb.group({
      invoiceType: [null, Validators.required],
      leaseId: [null, Validators.required],
      issueDate: [now, Validators.required],
      dueDate: [dueDate, Validators.required],
      rent: [{ value: 0, disabled: true }],
      tari: [15],
      meterFee: [3],
      notes: ['']
    });

    this.loadInitialData();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loading = true;
    forkJoin({
      leases: this.invoiceService.getActiveLeases().pipe(catchError(() => of([]))),
      apartments: this.api.getAll<any>('apartments').pipe(catchError(() => of([]))),
      tenants: this.api.getAll<any>('tenants').pipe(catchError(() => of([]))),
      defaults: this.settings.getStatementDefaults().pipe(catchError(() => of(null))),
      utilityTypes: this.api.getUtilityTypes().pipe(catchError(() => of([])))
    }).subscribe(({ leases, apartments, tenants, defaults, utilityTypes }) => {
      this.leases = leases || [];
      this.apartments = apartments || [];
      this.tenants = tenants || [];
      this.defaults = defaults;

      if (defaults) {
        this.form.patchValue({
          tari: defaults.tari ?? 15,
          meterFee: defaults.meterFee ?? 3
        });
        for (const r of this.utilityRows) {
          const key = r.type as string;
          r.unitCost = Number(defaults.unitCosts?.[key as keyof typeof defaults.unitCosts] ?? 0);
        }
        this.laundryRow.unitCost = Number(
          defaults.unitCosts?.['laundry' as keyof typeof defaults.unitCosts] ??
          defaults.unitCosts?.electricity ?? 0
        );
      } else if (utilityTypes && utilityTypes.length > 0) {
        for (const r of this.utilityRows) {
          const cfg = utilityTypes.find((u: any) => u.type === r.type);
          if (cfg) {
            r.unit = cfg.unit || r.unit;
            r.unitCost = Number(cfg.defaultCost ?? 0);
          }
        }
        const elecCfg = utilityTypes.find((u: any) => u.type === 'electricity');
        if (elecCfg) {
          this.laundryRow.unitCost = Number(elecCfg.defaultCost ?? 0);
        }
      }

      this.loading = false;
    });
  }

  private setupFormListeners(): void {
    this.form.get('leaseId')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(leaseId => {
      if (!leaseId) {
        this.selectedLease = null;
        this.form.get('rent')!.setValue(0);
        return;
      }
      const lease = this.leases.find((l: any) => l.id === leaseId);
      if (lease) {
        this.selectedLease = lease;
        this.form.get('rent')!.setValue(lease.monthlyRent || 0);
      }
      this.updateInvoiceNumber();
      this.refreshReadings();
    });

    this.form.get('invoiceType')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateInvoiceNumber();
    });

    this.form.get('issueDate')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateInvoiceNumber();
      this.refreshReadings();
    });
  }

  getSelectedInvoiceType(): { value: string; label: string; icon: string; color: string } | null {
    const value = this.form?.get('invoiceType')?.value;
    if (!value) return null;
    return this.invoiceTypes.find(t => t.value === value) ?? null;
  }

  getLeaseLabel(lease: any): string {
    const apt = this.apartments.find(a => a.id === lease.apartmentId);
    const aptName = apt?.name || `Apt. ${lease.apartmentId}`;
    const tenant = this.tenants.find(t => t.id === lease.tenantId);
    const cognome = tenant?.lastName || 'Inquilino';
    return `${aptName} – ${cognome}`;
  }

  isMonthly(): boolean {
    return this.form?.get('invoiceType')?.value === 'monthly';
  }

  isEntry(): boolean {
    return this.form?.get('invoiceType')?.value === 'entry';
  }

  private getBillingMonth(): { month: number; year: number } {
    const issueDate: Date = this.form?.get('issueDate')?.value || new Date();
    const d = typeof issueDate === 'string' ? new Date(issueDate) : issueDate;
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  private updateInvoiceNumber(): void {
    const type = this.form?.get('invoiceType')?.value;
    if (!type) {
      this.generatedInvoiceNumber = '';
      return;
    }

    if (type === 'entry') {
      const ts = Date.now();
      const suffix = String(Math.floor(Math.random() * 90) + 10);
      this.generatedInvoiceNumber = `CAP-${ts}-${suffix}`;
    } else {
      const { month, year } = this.getBillingMonth();
      const mm = String(month).padStart(3, '0');
      this.generatedInvoiceNumber = `INV-${year}-${mm}`;
    }
  }

  private refreshReadings(): void {
    if (!this.selectedLease) return;
    const apartmentId = this.selectedLease.apartmentId;
    const issueDateVal = this.form?.get('issueDate')?.value;
    if (!apartmentId || !issueDateVal) return;

    const issueDate = typeof issueDateVal === 'string' ? new Date(issueDateVal) : issueDateVal;
    const endIso = issueDate.toISOString().split('T')[0];
    const startDate = new Date(issueDate);
    startDate.setMonth(startDate.getMonth() - 2);
    const startIso = startDate.toISOString().split('T')[0];

    this.loadingReadings = true;
    this.readingsLoaded = false;
    this.error = null;

    // Una sola chiamata per utenza: ultime letture con data <= data di emissione; poi si sceglie l'ultima "reale" (non baseline)
    const paramsBase = (type: string, subtype?: string) => {
      const p: any = {
        apartmentId,
        type,
        start_date: startIso,
        end_date: endIso,
        _sort: 'readingDate',
        _order: 'desc',
        _limit: '10'
      };
      if (subtype) p.subtype = subtype;
      return p;
    };

    const requests: any = {
      gas: this.api.getAllUtilityReadings(paramsBase('gas')).pipe(catchError(() => of([]))),
      electricity: this.api.getAllUtilityReadings(paramsBase('electricity', 'main')).pipe(catchError(() => of([]))),
      water: this.api.getAllUtilityReadings(paramsBase('water')).pipe(catchError(() => of([]))),
      laundry: this.api.getAllUtilityReadings(paramsBase('electricity', 'laundry')).pipe(catchError(() => of([])))
    };

    forkJoin(requests).subscribe({
      next: (res: any) => {
        const gasReading = this.pickLastRelevantReading(res.gas || []);
        const elecReading = this.pickLastRelevantReading(res.electricity || []);
        const waterReading = this.pickLastRelevantReading(res.water || []);
        const laundryReading = this.pickLastRelevantReading(res.laundry || []);

        this.fillUtilityRowFromReading('gas', gasReading);
        this.fillUtilityRowFromReading('electricity', elecReading);
        this.fillUtilityRowFromReading('water', waterReading);

        this.hasLaundryReading = !!laundryReading;
        if (laundryReading) {
          this.fillLaundryRowFromReading(laundryReading);
        } else {
          this.resetLaundryRow();
        }

        this.readingsLoaded = true;
        this.loadingReadings = false;
      },
      error: () => {
        this.error = 'Errore nel caricamento delle letture';
        this.loadingReadings = false;
      }
    });
  }

  /**
   * Dato un array di letture (ordinate per data desc), restituisce l'ultima lettura "reale":
   * esclude le baseline (Lettura iniziale di sistema) e preferisce subtype 'main'.
   * I campi currentReading, previousReading, consumption e totalCost sono già nella lettura.
   */
  private pickLastRelevantReading(readings: any[]): any | null {
    if (!readings || readings.length === 0) return null;
    const isBaseline = (r: any) =>
      r.isSpecialReading === true ||
      (r.notes && (String(r.notes).includes('Baseline') || String(r.notes).toLowerCase().includes('iniziale')));
    const realReadings = readings.filter((r: any) => !isBaseline(r));
    const list = realReadings.length > 0 ? realReadings : readings;
    const withMain = list.filter((r: any) => r.subtype === 'main');
    const chosen = (withMain.length > 0 ? withMain : list)[0] ?? null;
    return chosen;
  }

  private fillUtilityRowFromReading(type: 'gas' | 'electricity' | 'water', reading: any | null): void {
    const row = this.utilityRows.find(r => r.type === type)!;
    if (reading) {
      row.readingDate = reading.readingDate ? new Date(reading.readingDate).toLocaleDateString('it-IT') : null;
      row.previous = Number(reading.previousReading ?? 0);
      row.current = Number(reading.currentReading ?? 0);
      row.consumption = Number(reading.consumption ?? (row.current ?? 0) - (row.previous ?? 0));
      row.unitCost = Number(reading.unitCost ?? reading.unitcost ?? row.unitCost ?? 0);
      row.amount = Number(reading.totalCost ?? reading.totalcost ?? 0);
    } else {
      row.readingDate = null;
      row.previous = null;
      row.current = null;
      row.consumption = 0;
      row.amount = 0;
    }
  }

  private fillLaundryRowFromReading(reading: any | null): void {
    if (reading) {
      this.laundryRow.readingDate = reading.readingDate ? new Date(reading.readingDate).toLocaleDateString('it-IT') : null;
      this.laundryRow.previous = Number(reading.previousReading ?? 0);
      this.laundryRow.current = Number(reading.currentReading ?? 0);
      this.laundryRow.consumption = Number(reading.consumption ?? (this.laundryRow.current ?? 0) - (this.laundryRow.previous ?? 0));
      this.laundryRow.unitCost = Number(reading.unitCost ?? reading.unitcost ?? this.laundryRow.unitCost ?? 0);
      this.laundryRow.amount = Number(reading.totalCost ?? reading.totalcost ?? 0);
    } else {
      this.laundryRow.readingDate = null;
      this.laundryRow.previous = null;
      this.laundryRow.current = null;
      this.laundryRow.consumption = 0;
      this.laundryRow.amount = 0;
    }
  }

  private resetLaundryRow(): void {
    this.laundryRow.readingDate = null;
    this.laundryRow.previous = null;
    this.laundryRow.current = null;
    this.laundryRow.consumption = 0;
    this.laundryRow.amount = 0;
  }

  recalcUtilityAmount(row: UtilityRow): void {
    row.amount = row.consumption * row.unitCost;
  }

  addManualItem(): void {
    this.manualItems.push({ description: '', amount: 0, type: 'maintenance' });
  }

  removeManualItem(index: number): void {
    this.manualItems.splice(index, 1);
  }

  getTotal(): number {
    let total = 0;

    if (this.isEntry()) {
      total += this.getSecurityDeposit();
    }

    if (this.isMonthly()) {
      total += Number(this.form.getRawValue().rent || 0);

      for (const row of this.utilityRows) {
        if (row.included) total += row.amount;
      }
      if (this.hasLaundryReading && this.laundryRow.included) {
        total += this.laundryRow.amount;
      }

      total += Number(this.form.get('tari')?.value || 0);
      total += Number(this.form.get('meterFee')?.value || 0);

      for (const item of this.manualItems) {
        total += Number(item.amount || 0);
      }
    }

    return total;
  }

  getSecurityDeposit(): number {
    return Number(this.selectedLease?.securityDeposit || 0);
  }

  getApartmentName(): string {
    if (!this.selectedLease) return '';
    const apt = this.apartments.find(a => a.id === this.selectedLease.apartmentId);
    return apt?.name || `Appartamento ${this.selectedLease.apartmentId}`;
  }

  canSubmit(): boolean {
    if (this.form.invalid || this.submitting || this.loading) return false;
    return this.getTotal() > 0;
  }

  /** Mappa il tipo voce al type accettato dal backend (rent | electricity | water | gas | tari | maintenance | other) */
  private mapItemTypeForBackend(type: string): InvoiceItemCreate['type'] {
    const t = type as string;
    if (t === 'entry' || t === 'rent' || t === 'electricity' || t === 'water' || t === 'gas' || t === 'electricity_laundry' || t === 'tari' || t === 'meter_fee' || t === 'maintenance' || t === 'other') {
      return t as InvoiceItemCreate['type'];
    }
    return 'other'; // solo voci manuali con tipo non standard
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitting = true;
    this.error = null;

    const formVal = this.form.getRawValue();
    const { month, year } = this.getBillingMonth();
    const monthLabel = this.monthNames[month - 1];

    const items: InvoiceItemCreate[] = [];

    if (this.isEntry()) {
      const deposit = this.getSecurityDeposit();
      if (deposit > 0) {
        items.push({
          description: 'Caparra / Ingresso',
          amount: deposit,
          type: 'entry'
        });
      }
    }

    const includeUtilities = this.isMonthly();
    if (this.isMonthly()) {
      const rent = Number(formVal.rent || 0);
      if (rent > 0) {
        items.push({
          description: `Canone d'affitto - ${monthLabel} ${year}`,
          amount: rent,
          type: 'rent'
        });
      }

      // Con includeUtilities: true il backend calcola e aggiunge le voci utenza; non le inviamo nel payload
      if (!includeUtilities) {
        for (const row of this.utilityRows) {
          if (row.included && row.amount > 0) {
            items.push({
              description: `${row.label} - ${monthLabel} ${year} (consumo ${row.consumption} ${row.unit})`,
              amount: row.amount,
              type: this.mapItemTypeForBackend(row.itemType)
            });
          }
        }
        if (this.hasLaundryReading && this.laundryRow.included && this.laundryRow.amount > 0) {
          items.push({
            description: `Elettricità Lavanderia - ${monthLabel} ${year} (consumo ${this.laundryRow.consumption} ${this.laundryRow.unit})`,
            amount: this.laundryRow.amount,
            type: 'electricity_laundry'
          });
        }
      }

      const tari = Number(formVal.tari || 0);
      if (tari > 0) {
        items.push({
          description: `TARI (Nettezza Urbana) - ${monthLabel} ${year}`,
          amount: tari,
          type: 'tari'
        });
      }

      const meterFee = Number(formVal.meterFee || 0);
      if (meterFee > 0) {
        items.push({
          description: `Costo contatori - ${monthLabel} ${year}`,
          amount: meterFee,
          type: 'meter_fee'
        });
      }

      for (const manual of this.manualItems) {
        if (manual.amount > 0 && manual.description) {
          items.push({
            description: manual.description,
            amount: manual.amount,
            type: this.mapItemTypeForBackend(manual.type)
          });
        }
      }
    }

    const payload: InvoiceCreate = {
      leaseId: this.selectedLease.id,
      tenantId: this.selectedLease.tenantId,
      apartmentId: this.selectedLease.apartmentId,
      invoiceNumber: this.generatedInvoiceNumber,
      month,
      year,
      issueDate: this.formatDateISO(formVal.issueDate),
      dueDate: this.formatDateISO(formVal.dueDate),
      includeUtilities: includeUtilities || undefined,
      subtotal: this.getTotal(),
      notes: (formVal.notes || '').trim() || undefined,
      items
    };

    this.invoiceService.createInvoice(payload as any).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (created) => {
        this.submitting = false;
        this.dialogRef.close({ success: true, invoice: created, payload });
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.message || 'Errore nella creazione della fattura';
        console.error('Errore creazione fattura:', err);
      }
    });
  }

  private formatDateISO(date: Date | string): string {
    if (!date) return new Date().toISOString().split('T')[0];
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
