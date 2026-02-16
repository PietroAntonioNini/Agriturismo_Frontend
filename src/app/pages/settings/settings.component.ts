import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SettingsService, StatementDefaultsPayload, AutomationSettings, AutomationPayload } from '../../shared/services/settings.service';

/** Modalità in UI; 'delayed' corrisponde a 'scheduled' nell'API. */
type AutomationMode = 'manual' | 'immediate' | 'delayed';

interface SettingsPlaceholder {
  title: string;
  description: string;
  status: 'planned' | 'coming_soon';
  icon: string;
  key: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatSlideToggleModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  lastSavedAt: Date | null = null;

  /* ── Automazioni ── */
  showAutomations = false;
  automationMode: AutomationMode = 'manual';
  delayDays = 3;
  automationLoading = false;
  automationSaving = false;

  readonly defaults = {
    tari: 15,
    meterFee: 3,
    electricity: 0.75,
    water: 3.4,
    gas: 4.45
  };

  readonly placeholders: SettingsPlaceholder[] = [
    {
      title: 'Regole Automazioni',
      description: 'Workflow automatici per solleciti, rinnovi e fatture inviate.',
      status: 'coming_soon',
      icon: 'auto_mode',
      key: 'automazioni'
    },
    {
      title: 'Notifiche',
      description: 'Preferenze email/push, promemoria scadenze e avvisi pagamenti.',
      status: 'planned',
      icon: 'notifications',
      key: 'notifiche'
    },
    {
      title: 'Anagrafiche e Branding',
      description: 'Logo, intestazioni documenti e personalizzazione PDF.',
      status: 'planned',
      icon: 'palette',
      key: 'branding'
    }
  ];

  settingsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
    this.settingsForm = this.fb.group({
      tari: [this.defaults.tari, [Validators.required, Validators.min(0)]],
      meterFee: [this.defaults.meterFee, [Validators.required, Validators.min(0)]],
      unitCosts: this.fb.group({
        electricity: [this.defaults.electricity, [Validators.required, Validators.min(0)]],
        water: [this.defaults.water, [Validators.required, Validators.min(0)]],
        gas: [this.defaults.gas, [Validators.required, Validators.min(0)]]
      })
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  get totalFixedCosts(): number {
    const tari = Number(this.settingsForm.get('tari')?.value ?? 0);
    const meterFee = Number(this.settingsForm.get('meterFee')?.value ?? 0);
    return tari + meterFee;
  }

  get unitCostsGroup(): FormGroup {
    return this.settingsForm.get('unitCosts') as FormGroup;
  }

  loadSettings(): void {
    this.isLoading = true;
    this.automationLoading = true;

    this.settingsService.getStatementDefaults().subscribe({
      next: (response) => {
        this.applySettingsResponse(response);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.showError('Impossibile caricare le impostazioni. Sono stati mantenuti i valori predefiniti.');
      }
    });

    this.settingsService.getAutomation().subscribe({
      next: (response) => {
        this.applyAutomationResponse(response);
        this.automationLoading = false;
      },
      error: () => {
        this.automationLoading = false;
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      this.showError('Controlla i campi evidenziati prima di salvare.');
      return;
    }

    const payload = this.buildPayload();
    this.isSaving = true;

    this.settingsService.saveStatementDefaults(payload).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (!result) {
          this.showError('Salvataggio non riuscito. Riprova.');
          return;
        }

        this.applySettingsResponse(result);
        this.lastSavedAt = new Date();
        this.showSuccess('Impostazioni salvate con successo.');
      },
      error: () => {
        this.isSaving = false;
        this.showError('Errore durante il salvataggio delle impostazioni.');
      }
    });
  }

  resetToBackendValues(): void {
    this.loadSettings();
  }

  resetToSystemDefaults(): void {
    this.settingsForm.patchValue({
      tari: this.defaults.tari,
      meterFee: this.defaults.meterFee,
      unitCosts: {
        electricity: this.defaults.electricity,
        water: this.defaults.water,
        gas: this.defaults.gas
      }
    });
    this.settingsForm.markAsDirty();
  }

  placeholderStatusLabel(status: SettingsPlaceholder['status']): string {
    return status === 'planned' ? 'Pianificata' : 'In arrivo';
  }

  /* ── Automazioni helpers ── */

  onPlaceholderClick(item: SettingsPlaceholder): void {
    if (item.key === 'automazioni') {
      this.showAutomations = !this.showAutomations;
    } else {
      this.showAutomations = false;
    }
  }

  onImmediateToggle(checked: boolean): void {
    if (checked) {
      this.setAutomationAndSave('immediate');
    } else if (this.automationMode === 'immediate') {
      this.setAutomationAndSave('manual');
    }
  }

  onDelayedToggle(checked: boolean): void {
    if (checked) {
      this.setAutomationAndSave('delayed');
    } else if (this.automationMode === 'delayed') {
      this.setAutomationAndSave('manual');
    }
  }

  onManualToggle(checked: boolean): void {
    if (checked) {
      this.setAutomationAndSave('manual');
    }
  }

  onDelayDaysChange(): void {
    if (this.automationMode === 'delayed') {
      this.saveAutomationPayload(this.buildAutomationPayload());
    }
  }

  private setAutomationAndSave(mode: AutomationMode): void {
    this.automationMode = mode;
    this.saveAutomationPayload(this.buildAutomationPayload());
  }

  private buildAutomationPayload(): AutomationPayload {
    const apiType = this.automationMode === 'delayed' ? 'scheduled' : this.automationMode;
    const payload: AutomationPayload = { automationType: apiType };
    if (apiType === 'scheduled') {
      payload.automationDays = Math.min(365, Math.max(1, this.delayDays));
    }
    return payload;
  }

  private saveAutomationPayload(payload: AutomationPayload): void {
    this.automationSaving = true;
    this.settingsService.saveAutomation(payload).subscribe({
      next: (result) => {
        this.automationSaving = false;
        if (result) {
          this.applyAutomationResponse(result);
          this.showSuccess('Impostazioni automazione aggiornate.');
        } else {
          this.showError('Impossibile salvare le impostazioni automazione.');
        }
      },
      error: () => {
        this.automationSaving = false;
        this.showError('Errore durante il salvataggio delle impostazioni automazione.');
      }
    });
  }

  private applyAutomationResponse(response: AutomationSettings | null): void {
    if (!response) return;
    const type = response.automationType;
    this.automationMode = type === 'scheduled' ? 'delayed' : type;
    this.delayDays = response.automationDays ?? 3;
    if (this.delayDays < 1) this.delayDays = 1;
    if (this.delayDays > 365) this.delayDays = 365;
  }

  get automationModeLabel(): string {
    switch (this.automationMode) {
      case 'immediate': return 'Invio immediato';
      case 'delayed': return `Invio programmato (${this.delayDays} giorni)`;
      default: return 'Invio manuale';
    }
  }

  get automationModeDescription(): string {
    switch (this.automationMode) {
      case 'immediate':
        return 'Le fatture verranno inviate automaticamente non appena create.';
      case 'delayed':
        return `Le fatture verranno inviate automaticamente dopo ${this.delayDays} giorni dalla creazione.`;
      default:
        return 'Dovrai inviare manualmente ogni fattura ai tuoi clienti.';
    }
  }

  private applySettingsResponse(response: StatementDefaultsPayload | null): void {
    const data = response ?? {};

    this.settingsForm.patchValue({
      tari: data.tari ?? this.defaults.tari,
      meterFee: data.meterFee ?? this.defaults.meterFee,
      unitCosts: {
        electricity: data.unitCosts?.electricity ?? this.defaults.electricity,
        water: data.unitCosts?.water ?? this.defaults.water,
        gas: data.unitCosts?.gas ?? this.defaults.gas
      }
    });

    this.settingsForm.markAsPristine();
  }

  private buildPayload(): StatementDefaultsPayload {
    return {
      tari: Number(this.settingsForm.get('tari')?.value),
      meterFee: Number(this.settingsForm.get('meterFee')?.value),
      unitCosts: {
        electricity: Number(this.unitCostsGroup.get('electricity')?.value),
        water: Number(this.unitCostsGroup.get('water')?.value),
        gas: Number(this.unitCostsGroup.get('gas')?.value)
      }
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Chiudi', {
      duration: 3200,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Chiudi', {
      duration: 4500,
      panelClass: ['error-snackbar']
    });
  }
}
