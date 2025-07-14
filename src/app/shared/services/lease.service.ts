import { Injectable, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Lease } from '../models/lease.model';
import { GenericApiService } from './generic-api.service';
import { LeaseFormComponent } from '../../pages/lease/lease-form/lease-form.component';
import { LeaseDetailComponent } from '../../pages/lease/lease-detail/lease-detail.component';

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  // Signal per tenere traccia delle operazioni sui lease
  private _isLoading = signal<boolean>(false);
  private _currentLease = signal<Lease | null>(null);
  private _operationResult = signal<string | null>(null);
  private _activeDialogRef: any = null; // Riferimento al dialog attivo

  // Getter per i signal
  get isLoading() { return this._isLoading.asReadonly(); }
  get currentLease() { return this._currentLease.asReadonly(); }
  get operationResult() { return this._operationResult.asReadonly(); }

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog
  ) {}

  /**
   * Ottiene tutti i contratti
   */
  getAllLeases(): Observable<Lease[]> {
    return this.apiService.getAll<Lease>('leases');
  }
  
  /**
   * Ottiene i contratti attivi che scadranno entro un mese
   * @returns Observable con la lista dei contratti in scadenza
   */
  getExpiringLeases(): Observable<Lease[]> {
    const today = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    return this.getAllLeases().pipe(
      map(leases => {
        // Filtra i contratti attivi che scadranno entro un mese
        return leases.filter(lease => {
          const endDate = new Date(lease.endDate);
          return lease.isActive && endDate <= oneMonthFromNow && endDate >= today;
        });
      }),
      // Ordina i contratti per data di scadenza (prima i più vicini alla scadenza)
      map(leases => {
        return leases.sort((a, b) => {
          const dateA = new Date(a.endDate);
          const dateB = new Date(b.endDate);
          return dateA.getTime() - dateB.getTime();
        });
      })
    );
  }
  
  /**
   * Ottiene il numero di contratti in scadenza
   * @returns Observable con il numero di contratti in scadenza
   */
  getExpiringLeasesCount(): Observable<number> {
    return this.getExpiringLeases().pipe(
      map(leases => leases.length)
    );
  }
  
  /**
   * Ottiene tutti i contratti ordinati per data di scadenza
   * @returns Observable con la lista dei contratti ordinati
   */
  getAllLeasesSortedByExpiration(): Observable<Lease[]> {
    return this.getAllLeases().pipe(
      map(leases => {
        return leases.sort((a, b) => {
          const dateA = new Date(a.endDate);
          const dateB = new Date(b.endDate);
          return dateA.getTime() - dateB.getTime();
        });
      })
    );
  }

  // Metodi per gestire i modal e le operazioni sui lease

  /**
   * Apre il modale per visualizzare un lease
   */
  openLeaseDetail(lease: Lease): void {
    this._currentLease.set(lease);
    
    const dialogRef = this.dialog.open(LeaseDetailComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'lease-detail-dialog',
      data: { leaseId: lease.id }
    });

    this._activeDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._operationResult.set('lease-viewed');
      }
      this._currentLease.set(null);
      this._activeDialogRef = null;
    });
  }

  /**
   * Apre il modale per modificare un lease
   */
  openLeaseEdit(lease: Lease): void {
    this._currentLease.set(lease);
    
    const dialogRef = this.dialog.open(LeaseFormComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'lease-form-dialog',
      data: { leaseId: lease.id, mode: 'edit' }
    });

    this._activeDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._operationResult.set('lease-updated');
      }
      this._currentLease.set(null);
      this._activeDialogRef = null;
    });
  }

  /**
   * Elimina un lease con conferma
   */
  deleteLease(lease: Lease): Observable<boolean> {
    this._currentLease.set(lease);
    this._isLoading.set(true);
    
    return new Observable(observer => {
      if (confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
        this.apiService.delete('leases', lease.id).subscribe({
          next: () => {
            this._operationResult.set('lease-deleted');
            this._isLoading.set(false);
            this._currentLease.set(null);
            observer.next(true);
            observer.complete();
          },
          error: (error) => {
            console.error('Errore durante l\'eliminazione del contratto', error);
            this._operationResult.set('lease-delete-error');
            this._isLoading.set(false);
            this._currentLease.set(null);
            observer.next(false);
            observer.complete();
          }
        });
      } else {
        this._isLoading.set(false);
        this._currentLease.set(null);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Chiude il modale attivo
   */
  closeModal(): void {
    if (this._activeDialogRef) {
      this._activeDialogRef.close();
      this._activeDialogRef = null;
      this._currentLease.set(null);
    }
  }

  /**
   * Resetta i signal
   */
  resetSignals(): void {
    this._isLoading.set(false);
    this._currentLease.set(null);
    this._operationResult.set(null);
    this._activeDialogRef = null;
  }
} 