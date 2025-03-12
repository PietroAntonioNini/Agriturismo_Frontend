import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Apartment, MaintenanceRecord } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApartmentService {
  private apiUrl = `${environment.apiUrl}/apartments`;
  
  // Mock data per lo sviluppo, solo se necessario
  private mockApartments: Apartment[] = [
    {
      id: '1',
      name: 'Appartamento Centro',
      description: 'Bellissimo appartamento in centro',
      floor: 2,
      squareMeters: 80,
      rooms: 3,
      bathrooms: 1,
      hasBalcony: true,
      hasParking: false,
      isFurnished: true,
      monthlyRent: 800,
      status: 'available',
      isAvailable: true,
      maintenanceHistory: [],
      amenities: ['Wi-Fi', 'Aria condizionata', 'Lavatrice'],
      notes: 'Appartamento in ottime condizioni',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    // Aggiungi altri appartamenti mock se necessario
  ];

  constructor(private http: HttpClient) { }

  // --- METODI CRUD PRINCIPALI ---

  getApartments(): Observable<Apartment[]> {
    // Per test locali, usa: return of(this.mockApartments).pipe(delay(300));
    return this.http.get<Apartment[]>(this.apiUrl);
  }

  getApartment(id: string): Observable<Apartment> {
    // Per test locali, usa: return of(this.mockApartments.find(a => a.id === id)!).pipe(delay(300));
    return this.http.get<Apartment>(`${this.apiUrl}/${id}`);
  }

  createApartment(apartment: Apartment): Observable<Apartment> {
    return this.http.post<Apartment>(this.apiUrl, apartment);
  }

  updateApartment(id: string, apartment: Apartment): Observable<Apartment> {
    return this.http.put<Apartment>(`${this.apiUrl}/${id}`, apartment);
  }

  deleteApartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // --- METODI MANUTENZIONE ---

  getMaintenanceHistory(apartmentId: string): Observable<MaintenanceRecord[]> {
    // Coerenza tipo ID (string)
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    return of(apartment?.maintenanceHistory || []).pipe(delay(300));
  }

  addMaintenanceRecord(apartmentId: string, record: Omit<MaintenanceRecord, 'id' | 'apartmentId'>): Observable<MaintenanceRecord> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      const newRecord: MaintenanceRecord = {
        ...record as any,
        id: apartment.maintenanceHistory.length > 0 
            ? Math.max(...apartment.maintenanceHistory.map(r => r.id)) + 1
            : 1,
        apartmentId: parseInt(apartmentId) // Convert to number as MaintenanceRecord expects number
      };
      apartment.maintenanceHistory.push(newRecord);
      return of(newRecord).pipe(delay(300));
    }
    return of({} as MaintenanceRecord);
  }

  updateMaintenanceRecord(apartmentId: string, recordId: number, record: Partial<MaintenanceRecord>): Observable<MaintenanceRecord> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      const recordIndex = apartment.maintenanceHistory.findIndex(r => r.id === recordId);
      if (recordIndex !== -1) {
        apartment.maintenanceHistory[recordIndex] = {
          ...apartment.maintenanceHistory[recordIndex],
          ...record
        };
        return of(apartment.maintenanceHistory[recordIndex]).pipe(delay(300));
      }
    }
    return of({} as MaintenanceRecord);
  }

  deleteMaintenanceRecord(apartmentId: string, recordId: number): Observable<void> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      apartment.maintenanceHistory = apartment.maintenanceHistory.filter(r => r.id !== recordId);
    }
    return of(void 0).pipe(delay(300));
  }

  // --- ALTRI METODI ---

  getAvailableApartments(): Observable<Apartment[]> {
    return this.http.get<Apartment[]>(`${this.apiUrl}/available`);
  }

  updateApartmentStatus(id: string, status: 'available' | 'occupied' | 'maintenance'): Observable<Apartment> {
    return this.http.patch<Apartment>(`${this.apiUrl}/${id}/status`, { status });
  }

  uploadApartmentImage(id: string, image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post(`${this.apiUrl}/${id}/images`, formData);
  }
}