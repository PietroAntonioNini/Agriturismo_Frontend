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

  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    const now = new Date();
    this.form = this.fb.group({
      apartmentId: [null, Validators.required],
      month: [now.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [now.getFullYear(), [Validators.required, Validators.min(2020)]],
      rent: [{ value: 0, disabled: true }],
      tari: [0],
      meterFee: [0],
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
      } else {
        // fallback da utilityTypes
        for (const r of this.rows) {
          const cfg = (utilityTypes || []).find((u: any) => u.type === r.type);
          if (cfg) {
            r.unit = cfg.unit || r.unit;
            r.unitCost = Number(cfg.defaultCost ?? 0);
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

    forkJoin({
      gas: this.api.getAllUtilityReadings({ apartmentId, type: 'gas', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      electricity: this.api.getAllUtilityReadings({ apartmentId, type: 'electricity', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      water: this.api.getAllUtilityReadings({ apartmentId, type: 'water', start_date: startIso, end_date: endIso }).pipe(catchError(_ => of([]))),
      lastGas: this.api.getLastUtilityReading(apartmentId, 'gas').pipe(catchError(_ => of(null))),
      lastElec: this.api.getLastUtilityReading(apartmentId, 'electricity').pipe(catchError(_ => of(null))),
      lastWater: this.api.getLastUtilityReading(apartmentId, 'water').pipe(catchError(_ => of(null)))
    }).subscribe(res => {
      this.fillRow('gas', res.gas, res.lastGas);
      this.fillRow('electricity', res.electricity, res.lastElec);
      this.fillRow('water', res.water, res.lastWater);
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
          gas: Number(this.rows.find(r => r.type === 'gas')?.unitCost || 0)
        }
      }).subscribe();
    }

    this.pdf.generatePdf({
      apartmentName: apartment?.name || `Appartamento ${apartmentId}`,
      apartmentId,
      month, year,
      rows: this.rows,
      rent: Number(rent || 0),
      tari: Number(tari || 0),
      meterFee: Number(meterFee || 0)
    });

    this.dialogRef.close();
  }
}


