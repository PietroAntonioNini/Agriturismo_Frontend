import { Component, OnInit, Inject, Optional } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { LeaseService } from '../../../shared/services/lease.service';
import { Lease, LeaseDocument, LeasePayment } from '../../../shared/models/lease.model';
import { Tenant } from '../../../shared/models';
import { Apartment } from '../../../shared/models';
import { MatSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-lease-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatSpinner
  ],
  templateUrl: './lease-detail.component.html',
  styleUrls: ['./lease-detail.component.scss']
})
export class LeaseDetailComponent implements OnInit {
  lease: Lease | null = null;
  tenant: Tenant | null = null;
  apartment: Apartment | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private leaseService: LeaseService,
    @Optional() public dialogRef: MatDialogRef<LeaseDetailComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    // Se siamo in un dialog, usa i dati passati, altrimenti usa i parametri della route
    let leaseId: number | null = null;
    
    if (this.data && this.data.leaseId) {
      leaseId = this.data.leaseId;
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        leaseId = +id;
      }
    }
    
    if (leaseId) {
      this.loadLease(leaseId);
    } else {
      this.errorMessage = 'ID contratto non valido';
      this.isLoading = false;
    }
  }

  loadLease(id: number): void {
    this.isLoading = true;
    this.apiService.getById<Lease>('leases', id).subscribe({
      next: (lease) => {
        this.lease = lease;
        this.loadTenant(lease.tenantId);
        this.loadApartment(lease.apartmentId);
      },
      error: (error) => {
        console.error('Errore durante il caricamento del contratto', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento del contratto.';
        this.isLoading = false;
      }
    });
  }

  loadTenant(tenantId: number): void {
    this.apiService.getById<Tenant>('tenants', tenantId).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'inquilino', error);
      },
      complete: () => {
        this.checkLoadingComplete();
      }
    });
  }

  loadApartment(apartmentId: number): void {
    this.apiService.getById<Apartment>('apartments', apartmentId).subscribe({
      next: (apartment) => {
        this.apartment = apartment;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'appartamento', error);
      },
      complete: () => {
        this.checkLoadingComplete();
      }
    });
  }

  checkLoadingComplete(): void {
    if (this.tenant && this.apartment) {
      this.isLoading = false;
    }
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return 'N/D';
    return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Attivo' : 'Terminato';
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  editLease(): void {
    if (this.lease) {
      this.router.navigate(['/lease/edit', this.lease.id]);
    }
  }

  deleteLease(): void {
    if (!this.lease) return;

    if (confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
      this.apiService.delete('leases', this.lease.id).subscribe({
        next: () => {
          this.snackBar.open('Contratto eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          // Se siamo in un modale, chiudilo con risultato
          if (this.dialogRef) {
            this.dialogRef.close({ deleted: true });
          } else {
            // Se siamo in una pagina normale, naviga alla lista
            this.router.navigate(['/lease/list']);
          }
        },
        error: (error) => {
          console.error('Errore durante l\'eliminazione del contratto', error);
          this.snackBar.open('Si è verificato un errore durante l\'eliminazione del contratto', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/lease/list']);
  }

  getContractProgress(startDate: string | Date, endDate: string | Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    
    // Calcola la percentuale completata
    let percentComplete = Math.round((elapsedDuration / totalDuration) * 100);
    
    // Assicurati che sia tra 0 e 100
    percentComplete = Math.max(0, Math.min(100, percentComplete));
    
    return percentComplete + '%';
  }
  
  getContractProgressText(startDate: string | Date, endDate: string | Date): string {
    const percentComplete = this.getContractProgress(startDate, endDate).replace('%', '');
    return percentComplete + '% completato';
  }
  
  getRemainingMonths(endDate: string | Date): number {
    const end = new Date(endDate);
    const today = new Date();
    
    // Calcola la differenza in mesi
    const months = (end.getFullYear() - today.getFullYear()) * 12 + 
                   (end.getMonth() - today.getMonth());
    
    return Math.max(0, months);
  }

  closeModal(): void {
    this.leaseService.closeModal();
  }
}