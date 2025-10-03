import { Component, OnInit, inject } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { MonthlyStatementService, StatementUtilityRow } from '../../../shared/services/monthly-statement.service';
import { SettingsService } from '../../../shared/services/settings.service';

@Component({
  standalone: true,
  selector: 'app-generate-statement-dialog',
  templateUrl: './generate-statement-dialog.component.html',
  styleUrls: ['./generate-statement-dialog.component.scss'],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatCheckboxModule
  ]
})
export class GenerateStatementDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<GenerateStatementDialogComponent>);
  private fb = inject(FormBuilder);
  private api = inject(GenericApiService);
  private pdf = inject(MonthlyStatementService);
  private settings = inject(SettingsService);

  form!: FormGroup;
  apartments: any[] = [];

  rows: StatementUtilityRow[] = [
    { label: 'GAS', type: 'gas', unit: 'm³', previous: null, current: null, consumption: 0, unitCost: 0, amount: 0 },
    { label: 'LUCE', type: 'electricity', unit: 'kWh', previous: null, current: null, consumption: 0, unitCost: 0, amount: 0 },
    { label: 'ACQUA', type: 'water', unit: 'm³', previous: null, current: null, consumption: 0, unitCost: 0, amount: 0 },
  ];

  // Riga lavanderia (solo per Appartamento 8)
  laundryRow: StatementUtilityRow = { 
    label: 'LAVANDERIA', 
    type: 'laundry', 
    unit: 'kWh', 
    previous: null, 
    current: null, 
    consumption: 0, 
    unitCost: 0, 
    amount: 0 
  };

  loading = false;
  error: string | null = null;

  // Verifica se l'appartamento selezionato è l'Appartamento 8
  isApartment8(): boolean {
    const apartmentId = this.form?.get('apartmentId')?.value;
    if (!apartmentId || !this.apartments.length) return false;
    const apartment = this.apartments.find(apt => apt.id === apartmentId);
    if (!apartment) return false;
    const name = apartment.name.toLowerCase();
    return name.includes('appartamento 8') || 
           name.includes('appartamento8') || 
           name === 'appartamento 8' || 
           name === 'apt 8' || 
           name === 'apt. 8';
  }

  ngOnInit(): void {
    const now = new Date();
    // Imposta il mese precedente come default
    const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    this.form = this.fb.group({
      apartmentId: [null, Validators.required],
      month: [previousMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [previousYear, [Validators.required, Validators.min(2020)]],
      rent: [{ value: 0, disabled: true }],
      tari: [15], // Default TARI
      meterFee: [3], // Default contatori
      saveDefaults: [false]
    });

    // Carica default da backend
    this.loading = true;
    forkJoin({
      apartments: this.api.getAll<any>('apartments').pipe(catchError(_ => of([]))),
      defaults: this.settings.getStatementDefaults().pipe(catchError(_ => of(null))),
      utilityTypes: this.api.getUtilityTypes().pipe(catchError(_ => of([])))
    }).subscribe(({ apartments, defaults, utilityTypes }) => {
      this.apartments = apartments || [];
      if (defaults) {
        this.form.patchValue({
          tari: defaults.tari ?? 15,
          meterFee: defaults.meterFee ?? 3
        });
        // Costi unitari
        for (const r of this.rows) {
          const key = r.type;
          r.unitCost = Number(defaults.unitCosts?.[key] ?? r.unitCost ?? 0);
        }
        // Costo lavanderia (usa lo stesso costo dell'elettricità se non specificato)
        if (this.laundryRow) {
          this.laundryRow.unitCost = Number(defaults.unitCosts?.['laundry'] ?? defaults.unitCosts?.['electricity'] ?? this.laundryRow.unitCost ?? 0);
        }
      } else {
        // fallback da utilityTypes
        for (const r of this.rows) {
          const cfg = (utilityTypes || []).find((u: any) => u.type === r.type);
          if (cfg) {
            r.unit = cfg.unit || r.unit;
            r.unitCost = Number(cfg.defaultCost ?? 0);
          }
        }
        // Costo lavanderia (usa lo stesso costo dell'elettricità)
        if (this.laundryRow) {
          const elecCfg = (utilityTypes || []).find((u: any) => u.type === 'electricity');
          if (elecCfg) {
            this.laundryRow.unit = elecCfg.unit || this.laundryRow.unit;
            this.laundryRow.unitCost = Number(elecCfg.defaultCost ?? 0);
          }
        }
      }
      this.loading = false;
    });

    // Cambio selezione → ricarica letture e affitto
    this.form.get('apartmentId')!.valueChanges.subscribe(() => this.refreshData());
    this.form.get('month')!.valueChanges.subscribe(() => this.refreshData());
    this.form.get('year')!.valueChanges.subscribe(() => this.refreshData());
  }

  private refreshData(): void {
    this.error = null;
    const apartmentId = this.form.get('apartmentId')!.value;
    const month = this.form.get('month')!.value;
    const year = this.form.get('year')!.value;
    if (!apartmentId || !month || !year) return;

    this.loading = true;

    const apt = this.apartments.find(a => a.id === apartmentId);
    this.form.get('rent')!.setValue(apt?.monthlyRent || 0);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const startIso = start.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];

    const requests: any = {
      gas: this.api.getAllUtilityReadings({ apartmentId, type: 'gas', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      electricity: this.api.getAllUtilityReadings({ apartmentId, type: 'electricity', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      water: this.api.getAllUtilityReadings({ apartmentId, type: 'water', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      lastGas: this.api.getLastUtilityReading(apartmentId, 'gas').pipe(catchError(_ => of(null))),
      lastElec: this.api.getLastUtilityReading(apartmentId, 'electricity').pipe(catchError(_ => of(null))),
      lastWater: this.api.getLastUtilityReading(apartmentId, 'water').pipe(catchError(_ => of(null)))
    };

    // Aggiungi richiesta lavanderia solo per Appartamento 8
    if (this.isApartment8()) {
      requests.laundry = this.api.getAllUtilityReadings({ 
        apartmentId, 
        type: 'electricity', 
        subtype: 'laundry',
        start_date: startIso, 
        end_date: endIso 
      }).pipe(catchError(_ => of([])));
      requests.lastLaundry = this.api.getLastUtilityReading(apartmentId, 'electricity', 'laundry').pipe(catchError(_ => of(null)));
    }

    forkJoin(requests).subscribe((res: any) => {
      this.fillRow('gas', res.gas, res.lastGas);
      this.fillRow('electricity', res.electricity, res.lastElec);
      this.fillRow('water', res.water, res.lastWater);
      
      // Carica dati lavanderia se è Appartamento 8
      if (this.isApartment8() && res.laundry) {
        this.fillLaundryRow(res.laundry, res.lastLaundry);
      } else {
        // Reset lavanderia se non è Appartamento 8
        this.resetLaundryRow();
      }
      
      this.loading = false;
    }, _ => {
      this.error = 'Errore nel caricamento delle letture';
      this.loading = false;
    });
  }

  private fillRow(type: 'gas'|'electricity'|'water', monthReadings: any[], lastReading: any | null): void {
    const row = this.rows.find(r => r.type === type)!;
    if (monthReadings && monthReadings.length > 0) {
      const latest = monthReadings.sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())[0];
      row.previous = Number(latest.previousReading ?? 0);
      row.current = Number(latest.currentReading ?? 0);
      const fallbackConsumption = (row.current ?? 0) - (row.previous ?? 0);
      row.consumption = Number((latest.consumption ?? fallbackConsumption) ?? 0);
      row.unitCost = Number(latest.unitCost ?? (row.unitCost ?? 0));
      row.amount = Number((latest.totalCost ?? (row.consumption * row.unitCost)) ?? 0);
    } else {
      row.previous = Number(lastReading?.lastReading ?? 0);
      row.current = null;
      row.consumption = 0;
      row.amount = 0;
    }
  }

  private fillLaundryRow(monthReadings: any[], lastReading: any | null): void {
    if (monthReadings && monthReadings.length > 0) {
      const latest = monthReadings.sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())[0];
      this.laundryRow.previous = Number(latest.previousReading ?? 0);
      this.laundryRow.current = Number(latest.currentReading ?? 0);
      const fallbackConsumption = (this.laundryRow.current ?? 0) - (this.laundryRow.previous ?? 0);
      this.laundryRow.consumption = Number((latest.consumption ?? fallbackConsumption) ?? 0);
      this.laundryRow.unitCost = Number(latest.unitCost ?? (this.laundryRow.unitCost ?? 0));
      this.laundryRow.amount = Number((latest.totalCost ?? (this.laundryRow.consumption * this.laundryRow.unitCost)) ?? 0);
    } else {
      this.laundryRow.previous = Number(lastReading?.lastReading ?? 0);
      this.laundryRow.current = null;
      this.laundryRow.consumption = 0;
      this.laundryRow.amount = 0;
    }
  }

  private resetLaundryRow(): void {
    this.laundryRow.previous = null;
    this.laundryRow.current = null;
    this.laundryRow.consumption = 0;
    this.laundryRow.amount = 0;
  }

  download(): void {
    if (this.form.invalid) return;

    const { apartmentId, month, year, rent, tari, meterFee, saveDefaults } = this.form.getRawValue();
    const apartment = this.apartments.find(a => a.id === apartmentId);

    if (saveDefaults) {
      this.settings.saveStatementDefaults({
        tari: Number(tari || 0),
        meterFee: Number(meterFee || 0),
        unitCosts: {
          electricity: Number(this.rows.find(r => r.type === 'electricity')?.unitCost || 0),
          water: Number(this.rows.find(r => r.type === 'water')?.unitCost || 0),
          gas: Number(this.rows.find(r => r.type === 'gas')?.unitCost || 0),
          laundry: Number(this.laundryRow.unitCost || 0)
        }
      }).subscribe();
    }

    // Prepara le righe per il PDF (incluse lavanderia se necessario)
    const allRows = [...this.rows];
    if (this.isApartment8() && this.laundryRow.consumption > 0) {
      allRows.push(this.laundryRow);
    }

    this.pdf.generatePdf({
      apartmentName: apartment?.name || `Appartamento ${apartmentId}`,
      apartmentId,
      month, year,
      rows: allRows,
      rent: Number(rent || 0),
      tari: Number(tari || 0),
      meterFee: Number(meterFee || 0)
    });

    this.dialogRef.close();
  }
}


