import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Lease, LeaseFormData } from '../models/lease.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  private apiUrl = `${environment.apiUrl}/leases`;

  constructor(private http: HttpClient) { }

  // Ottiene tutti i contratti
  getLeases(): Observable<Lease[]> {
    return this.http.get<Lease[]>(this.apiUrl)
      .pipe(
        catchError(error => {
          console.error('Errore durante il recupero dei contratti', error);
          return of([]);
        })
      );
  }

  // Ottiene un contratto specifico per ID
  getLease(id: number): Observable<Lease> {
    return this.http.get<Lease>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero del contratto ${id}`, error);
          throw error;
        })
      );
  }

  // Crea un nuovo contratto
  createLease(leaseData: LeaseFormData): Observable<Lease> {
    return this.http.post<Lease>(this.apiUrl, leaseData)
      .pipe(
        catchError(error => {
          console.error('Errore durante la creazione del contratto', error);
          throw error;
        })
      );
  }

  // Aggiorna un contratto esistente
  updateLease(id: number, leaseData: Partial<LeaseFormData>): Observable<Lease> {
    return this.http.put<Lease>(`${this.apiUrl}/${id}`, leaseData)
      .pipe(
        catchError(error => {
          console.error(`Errore durante l'aggiornamento del contratto ${id}`, error);
          throw error;
        })
      );
  }

  // Elimina un contratto
  deleteLease(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante l'eliminazione del contratto ${id}`, error);
          throw error;
        })
      );
  }

  // Ottiene i contratti filtrati per inquilino
  getLeasesByTenant(tenantId: number): Observable<Lease[]> {
    const params = new HttpParams().set('tenantId', tenantId.toString());
    return this.http.get<Lease[]>(this.apiUrl, { params })
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero dei contratti per l'inquilino ${tenantId}`, error);
          return of([]);
        })
      );
  }

  // Ottiene i contratti filtrati per appartamento
  getLeasesByApartment(apartmentId: number): Observable<Lease[]> {
    const params = new HttpParams().set('apartmentId', apartmentId.toString());
    return this.http.get<Lease[]>(this.apiUrl, { params })
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero dei contratti per l'appartamento ${apartmentId}`, error);
          return of([]);
        })
      );
  }

  // Ottiene i contratti attivi
  getActiveLeases(): Observable<Lease[]> {
    const params = new HttpParams().set('isActive', 'true');
    return this.http.get<Lease[]>(this.apiUrl, { params })
      .pipe(
        catchError(error => {
          console.error('Errore durante il recupero dei contratti attivi', error);
          return of([]);
        })
      );
  }

  // Aggiunge un documento al contratto
  addLeaseDocument(leaseId: number, document: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${leaseId}/documents`, document)
      .pipe(
        catchError(error => {
          console.error(`Errore durante l'aggiunta del documento al contratto ${leaseId}`, error);
          throw error;
        })
      );
  }

  // Registra un pagamento per il contratto
  recordLeasePayment(leaseId: number, paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${leaseId}/payments`, paymentData)
      .pipe(
        catchError(error => {
          console.error(`Errore durante la registrazione del pagamento per il contratto ${leaseId}`, error);
          throw error;
        })
      );
  }

  getExpiringSoonLeases() {
    return this.getActiveLeases().pipe(
      map(leases => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        return leases.filter(lease => {
          const endDate = new Date(lease.endDate);
          return endDate > today && endDate <= thirtyDaysFromNow;
        });
      })
    );
  }
}
