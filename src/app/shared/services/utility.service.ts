import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UtilityReading, UtilitySummary } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {
  private apiUrl = `${environment.apiUrl}/utilities`;

  constructor(private http: HttpClient) { }

  // Operazioni CRUD per le letture delle utenze
  getAllReadings(): Observable<UtilityReading[]> {
    return this.http.get<UtilityReading[]>(this.apiUrl);
  }

  getReadingById(id: number): Observable<UtilityReading> {
    return this.http.get<UtilityReading>(`${this.apiUrl}/${id}`);
  }

  createReading(reading: Omit<UtilityReading, 'id' | 'consumption' | 'totalCost' | 'createdAt' | 'updatedAt'>): Observable<UtilityReading> {
    return this.http.post<UtilityReading>(this.apiUrl, reading);
  }

  updateReading(id: number, reading: Partial<UtilityReading>): Observable<UtilityReading> {
    return this.http.put<UtilityReading>(`${this.apiUrl}/${id}`, reading);
  }

  deleteReading(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Metodi specifici per le utenze
  getReadingsByApartment(apartmentId: number): Observable<UtilityReading[]> {
    return this.http.get<UtilityReading[]>(`${this.apiUrl}/by-apartment/${apartmentId}`);
  }

  getReadingsByType(apartmentId: number, type: 'electricity' | 'water' | 'gas'): Observable<UtilityReading[]> {
    return this.http.get<UtilityReading[]>(`${this.apiUrl}/by-apartment/${apartmentId}/by-type/${type}`);
  }

  getLatestReadings(apartmentId: number): Observable<{
    electricity: UtilityReading | null;
    water: UtilityReading | null;
    gas: UtilityReading | null;
  }> {
    return this.http.get<{
      electricity: UtilityReading | null;
      water: UtilityReading | null;
      gas: UtilityReading | null;
    }>(`${this.apiUrl}/by-apartment/${apartmentId}/latest`);
  }

  getUtilitySummary(apartmentId: number, month: number, year: number): Observable<UtilitySummary> {
    return this.http.get<UtilitySummary>(`${this.apiUrl}/summary`, {
      params: {
        apartmentId: apartmentId.toString(),
        month: month.toString(),
        year: year.toString()
      }
    });
  }

  getUtilityHistory(apartmentId: number, type: 'electricity' | 'water' | 'gas', months: number = 12): Observable<UtilityReading[]> {
    return this.http.get<UtilityReading[]>(`${this.apiUrl}/history`, {
      params: {
        apartmentId: apartmentId.toString(),
        type,
        months: months.toString()
      }
    });
  }

  markReadingAsPaid(readingId: number, paidDate: Date): Observable<UtilityReading> {
    return this.http.patch<UtilityReading>(`${this.apiUrl}/${readingId}/mark-paid`, { paidDate });
  }

  // Metodo per calcolare automaticamente il consumo e il costo totale
  calculateConsumptionAndCost(
    currentReading: number,
    previousReading: number,
    unitCost: number
  ): { consumption: number; totalCost: number } {
    const consumption = currentReading - previousReading;
    const totalCost = consumption * unitCost;
    return { consumption, totalCost };
  }
}
