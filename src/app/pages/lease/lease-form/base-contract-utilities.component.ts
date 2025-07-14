import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Apartment, UtilityReading, UtilityTypeConfig, LastReading } from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';

interface UtilityReadingForm {
  electricity: number | null;
  water: number | null;
  gas: number | null;
}

interface UtilityReadingData {
  type: 'electricity' | 'water' | 'gas';
  label: string;
  icon: string;
  color: string;
  unit: string;
  value: number | null;
  lastReading?: LastReading;
  isLoading?: boolean;
}

@Component({
  selector: 'app-base-contract-utilities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './base-contract-utilities.component.html',
  styleUrls: ['./base-contract-utilities.component.scss']
})
export class BaseContractUtilitiesComponent implements OnInit, OnDestroy {
  @Input() apartment: Apartment | null = null;
  @Input() isReadOnly = false;
  @Output() utilitiesChange = new EventEmitter<UtilityReadingForm>();
  @Output() validationChange = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  utilitiesForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  // Configurazioni tipi utenze
  utilityTypes: UtilityTypeConfig[] = [
    {
      type: 'electricity',
      label: 'Elettricità',
      unit: 'kWh',
      icon: 'bolt',
      color: '#FFC107',
      defaultCost: 0.22
    },
    {
      type: 'water',
      label: 'Acqua',
      unit: 'm³',
      icon: 'water_drop',
      color: '#2196F3',
      defaultCost: 2.50
    },
    {
      type: 'gas',
      label: 'Gas',
      unit: 'm³',
      icon: 'local_fire_department',
      color: '#FF5722',
      defaultCost: 1.20
    }
  ];

  // Dati utenze con ultime letture
  utilityData: UtilityReadingData[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
    this.initializeUtilityData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.utilitiesForm = this.fb.group({
      electricity: [null, [Validators.min(0)]],
      water: [null, [Validators.min(0)]],
      gas: [null, [Validators.min(0)]]
    });
  }

  private setupFormSubscriptions(): void {
    // Monitora i cambiamenti nel form
    this.utilitiesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(values => {
        // Emetti i valori delle utenze
        this.utilitiesChange.emit({
          electricity: values.electricity,
          water: values.water,
          gas: values.gas
        });

        // Emetti lo stato di validazione
        this.validationChange.emit(this.utilitiesForm.valid);
      });
  }

  private initializeUtilityData(): void {
    this.utilityData = this.utilityTypes.map(type => ({
      type: type.type,
      label: type.label,
      icon: type.icon,
      color: type.color,
      unit: type.unit,
      value: null,
      isLoading: false
    }));

    // Carica le ultime letture se abbiamo un appartamento
    if (this.apartment?.id) {
      this.loadLastReadings();
    }
  }

  private loadLastReadings(): void {
    if (!this.apartment?.id) return;

    this.isLoading = true;
    this.errorMessage = null;

    // Carica le ultime letture per ogni tipo di utenza
    const readingRequests = this.utilityTypes.map(type => {
      const utilityIndex = this.utilityData.findIndex(u => u.type === type.type);
      if (utilityIndex >= 0) {
        this.utilityData[utilityIndex].isLoading = true;
      }

      return this.apiService.getLastUtilityReading(this.apartment!.id!, type.type)
        .pipe(takeUntil(this.destroy$));
    });

    forkJoin(readingRequests).subscribe({
      next: (lastReadings) => {
        lastReadings.forEach((reading, index) => {
          const utilityIndex = this.utilityData.findIndex(u => u.type === this.utilityTypes[index].type);
          if (utilityIndex >= 0) {
            this.utilityData[utilityIndex].lastReading = reading || undefined;
            this.utilityData[utilityIndex].isLoading = false;
            
            // Pre-compila il form con l'ultima lettura se disponibile
            if (reading && reading.hasHistory) {
              this.utilitiesForm.patchValue({
                [this.utilityTypes[index].type]: reading.lastReading
              });
            }
          }
        });
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle ultime letture:', error);
        this.errorMessage = 'Errore nel caricamento delle ultime letture delle utenze.';
        this.isLoading = false;
        
        // Reset dello stato di loading per tutte le utenze
        this.utilityData.forEach(u => u.isLoading = false);
      }
    });
  }

  /**
   * Ottiene i dati di configurazione per un tipo di utenza
   */
  getUtilityConfig(type: 'electricity' | 'water' | 'gas'): UtilityTypeConfig | undefined {
    return this.utilityTypes.find(u => u.type === type);
  }

  /**
   * Ottiene i dati di una specifica utenza
   */
  getUtilityData(type: 'electricity' | 'water' | 'gas'): UtilityReadingData | undefined {
    return this.utilityData.find(u => u.type === type);
  }

  /**
   * Formatta la data per la visualizzazione
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  /**
   * Controlla se il form è valido
   */
  isFormValid(): boolean {
    return this.utilitiesForm.valid;
  }

  /**
   * Ottiene i valori del form
   */
  getFormValues(): any {
    return this.utilitiesForm.value;
  }

  /**
   * Imposta i valori del form
   */
  setFormValues(values: any): void {
    this.utilitiesForm.patchValue(values);
  }

  /**
   * Apre il dialog per aggiungere una nuova lettura utenza
   */
  openAddUtilityReadingDialog(type: 'electricity' | 'water' | 'gas'): void {
    // Implementazione per aprire il dialog delle letture utenze
    // Integrerà con il componente ReadingFormComponent esistente
    console.log('Aprire dialog per aggiungere lettura:', type);
  }

  /**
   * Ricarica le ultime letture
   */
  refreshLastReadings(): void {
    if (this.apartment?.id) {
      this.loadLastReadings();
    }
  }

  /**
   * Controlla se tutte le letture sono state inserite
   */
  areAllReadingsComplete(): boolean {
    const values = this.utilitiesForm.value;
    return (values.electricity !== null && values.electricity >= 0) &&
           (values.water !== null && values.water >= 0) &&
           (values.gas !== null && values.gas >= 0);
  }

  /**
   * Ottiene un messaggio di aiuto per l'utente
   */
  getHelpMessage(): string {
    if (!this.apartment) {
      return 'Seleziona prima un appartamento per visualizzare le letture utenze.';
    }
    
    const missingReadings = this.utilityData
      .filter(u => this.utilitiesForm.get(u.type)?.value === null)
      .map(u => u.label);
    
    if (missingReadings.length === 0) {
      return 'Tutte le letture sono state inserite.';
    }
    
    return `Mancano le letture per: ${missingReadings.join(', ')}`;
  }
} 