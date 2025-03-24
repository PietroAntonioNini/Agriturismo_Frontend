import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Apartment, Lease, MaintenanceRecord } from '../../../shared/models';

@Component({
  selector: 'app-apartment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './apartment-detail.component.html',
  styleUrls: ['./apartment-detail.component.scss']
})
export class ApartmentDetailComponent implements OnInit {
  apartment: Apartment | null = null;
  activeLeases: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadApartmentData(id);
    } else {
      this.errorMessage = 'ID appartamento non valido.';
      this.isLoading = false;
    }
  }

  loadApartmentData(id: string): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getById<Apartment>('apartments', id).subscribe({
      next: (apartment) => {
        this.apartment = apartment;
        this.loadApartmentLeases(id);
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'appartamento', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'appartamento.';
        this.isLoading = false;
      }
    });
  }

  loadApartmentLeases(apartmentId: string): void {
    this.apiService.getActiveEntities<Lease>('leases').subscribe({
      next: (leases) => {
        this.activeLeases = leases.filter(lease => lease.apartmentId === parseInt(apartmentId, 10));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.isLoading = false;
      }
    });
  }

  deleteApartment(id: number): void {
    if (!this.apartment) return;

    if (confirm('Sei sicuro di voler eliminare questo appartamento? Questa azione non può essere annullata.')) {
      this.apiService.delete('apartments', this.apartment.id!).subscribe({
        next: () => {
          this.snackBar.open('Appartamento eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/apartment/list']);
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

  getMaintenanceTypeLabel(type: string): string {
    switch (type) {
      case 'repair':
        return 'Riparazione';
      case 'inspection':
        return 'Ispezione';
      case 'upgrade':
        return 'Aggiornamento';
      case 'cleaning':
        return 'Pulizia';
      default:
        return type;
    }
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }
}