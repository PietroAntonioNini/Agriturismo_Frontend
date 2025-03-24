import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GenericApiService {

  constructor(private http: HttpClient) { }

  private apiUrl(entity: string): string {
    return `${environment.apiUrl}/${entity}`;
  }

  // GET: Tutti gli elementi
  getAll<T>(entity: string, params?: any): Observable<T[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<T[]>(this.apiUrl(entity), { params: httpParams });
  }

  // GET: Elemento singolo per ID
  getById<T>(entity: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl(entity)}/${id}`);
  }

  // POST: Creazione elemento (anche con immagini opzionali)
  create<T>(entity: string, data: T, files?: File[], fileFieldPrefix?: string): Observable<T> {
    if (!files || files.length === 0) {
      return this.http.post<T>(this.apiUrl(entity), data);
    }

    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    files.forEach((file, index) => formData.append(`${fileFieldPrefix || 'file'}${index}`, file));
    return this.http.post<T>(`${this.apiUrl(entity)}/with-images`, formData);
  }

  // PUT: Aggiornamento elemento (anche con immagini opzionali)
  update<T>(entity: string, id: number | string, data: T, files?: File[], fileFieldPrefix?: string): Observable<T> {
    if (!files || files.length === 0) {
      return this.http.put<T>(`${this.apiUrl(entity)}/${id}`, data);
    }

    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    files.forEach((file, index) => formData.append(`${fileFieldPrefix || 'file'}${index}`, file));
    return this.http.put<T>(`${this.apiUrl(entity)}/${id}/with-images`, formData);
  }

  // DELETE: Eliminazione elemento
  delete(entity: string, id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl(entity)}/${id}`);
  }

  // POST: Upload file (documenti, immagini, ecc.)
  uploadFile(entity: string, id: number | string, path: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ imageUrl: string }>(`${this.apiUrl(entity)}/${id}/${path}`, formData);
  }

  // DELETE: Eliminazione immagine/documento
  deleteFile(entity: string, id: number | string, path: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl(entity)}/${id}/${path}`);
  }

  // Metodi specifici per UtilityService (Aggregazioni)
  getUtilitySummaryByApartment(apartmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/summary/${apartmentId}`);
  }

  getYearlyUtilityStatistics(year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/statistics/${year}`);
  }

  getApartmentConsumption(apartmentId: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/apartment/${apartmentId}/consumption/${year}`);
  }

  // Metodi specifici per LeaseService
  addLeaseDocument(leaseId: number, document: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl('leases')}/${leaseId}/documents`, document);
  }

  recordLeasePayment(leaseId: number, paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl('leases')}/${leaseId}/payments`, paymentData);
  }

  getExpiringSoonLeases(): Observable<any> {
    return this.getAll<any>('leases', { isActive: true }).pipe(
      map(leases => {
        const today = new Date();
        const soon = new Date(today.setDate(today.getDate() + 30));
        return leases.filter(lease => new Date(lease.endDate) <= soon);
      })
    );
  }

  // Metodo generico avanzato per chiamate GET personalizzate
  customGet<T>(path: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<T>(`${environment.apiUrl}/${path}`, { params: httpParams });
  }
}
