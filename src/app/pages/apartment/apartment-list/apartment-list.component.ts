import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Apartment } from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { ApartmentFormComponent } from '../apartment-form/apartment-form-dialog.component';
import { ApartmentDetailDialogComponent } from '../apartment-detail/apartment-detail-dialog.component';

@Component({
  selector: 'app-apartment-list',
  standalone: true,
  imports: [
    CommonModule,
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
    MatProgressSpinnerModule
  ],
  templateUrl: './apartment-list.component.html',
  styleUrls: ['./apartment-list.component.scss']
})
export class ApartmentListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'status', 'monthlyRent', 'squareMeters', 'floor', 'rooms', 'actions'];
  dataSource = new MatTableDataSource<Apartment>([]);
  isLoading = true;
  errorMessage: string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
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
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Configurazione personalizzata del paginatore
    if (this.paginator) {
      this.paginator._intl.nextPageLabel = 'Pagina successiva';
      this.paginator._intl.previousPageLabel = 'Pagina precedente';
      this.paginator._intl.firstPageLabel = 'Prima pagina';
      this.paginator._intl.lastPageLabel = 'Ultima pagina';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
        if (length === 0 || pageSize === 0) {
          return `0 di ${length}`;
        }
        length = Math.max(length, 0);
        const startIndex = page * pageSize;
        const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
        return `${page + 1} di ${Math.ceil(length / pageSize)}`;
      };
    }
  }

  loadApartments(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getAll<Apartment>('apartments').subscribe({
      next: (apartments) => {
        this.dataSource.data = apartments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento degli appartamenti. Riprova più tardi.';
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
    // Utilizza il servizio di conferma
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
}