import { Component, OnInit, AfterViewInit, ViewChild, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ReadingFormComponent } from '../reading-form/reading-form.component';
import { 
  UtilityReading, 
  Apartment, 
  UtilityTypeConfig,
  UtilitySummary 
} from '../../../shared/models';

interface ReadingWithApartmentName extends UtilityReading {
  apartmentName: string;
}

interface ReadingGroupedData {
  apartment: string;
  apartmentId: number;
  readings: ReadingWithApartmentName[];
  totals: {
    electricity: { consumption: number; cost: number; };
    water: { consumption: number; cost: number; };
    gas: { consumption: number; cost: number; };
    total: number;
  };
}

@Component({
  selector: 'app-reading-history',
  templateUrl: './reading-history.component.html',
  styleUrls: ['./reading-history.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule,
    MatMenuModule
  ]
})
export class ReadingHistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  // Display configurations
  displayedColumns: string[] = [
    'apartmentName', 
    'type', 
    'readingDate', 
    'currentReading',
    'consumption', 
    'totalCost',
    'isPaid',
    'actions'
  ];
  
  // Data sources
  dataSource = new MatTableDataSource<ReadingWithApartmentName>([]);
  allReadings: ReadingWithApartmentName[] = [];
  groupedData: ReadingGroupedData[] = [];
  
  // UI states
  isLoading = true;
  errorMessage: string | null = null;
  viewMode: 'table' | 'grouped' = 'table';
  
  // Flip card states - track which cards are flipped
  flippedCards: Set<number> = new Set();
  
  // Filters
  filterForm!: FormGroup;
  
  // Configuration (caricata dal backend)
  utilityTypes: UtilityTypeConfig[] = [];
  isLoadingUtilityTypes = false;
  
  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ReadingHistoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      apartments: Apartment[],
      selectedApartmentId: number | null
    }
  ) { 
    this.initFilterForm();
  }

  ngOnInit(): void {
    this.setupFilterSubscriptions();
    this.loadUtilityTypes();
  }

  ngAfterViewInit(): void {
    // Configura il paginatore e il sort dopo che la vista è stata inizializzata
    if (this.dataSource.data.length > 0) {
      this.updateDataSourceConfig();
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

        
        // Carica le letture dopo aver caricato i tipi di utenza
        this.loadReadings();
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
        this.showInfoSnackBar('Utilizzando configurazione predefinita per i tipi di utenza');
        
        // Carica le letture anche in caso di errore (con fallback)
        this.loadReadings();
      }
    });
  }
  
  initFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      apartmentId: [this.data.selectedApartmentId],
      utilityType: [''],
      startDate: [''],
      endDate: [''],
      isPaid: ['']
    });
  }
  
  setupFilterSubscriptions(): void {
    this.filterForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  loadReadings(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    // Chiamata API centralizzata per le utility readings
    this.apiService.getAllUtilityReadings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (readings) => {
          // Sposta l'elaborazione pesante fuori dal thread principale
          setTimeout(() => {
            this.processReadings(readings);
            this.isLoading = false;
          }, 50);
        },
        error: (error) => {
          console.error('Errore durante il caricamento delle letture:', error);
          this.errorMessage = 'Impossibile caricare le letture. Riprova più tardi.';
          this.isLoading = false;
          this.processReadings([]); // Carica array vuoto in caso di errore
        }
      });
  }
  
  processReadings(readings: UtilityReading[]): void {
    // Aggiungi nome appartamento
    this.allReadings = readings.map(reading => {
      const apartment = this.data.apartments.find(apt => apt.id === reading.apartmentId);
      return {
        ...reading,
        apartmentName: apartment?.name || `Appartamento #${reading.apartmentId}`
      };
    });
    
    this.updateGroupedData();
    this.applyFilters();
    
    // Assicurati che il paginatore sia configurato dopo il caricamento iniziale
    setTimeout(() => {
      this.updateDataSourceConfig();
    }, 100);
  }
  
  updateGroupedData(): void {
    const grouped = new Map<number, ReadingGroupedData>();
    
    this.allReadings.forEach(reading => {
      const apartmentId = reading.apartmentId;
      
      if (!grouped.has(apartmentId)) {
        grouped.set(apartmentId, {
          apartment: reading.apartmentName,
          apartmentId,
          readings: [],
          totals: {
            electricity: { consumption: 0, cost: 0 },
            water: { consumption: 0, cost: 0 },
            gas: { consumption: 0, cost: 0 },
            total: 0
          }
        });
      }
      
      const group = grouped.get(apartmentId)!;
      group.readings.push(reading);
      
      // Aggiorna totali
      group.totals[reading.type].consumption += reading.consumption;
      group.totals[reading.type].cost += reading.totalCost;
      group.totals.total += reading.totalCost;
    });
    
    this.groupedData = Array.from(grouped.values())
      .sort((a, b) => a.apartment.localeCompare(b.apartment));
  }
  
  applyFilters(): void {
    const filters = this.filterForm.value;
    let filteredReadings = [...this.allReadings];
    
    // Filtro per testo
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredReadings = filteredReadings.filter(reading =>
        reading.apartmentName.toLowerCase().includes(searchLower) ||
        this.getUtilityTypeConfig(reading.type).label.toLowerCase().includes(searchLower) ||
        (reading.notes && reading.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtro per appartamento
    if (filters.apartmentId) {
      filteredReadings = filteredReadings.filter(reading =>
        reading.apartmentId === filters.apartmentId
      );
    }
    
    // Filtro per tipo utenza
    if (filters.utilityType) {
      filteredReadings = filteredReadings.filter(reading =>
        reading.type === filters.utilityType
      );
    }
    
    // Filtro per data inizio
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredReadings = filteredReadings.filter(reading =>
        new Date(reading.readingDate) >= startDate
      );
    }
    
    // Filtro per data fine
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filteredReadings = filteredReadings.filter(reading =>
        new Date(reading.readingDate) <= endDate
      );
    }
    
    // Filtro per stato pagamento
    if (filters.isPaid !== '') {
      const isPaid = filters.isPaid === 'true';
      filteredReadings = filteredReadings.filter(reading =>
        reading.isPaid === isPaid
      );
    }
    
    this.dataSource.data = filteredReadings;
    
    // Forza l'aggiornamento del paginatore dopo il cambio dati
    setTimeout(() => {
      this.updateDataSourceConfig();
    }, 0);
  }
  
  updateDataSourceConfig(): void {
    // Configura il sort
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    
    // Configura il paginatore con pageSize fisso a 5
    if (this.paginator) {
      this.paginator.pageSize = 5;
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }
  
  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      apartmentId: this.data.selectedApartmentId,
      utilityType: '',
      startDate: '',
      endDate: '',
      isPaid: ''
    });
  }
  
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grouped' : 'table';
  }
  
  setViewMode(mode: 'table' | 'grouped'): void {
    this.viewMode = mode;
    
    // Se passiamo alla vista raggruppata, aggiorna i dati
    if (mode === 'grouped') {
      this.updateGroupedData();
    }
    
    // Reset flip states when changing view
    this.flippedCards.clear();
  }
  
  toggleCardFlip(apartmentId: number): void {
    if (this.flippedCards.has(apartmentId)) {
      this.flippedCards.delete(apartmentId);
    } else {
      this.flippedCards.add(apartmentId);
    }
  }
  
  isCardFlipped(apartmentId: number): boolean {
    return this.flippedCards.has(apartmentId);
  }
  
  editReading(reading: ReadingWithApartmentName): void {
    const dialogRef = this.dialog.open(ReadingFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      data: {
        apartments: this.data.apartments,
        selectedApartmentId: reading.apartmentId,
        editingReading: reading
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.updatedReading) {
        // Aggiornamento ISTANTANEO dell'array locale - NO chiamata server
        const updatedReading = result.updatedReading;
        
        // Trova e aggiorna l'elemento nell'array principale
        const readingIndex = this.allReadings.findIndex(r => r.id === reading.id);
        if (readingIndex !== -1) {
          // Mantieni il nome dell'appartamento
          this.allReadings[readingIndex] = {
            ...updatedReading,
            apartmentName: reading.apartmentName
          };
          
          // Aggiorna immediatamente la vista
          this.updateGroupedData();
          this.applyFilters();
          
          // Aggiungi notifica
          this.notificationService.notifyUtilityReading(
            'updated', 
            reading.apartmentName, 
            updatedReading.type, 
            updatedReading.id
          );
          
          this.showSuccessSnackBar('Lettura aggiornata con successo');
        }
      } else if (result === true) {
        // Fallback: se il form non restituisce la lettura aggiornata, ricarica dal server
        this.loadReadings();
        this.showSuccessSnackBar('Lettura aggiornata con successo');
      }
    });
  }
  
  deleteReading(reading: ReadingWithApartmentName): void {
    const confirmed = confirm(
      `Sei sicuro di voler eliminare la lettura ${this.getUtilityTypeConfig(reading.type).label} del ${this.formatDate(reading.readingDate)}?`
    );
    
    if (confirmed && reading.id) {
      this.performDeleteReading(reading.id);
    }
  }
  
  performDeleteReading(id: number): void {
    // Trova la lettura prima di eliminarla per la notifica
    const readingToDelete = this.allReadings.find(r => r.id === id);
    
    this.apiService.deleteUtilityReading(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.allReadings = this.allReadings.filter(r => r.id !== id);
            this.updateGroupedData();
            this.applyFilters();
            
            // Aggiungi notifica
            if (readingToDelete) {
              this.notificationService.notifyUtilityReading(
                'deleted', 
                readingToDelete.apartmentName, 
                readingToDelete.type, 
                readingToDelete.id
              );
            }
            
            this.showSuccessSnackBar('Lettura eliminata con successo');
          } else {
            this.showInfoSnackBar('Errore durante l\'eliminazione della lettura');
          }
        },
        error: (error) => {
          console.error('Errore durante l\'eliminazione:', error);
          this.showInfoSnackBar('Errore durante l\'eliminazione della lettura');
        }
      });
  }
  
  togglePaymentStatus(reading: ReadingWithApartmentName): void {
    if (!reading.id) return;
    
    const newStatus = !reading.isPaid;
    this.apiService.toggleUtilityPaymentStatus(reading.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedReading) => {
          if (updatedReading) {
            reading.isPaid = updatedReading.isPaid;
            reading.paidDate = updatedReading.paidDate;
            this.showSuccessSnackBar(
              `Lettura contrassegnata come ${reading.isPaid ? 'pagata' : 'non pagata'}`
            );
          } else {
            this.showInfoSnackBar('Errore durante l\'aggiornamento dello stato');
          }
        },
        error: (error) => {
          console.error('Errore durante il toggle stato pagamento:', error);
          this.showInfoSnackBar('Errore durante l\'aggiornamento dello stato');
        }
      });
  }
  
  exportData(): void {
    // TODO: Implementare export
    this.showInfoSnackBar('Funzionalità di export in sviluppo');
  }
  
  // Utility methods
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('it-IT');
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
  
  getUtilityTypeConfig(type: string): UtilityTypeConfig {
    // Fallback predefinito per i tipi di utenza
    const defaultConfigs: { [key: string]: UtilityTypeConfig } = {
      'electricity': {
        type: 'electricity',
        label: 'Elettricità',
        unit: 'kWh',
        icon: 'bolt',
        color: '#FF6B6B',
        defaultCost: 0.25
      },
      'water': {
        type: 'water',
        label: 'Acqua',
        unit: 'm³',
        icon: 'water_drop',
        color: '#4ECDC4',
        defaultCost: 1.50
      },
      'gas': {
        type: 'gas',
        label: 'Gas',
        unit: 'm³',
        icon: 'local_fire_department',
        color: '#45B7D1',
        defaultCost: 0.80
      }
    };

    // Prova prima dall'array caricato dal backend
    const loadedConfig = this.utilityTypes.find(ut => ut.type === type);
    if (loadedConfig) {
      return loadedConfig;
    }

    // Se non trova o l'array è vuoto, usa il fallback predefinito
    return defaultConfigs[type] || defaultConfigs['electricity'];
  }
  
  getFilteredApartments(): Apartment[] {
    if (!this.filterForm.get('apartmentId')?.value) {
      return this.data.apartments;
    }
    return this.data.apartments.filter(apt => 
      apt.id === this.filterForm.get('apartmentId')?.value
    );
  }
  
  getActiveFiltersCount(): number {
    const filters = this.filterForm.value;
    let count = 0;
    
    if (filters.search && filters.search.trim() !== '') count++;
    if (filters.apartmentId && filters.apartmentId !== this.data.selectedApartmentId) count++;
    if (filters.utilityType && filters.utilityType !== '') count++;
    if (filters.startDate && filters.startDate !== '') count++;
    if (filters.endDate && filters.endDate !== '') count++;
    if (filters.isPaid !== '' && filters.isPaid !== null && filters.isPaid !== undefined) count++;
    
    return count;
  }
  
  onClose(): void {
    this.dialogRef.close();
  }
  
  private showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
  
  private showInfoSnackBar(message: string): void {
    this.snackBar.open(message, 'Chiudi', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}