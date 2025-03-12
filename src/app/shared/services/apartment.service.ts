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
  
  private mockApartments: Apartment[] = [
    {
      id: 1,
      name: 'Bilocale Vista Mare',
      number: 'A101',
      size: 65,
      monthlyRent: 750,
      features: ['Vista mare', 'Aria condizionata', 'Wi-Fi'],
      address: 'Via del Mare 10, 57022 Marina di Castagneto Carducci',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      hasBalcony: true,
      hasParking: true,
      furnishingStatus: 'furnished',
      description: 'Bellissimo bilocale con vista mare, completamente arredato',
      utilityMeters: {
        electricity: 'EM123456',
        water: 'WM789012',
        gas: 'GM345678'
      },
      maintenanceHistory: [
        {
          id: 1,
          apartmentId: 1,
          type: 'cleaning',
          description: 'Pulizia generale',
          cost: 100,
          date: new Date('2023-04-15'),
          completedBy: 'Cleaning Service SRL'
        }
      ],
      isAvailable: false,
      createdAt: new Date('2020-01-10'),
      updatedAt: new Date('2023-03-15')
    },
    {
      id: 2,
      name: 'Trilocale con Giardino',
      number: 'B202',
      size: 85,
      monthlyRent: 900,
      features: ['Giardino privato', 'Posto auto', 'Cucina moderna'],
      address: 'Via degli Ulivi 5, 57022 Marina di Castagneto Carducci',
      floor: 0,
      bedrooms: 2,
      bathrooms: 1,
      hasBalcony: false,
      hasParking: true,
      furnishingStatus: 'semi-furnished',
      description: 'Spazioso trilocale con giardino privato',
      utilityMeters: {
        electricity: 'EM654321',
        water: 'WM098765',
        gas: 'GM543210'
      },
      maintenanceHistory: [],
      isAvailable: true,
      createdAt: new Date('2021-03-20'),
      updatedAt: new Date('2023-05-10')
    },
    {
      id: 3,
      name: 'Monolocale Centro',
      number: 'C303',
      size: 45,
      monthlyRent: 600,
      features: ['Posizione centrale', 'Terrazza comune'],
      address: 'Piazza della Torre 3, 57022 Castagneto Carducci',
      floor: 3,
      bedrooms: 0,
      bathrooms: 1,
      hasBalcony: false,
      hasParking: false,
      furnishingStatus: 'furnished',
      description: 'Accogliente monolocale nel centro storico',
      utilityMeters: {
        electricity: 'EM111222',
        water: 'WM333444',
        gas: 'GM555666'
      },
      maintenanceHistory: [
        {
          id: 2,
          apartmentId: 3,
          type: 'repair',
          description: 'Riparazione perdita bagno',
          cost: 150,
          date: new Date('2023-02-10'),
          completedBy: 'Idraulico Express'
        }
      ],
      isAvailable: false,
      createdAt: new Date('2019-06-15'),
      updatedAt: new Date('2022-12-01')
    }
  ];

  constructor(private http: HttpClient) { }

  getAllApartments(): Observable<Apartment[]> {
    return of(this.mockApartments).pipe(delay(500));
  }

  getApartmentById(id: number): Observable<Apartment> {
    const apartment = this.mockApartments.find(a => a.id === id);
    return of(apartment as Apartment).pipe(delay(300));
  }

  createApartment(apartment: Omit<Apartment, 'id' | 'createdAt' | 'updatedAt' | 'maintenanceHistory'>): Observable<Apartment> {
    const newApartment: Apartment = {
      ...apartment as any,
      id: Math.max(...this.mockApartments.map(a => a.id)) + 1,
      maintenanceHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockApartments.push(newApartment);
    return of(newApartment).pipe(delay(300));
  }

  updateApartment(id: number, apartment: Partial<Apartment>): Observable<Apartment> {
    const index = this.mockApartments.findIndex(a => a.id === id);
    if (index !== -1) {
      this.mockApartments[index] = {
        ...this.mockApartments[index],
        ...apartment,
        updatedAt: new Date()
      };
      return of(this.mockApartments[index]).pipe(delay(300));
    }
    return of({} as Apartment);
  }

  deleteApartment(id: number): Observable<void> {
    const index = this.mockApartments.findIndex(a => a.id === id);
    if (index !== -1) {
      this.mockApartments.splice(index, 1);
    }
    return of(void 0).pipe(delay(300));
  }

  // Metodi per la gestione della manutenzione
  getMaintenanceHistory(apartmentId: number): Observable<MaintenanceRecord[]> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    return of(apartment?.maintenanceHistory || []).pipe(delay(300));
  }

  addMaintenanceRecord(apartmentId: number, record: Omit<MaintenanceRecord, 'id' | 'apartmentId'>): Observable<MaintenanceRecord> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      const newRecord: MaintenanceRecord = {
        ...record as any,
        id: apartment.maintenanceHistory.length > 0 
            ? Math.max(...apartment.maintenanceHistory.map(r => r.id)) + 1
            : 1,
        apartmentId
      };
      apartment.maintenanceHistory.push(newRecord);
      return of(newRecord).pipe(delay(300));
    }
    return of({} as MaintenanceRecord);
  }

  updateMaintenanceRecord(apartmentId: number, recordId: number, record: Partial<MaintenanceRecord>): Observable<MaintenanceRecord> {
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

  deleteMaintenanceRecord(apartmentId: number, recordId: number): Observable<void> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      apartment.maintenanceHistory = apartment.maintenanceHistory.filter(r => r.id !== recordId);
    }
    return of(void 0).pipe(delay(300));
  }

  // Metodi aggiuntivi specifici per gli appartamenti
  getAvailableApartments(): Observable<Apartment[]> {
    return of(this.mockApartments.filter(a => a.isAvailable)).pipe(delay(300));
  }

  getCurrentTenant(apartmentId: number): Observable<any> {
    // Dati di esempio per l'inquilino attuale
    return of({
      id: 1,
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@example.com',
      leaseStartDate: new Date('2022-06-01'),
      leaseEndDate: new Date('2023-12-31')
    }).pipe(delay(300));
  }

  getLeaseHistory(apartmentId: number): Observable<any[]> {
    // Dati di esempio per la storia delle locazioni
    return of([
      {
        id: 1,
        tenantId: 1,
        tenantName: 'Mario Rossi',
        startDate: new Date('2022-06-01'),
        endDate: new Date('2023-12-31'),
        monthlyRent: 750
      },
      {
        id: 2,
        tenantId: 3,
        tenantName: 'Luigi Bianchi',
        startDate: new Date('2020-02-15'),
        endDate: new Date('2022-05-31'),
        monthlyRent: 700
      }
    ]).pipe(delay(300));
  }

  updateUtilityMeters(
    apartmentId: number, 
    meters: { electricity: string; water: string; gas: string }
  ): Observable<Apartment> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      apartment.utilityMeters = meters;
      apartment.updatedAt = new Date();
      return of(apartment).pipe(delay(300));
    }
    return of({} as Apartment);
  }

  toggleAvailability(apartmentId: number, isAvailable: boolean): Observable<Apartment> {
    const apartment = this.mockApartments.find(a => a.id === apartmentId);
    if (apartment) {
      apartment.isAvailable = isAvailable;
      apartment.updatedAt = new Date();
      return of(apartment).pipe(delay(300));
    }
    return of({} as Apartment);
  }
}
