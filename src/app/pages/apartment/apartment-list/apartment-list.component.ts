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
import { combineLatest, timeout } from 'rxjs';
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

  loadApartments(forceRefresh: boolean = false): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Usa combineLatest per caricare i dati in parallelo con timeout
    const apartmentsRequest = this.apiService.getAll<Apartment>('apartments', undefined, forceRefresh);
    const leasesRequest = this.apiService.getAll<any>('leases', undefined, forceRefresh);

    // Combina le due richieste con timeout
    const timeoutMs = 30000; // 30 secondi di timeout
    
    const apartmentsWithTimeout = apartmentsRequest.pipe(
      timeout(timeoutMs)
    );
    
    const leasesWithTimeout = leasesRequest.pipe(
      timeout(timeoutMs)
    );

    combineLatest([apartmentsWithTimeout, leasesWithTimeout]).subscribe({
      next: ([apartments, allLeases]) => {
        const apartmentsArray = apartments || [];
        const leasesArray = allLeases || [];

        // Filtra solo i contratti attivi usando lo stato fornito dal backend
        const activeLeases = leasesArray.filter((lease: any) => lease.status === 'active');
        const occupiedApartmentIds = new Set(activeLeases.map((lease: any) => lease.apartmentId));

        // Usa requestAnimationFrame per evitare blocchi del thread principale
        requestAnimationFrame(() => {
          this.apartments = apartmentsArray.map((apartment: any) => {
            const isOccupied = occupiedApartmentIds.has(apartment.id);
            const newStatus = apartment.status === 'maintenance' 
              ? 'maintenance' 
              : isOccupied ? 'occupied' : 'available';
              
            return { ...apartment, status: newStatus };
          });

          this.applyFilter();
          this.isLoading = false;
        });
      },
      error: (error: any) => {
        console.error('Errore durante il caricamento dei dati', error);
        this.errorMessage = 'Si è verificato un errore. Riprova più tardi.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    // Usa requestAnimationFrame per evitare blocchi del thread principale
    requestAnimationFrame(() => {
      let filtered = [...this.apartments];
      
      // Applica filtro di ricerca con debounce
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
    });
  }

  // Metodo per forzare il refresh dei dati
  refreshData(): void {
    this.loadApartments(true);
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
    // Trova l'appartamento nella lista locale per passare i dati aggiornati
    const apartment = this.apartments.find(a => a.id === apartmentId);
    
    const dialogRef = this.dialog.open(ApartmentDetailDialogComponent, {
      data: { apartmentId, apartment }, // Passa anche l'appartamento aggiornato
      width: '800px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.deleted) {
          // Ottimizzazione: rimuovi l'appartamento dalla lista invece di ricaricare tutto
          this.removeApartmentFromList(apartmentId);
        } else if (result.edit) {
          this.openApartmentForm(result.apartmentId);
        }
      }
    });
  }

  openApartmentForm(apartmentId?: number): void {
    // Se è in modalità modifica, trova l'appartamento nella lista locale
    const apartment = apartmentId ? this.apartments.find(a => a.id === apartmentId) : undefined;
    
    const dialogRef = this.dialog.open(ApartmentFormComponent, {
      data: { apartmentId, apartment }, // Passa anche l'appartamento aggiornato
      width: '900px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Ottimizzazione: aggiorna solo l'appartamento modificato invece di ricaricare tutto
        if (result.apartment) {
          if (apartmentId) {
            // Modifica
            this.updateApartmentInList(result.apartment);
          } else {
            // Creazione
            this.addApartmentToList(result.apartment);
          }
        }
        
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
              // Ottimizzazione: rimuovi l'appartamento dalla lista invece di ricaricare tutto
              this.removeApartmentFromList(apartment.id);
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

  // Metodo per aggiornare un appartamento specifico nella lista
  private updateApartmentInList(updatedApartment: Apartment): void {
    if (!updatedApartment) return;

    // Trova e aggiorna l'appartamento nella lista
    const index = this.apartments.findIndex(a => a.id === updatedApartment.id);
    if (index !== -1) {
      // Mantieni lo stato esistente se non è stato modificato
      const existingApartment = this.apartments[index];
      this.apartments[index] = {
        ...updatedApartment,
        status: existingApartment.status // Mantieni lo stato calcolato
      };
      
      // Riapplica i filtri per aggiornare la visualizzazione
      this.applyFilter();
      
      // Mostra feedback all'utente
      this.snackBar.open('Appartamento aggiornato con successo', 'Chiudi', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } else {
      // Se non trovato, ricarica tutto (caso raro)
      this.loadApartments();
    }
  }

  // Metodo per aggiungere un nuovo appartamento alla lista
  private addApartmentToList(newApartment: Apartment): void {
    if (!newApartment) return;

    // Aggiungi il nuovo appartamento all'inizio della lista
    this.apartments.unshift({
      ...newApartment,
      status: 'available' // Nuovo appartamento è disponibile
    });
    
    // Riapplica i filtri per aggiornare la visualizzazione
    this.applyFilter();
    
    // Mostra feedback all'utente
    this.snackBar.open('Appartamento creato con successo', 'Chiudi', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Metodo per rimuovere un appartamento dalla lista
  private removeApartmentFromList(apartmentId: number): void {
    // Rimuovi l'appartamento dalla lista principale
    this.apartments = this.apartments.filter(a => a.id !== apartmentId);
    
    // Riapplica i filtri per aggiornare la visualizzazione
    this.applyFilter();
    
    // Mostra feedback all'utente
    this.snackBar.open('Appartamento eliminato con successo', 'Chiudi', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}