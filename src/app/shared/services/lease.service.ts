import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Lease } from '../models/lease.model';
import { GenericApiService } from './generic-api.service';

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  constructor(private apiService: GenericApiService) {}

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
} 