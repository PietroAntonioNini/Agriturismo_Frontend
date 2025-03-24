import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenericApiService } from '../../shared/services/generic-api.service';
import { UtilityReading, Apartment } from '../../shared/models';

@Component({
  selector: 'app-reading-history',
  templateUrl: './reading-history.component.html',
  styleUrls: ['./reading-history.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class ReadingHistoryComponent implements OnInit {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  displayedColumns: string[] = ['id', 'apartmentName', 'type', 'readingDate', 'previousReading', 'currentReading', 'consumption', 'unitCost', 'totalCost', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  
  isLoading = true;
  errorMessage: string | null = null;
  
  constructor(
    private apiService: GenericApiService,
    public dialogRef: MatDialogRef<ReadingHistoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      apartments: Apartment[],
      selectedApartmentId: number | null
    }
  ) { }

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.apiService.getAllReadings<any>().subscribe({
      next: (readings) => {
        // Aggiungi il nome dell'appartamento ai dati
        const readingsWithApartmentName = readings.map(reading => {
          const apartment = this.data.apartments.find(apt => 
            apt.id === (reading.apartmentId ? reading.apartmentId : undefined)
          );
          return {
            ...reading,
            apartmentName: apartment ? apartment.name : `Appartamento #${reading.apartmentId}`
          };
        });
        
        // Filtra per appartamento selezionato se necessario
        const filteredReadings = this.data.selectedApartmentId 
          ? readingsWithApartmentName.filter(r => 
              r.apartmentId && r.apartmentId === this.data.selectedApartmentId
            )
          : readingsWithApartmentName;
          
        this.dataSource.data = filteredReadings;
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento delle letture', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento delle letture.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  getUtilityTypeLabel(type: string): string {
    switch (type) {
      case 'electricity': return 'Elettricità';
      case 'water': return 'Acqua';
      case 'gas': return 'Gas';
      default: return type;
    }
  }

  deleteReading(id: number): void {
    if (confirm('Sei sicuro di voler eliminare questa lettura?')) {
      this.apiService.deleteReading(id).subscribe({
        next: () => {
          this.loadReadings();
        },
        error: (error) => {
          console.error('Errore durante l\'eliminazione della lettura', error);
          this.errorMessage = 'Si è verificato un errore durante l\'eliminazione della lettura.';
        }
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}