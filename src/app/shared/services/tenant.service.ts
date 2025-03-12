import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Tenant } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/tenants`;
  private mockTenants: Tenant[] = [
    {
      id: 1,
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@example.com',
      phone: '123456789',
      documentType: 'Carta d\'identità',
      documentNumber: 'AB123456',
      documentExpiryDate: new Date('2025-12-31'),
      address: 'Via Roma 123, 00100 Roma',
      communicationPreferences: {
        email: true,
        sms: true,
        whatsapp: false
      },
      notes: 'Inquilino dal 2020',
      createdAt: new Date('2020-01-15'),
      updatedAt: new Date('2023-06-10')
    },
    {
      id: 2,
      firstName: 'Anna',
      lastName: 'Bianchi',
      email: 'anna.bianchi@example.com',
      phone: '987654321',
      documentType: 'Passaporto',
      documentNumber: 'YZ987654',
      documentExpiryDate: new Date('2027-05-20'),
      address: 'Via Napoli 45, 00100 Roma',
      communicationPreferences: {
        email: true,
        sms: false,
        whatsapp: true
      },
      notes: 'Inquilino dal 2022',
      createdAt: new Date('2022-03-15'),
      updatedAt: new Date('2023-04-22')
    },
    {
      id: 3,
      firstName: 'Franco',
      lastName: 'Verdi',
      email: 'franco.verdi@example.com',
      phone: '567891234',
      documentType: 'Carta d\'identità',
      documentNumber: 'CD789012',
      documentExpiryDate: new Date('2026-08-15'),
      communicationPreferences: {
        email: true,
        sms: true,
        whatsapp: true
      },
      createdAt: new Date('2021-05-10'),
      updatedAt: new Date('2023-01-05')
    }
  ];

  constructor(private http: HttpClient) { }

  getAllTenants(): Observable<Tenant[]> {
    return of(this.mockTenants).pipe(delay(500));
  }

  getTenantById(id: number): Observable<Tenant> {
    const tenant = this.mockTenants.find(t => t.id === id);
    return of(tenant as Tenant).pipe(delay(300));
  }

  createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tenant> {
    const newTenant: Tenant = {
      ...tenant as any,
      id: Math.max(...this.mockTenants.map(t => t.id)) + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockTenants.push(newTenant);
    return of(newTenant).pipe(delay(300));
  }

  updateTenant(id: number, tenant: Partial<Tenant>): Observable<Tenant> {
    const index = this.mockTenants.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTenants[index] = {
        ...this.mockTenants[index],
        ...tenant,
        id: id, // Assicuriamoci che l'ID non venga modificato
        updatedAt: new Date()
      };
      return of(this.mockTenants[index]).pipe(delay(300));
    }
    return of({} as Tenant).pipe(delay(300));
  }

  deleteTenant(id: number): Observable<void> {
    const index = this.mockTenants.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTenants.splice(index, 1);
    }
    return of(void 0).pipe(delay(300));
  }

  // Metodi aggiuntivi specifici per gli inquilini
  searchTenants(query: string): Observable<Tenant[]> {
    const lowercaseQuery = query.toLowerCase();
    const results = this.mockTenants.filter(tenant => 
      tenant.firstName.toLowerCase().includes(lowercaseQuery) || 
      tenant.lastName.toLowerCase().includes(lowercaseQuery) ||
      tenant.email.toLowerCase().includes(lowercaseQuery)
    );
    return of(results).pipe(delay(300));
  }

  getTenantsByApartment(apartmentId: number): Observable<Tenant[]> {
    // In una app reale, qui avremmo la logica per filtrare per appartamento
    return of(this.mockTenants.slice(0, 2)).pipe(delay(300));
  }

  getActiveLeases(tenantId: number): Observable<any[]> {
    // Dati di esempio per i contratti attivi
    return of([
      {
        id: 1,
        apartmentId: 1,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2023-12-31'),
        monthlyRent: 800
      }
    ]).pipe(delay(300));
  }

  getPaymentHistory(tenantId: number): Observable<any[]> {
    // Dati di esempio per la storia dei pagamenti
    return of([
      {
        id: 1,
        date: new Date('2023-01-10'),
        amount: 800,
        method: 'Bonifico'
      },
      {
        id: 2,
        date: new Date('2023-02-08'),
        amount: 800,
        method: 'Bonifico'
      }
    ]).pipe(delay(300));
  }

  updateCommunicationPreferences(
    tenantId: number, 
    preferences: { email: boolean; sms: boolean; whatsapp: boolean }
  ): Observable<Tenant> {
    const index = this.mockTenants.findIndex(t => t.id === tenantId);
    if (index !== -1) {
      this.mockTenants[index] = {
        ...this.mockTenants[index],
        communicationPreferences: preferences,
        updatedAt: new Date()
      };
      return of(this.mockTenants[index]).pipe(delay(300));
    }
    return of({} as Tenant);
  }
}
