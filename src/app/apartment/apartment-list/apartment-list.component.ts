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
import { Apartment } from '../../shared/models';
import { GenericApiService } from '../../shared/services/generic-api.service';

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
  // Rimuoviamo 'address' e aggiungiamo 'floor' alle colonne
  displayedColumns: string[] = ['id', 'name', 'rooms', 'squareMeters', 'monthlyRent', 'floor', 'status', 'actions'];
  dataSource = new MatTableDataSource<Apartment>([]);
  isLoading = true;
  errorMessage: string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadApartments();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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

  deleteApartment(id: string): void {
    if (confirm('Sei sicuro di voler eliminare questo appartamento? Questa azione non può essere annullata.')) {
      this.apiService.delete('apartments', id).subscribe({
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