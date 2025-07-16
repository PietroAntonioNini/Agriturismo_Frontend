import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { 
  Apartment, 
  UtilityFormData, 
  LastReading, 
  UtilityTypeConfig,
  UtilityReading,
  UtilityReadingCreate 
} from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-reading-form',
  templateUrl: './reading-form.component.html',
  styleUrls: ['./reading-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule
  ]
})
export class ReadingFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  readingForm!: FormGroup;
  isLoading = false;
  isLoadingLastReading = false;
  errorMessage: string | null = null;
  
  // Dati
  lastReading: LastReading | null = null;
  calculatedConsumption: number = 0;
  calculatedCost: number = 0;
  
  // Configurazione tipi utenze (caricata dal backend)
  utilityTypes: UtilityTypeConfig[] = [];
  isLoadingUtilityTypes = false;

  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
    public dialogRef: MatDialogRef<ReadingFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      apartments: Apartment[],
      selectedApartmentId: number | null,
      editingReading?: UtilityReading
    }
  ) { }

  ngOnInit(): void {
    this.loadUtilityTypes();
    
    // Se abbiamo dati di editing, configura il form
    if (this.data.editingReading) {
      this.populateFormForEditing();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUtilityTypes(): void {
    this.isLoadingUtilityTypes = true;
    
    this.apiService.getUtilityTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (types) => {
        this.utilityTypes = types || [];
        this.isLoadingUtilityTypes = false;
        
        
        // Inizializza il form dopo aver caricato i tipi di utenza
        this.initForm();
        
        // Setup delle subscription dopo l'inizializzazione del form
        this.setupFormSubscriptions();
      },
      error: (error) => {
        console.error('Errore nel caricamento dei tipi utility:', error);
        this.isLoadingUtilityTypes = false;
        
        // Inizializza con i tipi predefiniti in caso di errore
        this.utilityTypes = [
          {
            type: 'electricity',
            label: 'Elettricità',
            unit: 'kWh',
            icon: 'bolt',
            color: '#FF6B6B',
            defaultCost: 0.25
          },
          {
            type: 'water',
            label: 'Acqua',
            unit: 'm³',
            icon: 'water_drop',
            color: '#4ECDC4',
            defaultCost: 1.50
          },
          {
            type: 'gas',
            label: 'Gas',
            unit: 'm³',
            icon: 'local_fire_department',
            color: '#45B7D1',
            defaultCost: 0.80
          }
        ];
        
        // Mostra un messaggio meno invasivo
        this.snackBar.open('Utilizzando configurazione predefinita per i tipi di utenza', 'Chiudi', { duration: 3000 });
        
        // Inizializza il form anche in caso di errore (con fallback)
        this.initForm();
        
        // Setup delle subscription dopo l'inizializzazione del form
        this.setupFormSubscriptions();
      }
    });
  }

  initForm(): void {
    const today = new Date();
    
    this.readingForm = this.fb.group({
      apartmentId: [this.data.selectedApartmentId || '', Validators.required],
      type: ['', Validators.required],
      readingDate: [today, Validators.required],
      previousReading: [0, [Validators.min(0)]], // Campo per lettura precedente (prima lettura)
      currentReading: [0, [Validators.required, Validators.min(0)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }
  


  setupFormSubscriptions(): void {
    // Monitora cambiamenti in appartamento e tipo per caricare l'ultima lettura
    this.readingForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => 
        prev.apartmentId === curr.apartmentId && prev.type === curr.type
      )
    ).subscribe(formValue => {
      if (formValue.apartmentId && formValue.type) {
        this.loadLastReading(formValue.apartmentId, formValue.type);
        this.setDefaultUnitCost(formValue.type);
      }
    });
    
    // Monitora cambiamenti per calcolare consumo e costo
    this.readingForm.get('currentReading')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(200)
    ).subscribe(() => {
      this.calculateConsumptionAndCost();
    });
    
    this.readingForm.get('previousReading')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(200)
    ).subscribe(() => {
      this.calculateConsumptionAndCost();
    });
    
    this.readingForm.get('unitCost')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(200)
    ).subscribe(() => {
      this.calculateConsumptionAndCost();
    });
  }
  
  populateFormForEditing(): void {
    if (!this.data.editingReading) return;
    
    const reading = this.data.editingReading;
    this.readingForm.patchValue({
      apartmentId: reading.apartmentId,
      type: reading.type,
      readingDate: new Date(reading.readingDate),
      previousReading: reading.previousReading || 0,
      currentReading: reading.currentReading,
      unitCost: reading.unitCost,
      notes: reading.notes || ''
    });
    
    // Simula l'ultima lettura per il calcolo
    this.lastReading = {
      apartmentId: reading.apartmentId,
      type: reading.type,
      lastReading: reading.previousReading,
      lastReadingDate: new Date(reading.readingDate),
      hasHistory: true
    };
    
    this.calculateConsumptionAndCost();
  }
  
  loadLastReading(apartmentId: number, type: string): void {
    this.isLoadingLastReading = true;
    this.lastReading = null;
    
    // Chiamata API centralizzata per ottenere l'ultima lettura
    this.apiService.getLastUtilityReading(apartmentId, type).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (lastReading: LastReading | null) => {
        this.lastReading = lastReading;
        
        // SOLO per nuove letture, suggerisce un valore incrementale
        // NON sovrascrivere il valore quando siamo in modalità modifica
        if (!this.data.editingReading) {
          if (this.lastReading && this.lastReading.hasHistory && this.lastReading.lastReading > 0) {
            const utilityConfig = this.getUtilityTypeConfig(type);
            let suggestedIncrement = 50; // Incremento base
            
            // Incrementi diversi per tipo di utenza
            switch (type) {
              case 'electricity':
                suggestedIncrement = Math.floor(Math.random() * 100) + 50; // 50-150 kWh
                break;
              case 'water':
                suggestedIncrement = Math.floor(Math.random() * 15) + 5; // 5-20 m³
                break;
              case 'gas':
                suggestedIncrement = Math.floor(Math.random() * 20) + 10; // 10-30 m³
                break;
            }
            
            const suggestedReading = (this.lastReading?.lastReading || 0) + suggestedIncrement;
            this.readingForm.patchValue({
              currentReading: suggestedReading
            });
          } else {
            // Prima lettura - imposta 0 come valore iniziale
            this.readingForm.patchValue({
              currentReading: 0
            });
          }
        }
        
        this.isLoadingLastReading = false;
        this.calculateConsumptionAndCost();
      },
      error: (error) => {
        console.error('Errore nel caricamento ultima lettura:', error);
        
        // In caso di errore, assume che sia la prima lettura
        this.lastReading = {
          apartmentId: apartmentId,
          type: type as 'electricity' | 'water' | 'gas',
          lastReading: 0,
          lastReadingDate: new Date(),
          hasHistory: false
        };
        
        // Solo per nuove letture, imposta 0 come valore iniziale
        // NON sovrascrivere il valore quando siamo in modalità modifica
        if (!this.data.editingReading) {
          this.readingForm.patchValue({
            currentReading: 0
          });
        }
        
        this.isLoadingLastReading = false;
        this.calculateConsumptionAndCost();
      }
    });
  }
  
  setDefaultUnitCost(type: string): void {
    const utilityConfig = this.getUtilityTypeConfig(type);
    const currentCost = this.readingForm.get('unitCost')?.value;
    
    if (!currentCost || currentCost === 0) {
      this.readingForm.patchValue({
        unitCost: utilityConfig.defaultCost
      });
    }
  }
  
  calculateConsumptionAndCost(): void {
    if (!this.readingForm) return;
    
    const currentReading = this.readingForm.get('currentReading')?.value || 0;
    const unitCost = this.readingForm.get('unitCost')?.value || 0;
    
    // Per la prima lettura, usa il campo previousReading del form
    // Altrimenti usa l'ultima lettura dal backend
    let previousReading = 0;
    if (this.isFirstReading()) {
      previousReading = this.readingForm.get('previousReading')?.value || 0;
    } else {
      previousReading = this.lastReading?.lastReading || 0;
    }
    
    this.calculatedConsumption = Math.max(0, currentReading - previousReading);
    this.calculatedCost = Math.round((this.calculatedConsumption * unitCost) * 100) / 100;
    
    // Aggiorna validazione per lettura corrente
    this.updateCurrentReadingValidation();
  }
  
  updateCurrentReadingValidation(): void {
    const currentReadingControl = this.readingForm.get('currentReading');
    const currentValue = currentReadingControl?.value || 0;
    
    // Per la prima lettura, usa il campo previousReading del form
    // Altrimenti usa l'ultima lettura dal backend
    let previousReading = 0;
    let shouldValidate = false;
    
    if (this.isFirstReading()) {
      previousReading = this.readingForm.get('previousReading')?.value || 0;
      shouldValidate = previousReading > 0; // Valida solo se è stata inserita una lettura precedente
    } else {
      previousReading = this.lastReading?.lastReading || 0;
      shouldValidate = this.lastReading?.hasHistory || false;
    }
    
    if (currentReadingControl && shouldValidate) {
      if (currentValue < previousReading) {
        currentReadingControl.setErrors({ 
          lessThanPrevious: { 
            previousReading: previousReading,
            currentReading: currentValue 
          } 
        });
      } else if (currentReadingControl.hasError('lessThanPrevious')) {
        // Rimuove l'errore se ora è corretto
        const errors = { ...currentReadingControl.errors };
        delete errors['lessThanPrevious'];
        currentReadingControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  onSubmit(): void {
    if (this.readingForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formValue = this.readingForm.value;
    
    // Per la prima lettura, usa il campo previousReading del form
    // Altrimenti usa l'ultima lettura dal backend
    let previousReading = 0;
    if (this.isFirstReading()) {
      previousReading = formValue.previousReading || 0;
    } else {
      previousReading = this.lastReading?.lastReading || 0;
    }
    
    // Converte la data nel formato corretto per il backend (ISO date string)
    const readingDate = new Date(formValue.readingDate);
    const dateString = readingDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    const readingData: UtilityReadingCreate = {
      apartmentId: Number(formValue.apartmentId),
      type: formValue.type,
      readingDate: dateString,
      previousReading: Number(previousReading),
      currentReading: Number(formValue.currentReading),
      consumption: Number(this.calculatedConsumption),
      unitCost: Number(formValue.unitCost),
      totalCost: Number(this.calculatedCost),
      isPaid: false,
      notes: formValue.notes || ''
    };

    console.log('Sending payload to backend:', readingData);
    console.log('Utility type:', readingData.type);
    console.log('Form value:', formValue);

    const apiCall = this.data.editingReading 
      ? this.apiService.updateUtilityReadingWithCorrectFormat(this.data.editingReading.id!, readingData)
      : this.apiService.createUtilityReadingWithCorrectFormat(readingData);

    apiCall.subscribe({
      next: (result) => {
        console.log('Backend response:', result);
        if (result) {
          this.isLoading = false;
          
          // Aggiungi notifica
          const apartment = this.data.apartments.find(a => a.id === Number(formValue.apartmentId));
          const apartmentName = apartment?.name || 'Appartamento';
          const action = this.data.editingReading ? 'updated' : 'created';
          this.notificationService.notifyUtilityReading(action, apartmentName, formValue.type, result.id);
          
          this.showSuccessSnackBar(
            this.data.editingReading 
              ? 'Lettura aggiornata con successo' 
              : 'Lettura salvata con successo'
          );
          
          // Se siamo in modalità modifica, restituisci la lettura aggiornata per l'aggiornamento istantaneo
          if (this.data.editingReading) {
            const updatedReading: UtilityReading = {
              ...this.data.editingReading, // Mantieni ID e altri campi non modificabili
              apartmentId: Number(formValue.apartmentId),
              type: formValue.type,
              readingDate: new Date(formValue.readingDate),
              previousReading: Number(previousReading),
              currentReading: Number(formValue.currentReading),
              consumption: Number(this.calculatedConsumption),
              unitCost: Number(formValue.unitCost),
              totalCost: Number(this.calculatedCost),
              notes: formValue.notes || '',
              // isPaid rimane invariato in una modifica
              paidDate: this.data.editingReading.paidDate
            };
            
            this.dialogRef.close({ 
              success: true, 
              updatedReading: updatedReading 
            });
          } else {
            // Per nuove letture, restituisci solo il successo
            this.dialogRef.close(true);
          }
        } else {
          this.errorMessage = 'Errore nella risposta del server';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Errore durante il salvataggio della lettura:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        
        // Gestione dettagliata degli errori
        if (error.status === 422) {
          this.errorMessage = 'Dati non validi. Controlla i campi inseriti.';
          if (error.error?.detail) {
            this.errorMessage += ` Dettagli: ${error.error.detail}`;
          }
        } else if (error.status === 400) {
          this.errorMessage = error.error?.detail || 'Richiesta non valida.';
        } else {
          this.errorMessage = 'Si è verificato un errore durante il salvataggio della lettura.';
        }
        
        this.isLoading = false;
      }
    });
  }
  
  markFormGroupTouched(): void {
    Object.keys(this.readingForm.controls).forEach(key => {
      const control = this.readingForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
  
  // Helper methods
  getUtilityTypeConfig(type: string): UtilityTypeConfig {
    return this.utilityTypes.find(ut => ut.type === type) || this.utilityTypes[0];
  }
  
  getSelectedUtilityConfig(): UtilityTypeConfig | null {
    if (!this.readingForm) return null;
    const selectedType = this.readingForm.get('type')?.value;
    return selectedType ? this.getUtilityTypeConfig(selectedType) : null;
  }
  
  getSelectedApartmentName(): string {
    if (!this.readingForm) return 'Seleziona appartamento';
    const selectedId = this.readingForm.get('apartmentId')?.value;
    const apartment = this.data.apartments.find(apt => apt.id === selectedId);
    return apartment?.name || 'Seleziona appartamento';
  }
  
  canCalculateConsumption(): boolean {
    if (!this.readingForm) return false;
    
    const currentReading = this.readingForm.get('currentReading')?.value || 0;
    const unitCost = this.readingForm.get('unitCost')?.value || 0;
    
    if (this.isFirstReading()) {
      // Per la prima lettura, deve avere lettura attuale, costo unitario e almeno una lettura precedente
      const previousReading = this.readingForm.get('previousReading')?.value || 0;
      return currentReading > 0 && unitCost > 0 && previousReading >= 0;
    } else {
      // Per letture successive, deve avere ultima lettura dal backend
      return this.lastReading !== null && currentReading > 0 && unitCost > 0;
    }
  }
  
  isFirstReading(): boolean {
    // Se lastReading è null, potrebbe essere che non abbiamo ancora caricato i dati
    // o che ci sia stato un errore - consideriamola come prima lettura
    if (this.lastReading === null) {
      return true;
    }
    
    // Se hasHistory è false, è sicuramente la prima lettura
    return !this.lastReading.hasHistory;
  }

  /**
   * Verifica se dobbiamo mostrare il campo "Lettura Precedente"
   * Mostra il campo SOLO per le prime letture (quando non c'è storico)
   */
  shouldShowPreviousReadingField(): boolean {
    // Se non abbiamo il form inizializzato, nascondi il campo
    if (!this.readingForm) return false;
    
    // Se stiamo modificando una lettura esistente, nascondi il campo
    if (this.data.editingReading) return false;
    
    // Se stiamo ancora caricando, nascondi il campo
    if (this.isLoadingLastReading) return false;
    
    // Se lastReading è null, nascondi il campo (ancora in caricamento)
    if (!this.lastReading) return false;
    
    // Mostra il campo SOLO se non c'è storico (prima lettura)
    return this.lastReading.hasHistory === false;
  }
  
  getFormControlError(controlName: string): string {
    const control = this.readingForm.get(controlName);
    
    if (!control?.touched || !control.errors) {
      return '';
    }
    
    if (control.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control.hasError('min')) {
      return `Valore minimo: ${control.getError('min').min}`;
    }
    if (control.hasError('lessThanPrevious')) {
      const error = control.getError('lessThanPrevious');
      return `La lettura deve essere maggiore di ${error.previousReading}`;
    }
    
    // Errori specifici per previousReading
    if (controlName === 'previousReading') {
      if (control.hasError('required')) {
        return 'Inserisci la lettura precedente del contatore';
      }
      if (control.hasError('min')) {
        return 'La lettura precedente non può essere negativa';
      }
    }
    
    return 'Campo non valido';
  }
  
  private showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
}