import { Component, OnInit, ViewChild, Inject, OnDestroy } from '@angular/core';
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
export class ReadingHistoryComponent implements OnInit, OnDestroy {
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
  
  // Filters
  filterForm!: FormGroup;
  
  // Configuration (caricata dal backend)
  utilityTypes: UtilityTypeConfig[] = [];
  isLoadingUtilityTypes = false;
  
  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
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
    this.loadUtilityTypes();
    this.setupFilterSubscriptions();
    this.loadReadings();
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
        this.utilityTypes = types;
        this.isLoadingUtilityTypes = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento dei tipi utility:', error);
        this.isLoadingUtilityTypes = false;
        this.snackBar.open('Errore nel caricamento dei tipi di utility', 'Chiudi', { duration: 3000 });
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
          this.processReadings(readings);
          this.isLoading = false;
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
    this.updateDataSourceConfig();
  }
  
  updateDataSourceConfig(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }
  
  clearFilters(): void {
    this.filterForm.reset({
      apartmentId: this.data.selectedApartmentId
    });
  }
  
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grouped' : 'table';
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
      if (result) {
        this.showSuccessSnackBar('Lettura aggiornata con successo');
        this.loadReadings();
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
    this.apiService.deleteUtilityReading(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.allReadings = this.allReadings.filter(r => r.id !== id);
            this.updateGroupedData();
            this.applyFilters();
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
    return this.utilityTypes.find(ut => ut.type === type) || this.utilityTypes[0];
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
    
    if (filters.search) count++;
    if (filters.apartmentId && filters.apartmentId !== this.data.selectedApartmentId) count++;
    if (filters.utilityType) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.isPaid !== '') count++;
    
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