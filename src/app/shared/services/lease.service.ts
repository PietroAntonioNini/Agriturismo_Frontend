import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Lease } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  private apiUrl = `${environment.apiUrl}/leases`;
  
  private mockLeases: Lease[] = [
    {
      id: 1,
      tenantId: 1,
      apartmentId: 1,
      startDate: new Date('2022-06-01'),
      endDate: new Date('2023-12-31'),
      monthlyRent: 750,
      securityDeposit: 1500,
      depositPaid: true,
      depositPaymentDate: new Date('2022-05-15'),
      isActive: true,
      renewalOption: true,
      termsAndConditions: 'Condizioni standard di locazione',
      specialClauses: 'Animali domestici permessi con deposito aggiuntivo',
      paymentFrequency: 'monthly',
      paymentDueDay: 5,
      lateFee: 50,
      terminationNotice: 60,
      signingDate: new Date('2022-05-10'),
      contractFile: 'lease_1_contract.pdf',
      createdAt: new Date('2022-05-10'),
      updatedAt: new Date('2022-05-15')
    },
    {
      id: 2,
      tenantId: 2,
      apartmentId: 3,
      startDate: new Date('2021-10-01'),
      endDate: new Date('2023-09-30'),
      monthlyRent: 600,
      securityDeposit: 1200,
      depositPaid: true,
      depositPaymentDate: new Date('2021-09-20'),
      isActive: true,
      renewalOption: false,
      termsAndConditions: 'Condizioni standard di locazione',
      paymentFrequency: 'monthly',
      paymentDueDay: 1,
      lateFee: 40,
      terminationNotice: 90,
      signingDate: new Date('2021-09-15'),
      contractFile: 'lease_2_contract.pdf',
      createdAt: new Date('2021-09-15'),
      updatedAt: new Date('2021-09-20')
    },
    {
      id: 3,
      tenantId: 3,
      apartmentId: 2,
      startDate: new Date('2023-01-15'),
      endDate: new Date('2023-07-15'),
      monthlyRent: 900,
      securityDeposit: 1800,
      depositPaid: true,
      depositPaymentDate: new Date('2023-01-10'),
      isActive: true,
      renewalOption: true,
      termsAndConditions: 'Condizioni standard di locazione',
      specialClauses: 'Possibilità di rinnovo con preavviso di 30 giorni',
      paymentFrequency: 'monthly',
      paymentDueDay: 15,
      lateFee: 60,
      terminationNotice: 30,
      signingDate: new Date('2023-01-05'),
      contractFile: 'lease_3_contract.pdf',
      createdAt: new Date('2023-01-05'),
      updatedAt: new Date('2023-01-10')
    }
  ];

  constructor(private http: HttpClient) { }

  getAllLeases(): Observable<Lease[]> {
    return of(this.mockLeases).pipe(delay(500));
  }

  getLeaseById(id: number): Observable<Lease> {
    const lease = this.mockLeases.find(l => l.id === id);
    return of(lease as Lease).pipe(delay(300));
  }

  createLease(lease: Omit<Lease, 'id' | 'createdAt' | 'updatedAt'>): Observable<Lease> {
    const newLease: Lease = {
      ...lease as any,
      id: Math.max(...this.mockLeases.map(l => l.id)) + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockLeases.push(newLease);
    return of(newLease).pipe(delay(300));
  }

  updateLease(id: number, lease: Partial<Lease>): Observable<Lease> {
    const index = this.mockLeases.findIndex(l => l.id === id);
    if (index !== -1) {
      this.mockLeases[index] = {
        ...this.mockLeases[index],
        ...lease,
        updatedAt: new Date()
      };
      return of(this.mockLeases[index]).pipe(delay(300));
    }
    return of({} as Lease);
  }

  deleteLease(id: number): Observable<void> {
    const index = this.mockLeases.findIndex(l => l.id === id);
    if (index !== -1) {
      this.mockLeases.splice(index, 1);
    }
    return of(void 0).pipe(delay(300));
  }

  // Metodi aggiuntivi specifici per i contratti
  getActiveLeases(): Observable<Lease[]> {
    const today = new Date();
    return of(this.mockLeases.filter(lease => 
      lease.isActive && 
      new Date(lease.endDate) >= today
    )).pipe(delay(300));
  }

  getExpiringSoonLeases(daysThreshold: number = 30): Observable<Lease[]> {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);
    
    return of(this.mockLeases.filter(lease => 
      lease.isActive && 
      new Date(lease.endDate) >= today && 
      new Date(lease.endDate) <= thresholdDate
    )).pipe(delay(300));
  }

  getLeasesByTenant(tenantId: number): Observable<Lease[]> {
    return of(this.mockLeases.filter(l => l.tenantId === tenantId)).pipe(delay(300));
  }

  getLeasesByApartment(apartmentId: number): Observable<Lease[]> {
    return of(this.mockLeases.filter(l => l.apartmentId === apartmentId)).pipe(delay(300));
  }

  renewLease(leaseId: number, endDate: Date, newRent?: number): Observable<Lease> {
    const lease = this.mockLeases.find(l => l.id === leaseId);
    if (lease) {
      lease.endDate = endDate;
      if (newRent) {
        lease.monthlyRent = newRent;
      }
      lease.updatedAt = new Date();
      return of(lease).pipe(delay(300));
    }
    return of({} as Lease);
  }

  terminateLease(leaseId: number, terminationDate: Date, reason: string): Observable<Lease> {
    const lease = this.mockLeases.find(l => l.id === leaseId);
    if (lease) {
      lease.isActive = false;
      lease.endDate = terminationDate;
      lease.specialClauses = lease.specialClauses 
        ? `${lease.specialClauses}\nTerminato in data ${terminationDate.toLocaleDateString()} per: ${reason}`
        : `Terminato in data ${terminationDate.toLocaleDateString()} per: ${reason}`;
      lease.updatedAt = new Date();
      return of(lease).pipe(delay(300));
    }
    return of({} as Lease);
  }

  uploadContractFile(leaseId: number, file: File): Observable<Lease> {
    const lease = this.mockLeases.find(l => l.id === leaseId);
    if (lease) {
      lease.contractFile = `lease_${leaseId}_contract_${file.name}`;
      lease.updatedAt = new Date();
      return of(lease).pipe(delay(500));
    }
    return of({} as Lease);
  }

  downloadContractFile(leaseId: number): Observable<Blob> {
    // Simula un file PDF vuoto
    const emptyPdf = new Blob(['%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< >>\nendobj\n5 0 obj\n<< /Length 16 >>\nstream\n0.5 0 0 RG\n1 1 594 840 re\nS\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000218 00000 n\n0000000239 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n304\n%%EOF'], { type: 'application/pdf' });
    return of(emptyPdf).pipe(delay(500));
  }

  markDepositPaid(leaseId: number, paymentDate: Date): Observable<Lease> {
    const lease = this.mockLeases.find(l => l.id === leaseId);
    if (lease) {
      lease.depositPaid = true;
      lease.depositPaymentDate = paymentDate;
      lease.updatedAt = new Date();
      return of(lease).pipe(delay(300));
    }
    return of({} as Lease);
  }
}
