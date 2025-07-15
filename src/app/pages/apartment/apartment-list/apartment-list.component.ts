import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Apartment } from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { ApartmentFormComponent } from '../apartment-form/apartment-form-dialog.component';
import { ApartmentDetailDialogComponent } from '../apartment-detail/apartment-detail-dialog.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-apartment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatButtonToggleModule
  ],
  templateUrl: './apartment-list.component.html',
  styleUrls: ['./apartment-list.component.scss']
})
export class ApartmentListComponent implements OnInit {
  // Proprietà di visualizzazione
  apartments: Apartment[] = [];
  filteredApartments: Apartment[] = [];
  displayedColumns: string[] = ['name', 'status', 'monthlyRent', 'details', 'actions'];
  searchQuery: string = '';
  isLoading = true;
  errorMessage: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  
  // Proprietà per la paginazione
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  paginationStart: number = 1;
  paginationEnd: number = 0;
  
  // Proprietà per i filtri
  activeStatusFilters: string[] = [];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadApartments();
  }

  ngAfterViewInit() {
    if (this.sort) {
      this.sort.sortChange.subscribe(() => this.applySort());
    }
  }

  loadApartments(): void {
    this.isLoading = true;
    this.errorMessage = null;

    Promise.all([
      this.apiService.getAll<Apartment>('apartments').toPromise(),
      this.apiService.getAll<any>('leases', { status: 'active' }).toPromise()
    ]).then(([apartments, activeLeases]) => {
      if (!apartments) apartments = [];
      if (!activeLeases) activeLeases = [];

      const occupiedApartmentIds = new Set(activeLeases.map(lease => lease.apartmentId));

      this.apartments = apartments.map(apartment => {
        const isOccupied = occupiedApartmentIds.has(apartment.id);
        // Aggiorna lo stato solo se non è già 'maintenance'
        const newStatus = apartment.status === 'maintenance' 
          ? 'maintenance' 
          : isOccupied ? 'occupied' : 'available';
          
        return { ...apartment, status: newStatus };
      });

      this.applyFilter();
      this.isLoading = false;
    }).catch(error => {
      console.error('Errore durante il caricamento dei dati', error);
      this.errorMessage = 'Si è verificato un errore. Riprova più tardi.';
      this.isLoading = false;
    });
  }

  applyFilter(): void {
    let filtered = [...this.apartments];
    
    // Applica filtro di ricerca
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(apartment => 
        apartment.name.toLowerCase().includes(query) ||
        apartment.monthlyRent.toString().includes(query) ||
        apartment.squareMeters.toString().includes(query) ||
        apartment.rooms.toString().includes(query)
      );
    }
    
    // Applica filtri di stato
    if (this.activeStatusFilters.length > 0) {
      filtered = filtered.filter(apartment => 
        this.activeStatusFilters.includes(apartment.status)
      );
    }
    
    // Applica ordinamento se disponibile
    if (this.sort && this.sort.active && this.sort.direction) {
      this.applySortToData(filtered);
    }
    
    this.updatePagination(filtered);
  }

  applySortToData(data: Apartment[]): void {
    const direction = this.sort.direction === 'asc' ? 1 : -1;
    const property = this.sort.active;
    
    data.sort((a, b) => {
      const valueA = a[property as keyof Apartment];
      const valueB = b[property as keyof Apartment];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction * valueA.localeCompare(valueB);
      } else {
        return direction * (Number(valueA) - Number(valueB));
      }
    });
  }

  applySort(): void {
    this.applyFilter();
  }

  updatePagination(filteredData: Apartment[]): void {
    this.totalPages = Math.max(1, Math.ceil(filteredData.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, filteredData.length);
    
    this.paginationStart = filteredData.length > 0 ? startIndex + 1 : 0;
    this.paginationEnd = endIndex;
    
    this.filteredApartments = filteredData.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilter();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  toggleStatusFilter(status: string): void {
    const index = this.activeStatusFilters.indexOf(status);
    if (index > -1) {
      this.activeStatusFilters.splice(index, 1);
    } else {
      this.activeStatusFilters.push(status);
    }
    this.applyFilter();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'occupied':
        return 'status-occupied';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'occupied':
        return 'Occupato';
      case 'maintenance':
        return 'In Manutenzione';
      default:
        return status;
    }
  }

  // Metodo per verificare se un appartamento ha immagini valide
  hasValidImage(apartment: Apartment): boolean {
    return Boolean(apartment.images && apartment.images.length > 0 && apartment.images[0]);
  }

  // Metodo per ottenere l'URL della prima immagine
  getFirstImageUrl(apartment: Apartment): string {
    if (!this.hasValidImage(apartment)) return '';
    
    const imagePath = apartment.images?.[0] || '';
    
    // Se il percorso inizia già con http, restituiscilo com'è
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Assicurati che il percorso inizi con /static/
    let formattedPath = imagePath;
    if (!imagePath.startsWith('/static/') && imagePath.startsWith('/')) {
      formattedPath = '/static' + imagePath;
    }
    
    // Concatena con l'URL base dell'API
    return `${environment.apiUrl}${formattedPath}`;
  }

  openApartmentDetails(apartmentId: number): void {
    const dialogRef = this.dialog.open(ApartmentDetailDialogComponent, {
      data: { apartmentId },
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.deleted) {
          this.loadApartments();
        } else if (result.edit) {
          this.openApartmentForm(result.apartmentId);
        }
      }
    });
  }

  openApartmentForm(apartmentId?: number): void {
    const dialogRef = this.dialog.open(ApartmentFormComponent, {
      data: { apartmentId },
      width: '900px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadApartments();
        
        // Apri il dialog dei dettagli solo se non è stato richiesto di saltarlo
        if (result.apartment && !result.skipDetailView) {
          setTimeout(() => {
            this.openApartmentDetails(result.apartment.id);
          }, 300);
        }
      }
    });
  }

  deleteApartment(apartment: Apartment): void {
    this.confirmationService.confirmDelete('l\'appartamento', apartment.name)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('apartments', apartment.id).subscribe({
            next: () => {
              this.loadApartments();
              this.snackBar.open('Appartamento eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione dell\'appartamento', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'appartamento', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            }
          });
        }
      });
  }
}