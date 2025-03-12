import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tenant } from '../models';
import { Lease } from '../models/lease.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) { }

  // Get all tenants
  getTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(this.apiUrl);
  }

  // Get tenant by ID
  getTenantById(id: number): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/${id}`);
  }

  // Create new tenant
  createTenant(tenant: Tenant, frontImage?: File, backImage?: File): Observable<Tenant> {
    if (!frontImage && !backImage) {
      // If no images, use the original JSON approach
      return this.http.post<Tenant>(this.apiUrl, tenant);
    }
    
    // If we have images, use FormData
    const formData = new FormData();
    formData.append('tenant', JSON.stringify(tenant));
    
    if (frontImage) {
      formData.append('frontImage', frontImage);
    }
    
    if (backImage) {
      formData.append('backImage', backImage);
    }
    
    return this.http.post<Tenant>(`${this.apiUrl}/with-images`, formData);
  }

  // Update existing tenant
  updateTenant(id: number, tenant: Tenant, frontImage?: File, backImage?: File): Observable<Tenant> {
    if (!frontImage && !backImage) {
      // If no images, use the original JSON approach
      return this.http.put<Tenant>(`${this.apiUrl}/${id}`, tenant);
    }
    
    // If we have images, use FormData
    const formData = new FormData();
    formData.append('tenant', JSON.stringify(tenant));
    
    if (frontImage) {
      formData.append('frontImage', frontImage);
    }
    
    if (backImage) {
      formData.append('backImage', backImage);
    }
    
    return this.http.put<Tenant>(`${this.apiUrl}/${id}/with-images`, formData);
  }

  // Delete tenant
  deleteTenant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Upload document image
  uploadDocumentImage(tenantId: number, side: 'front' | 'back', file: File): Observable<{imageUrl: string}> {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.http.post<{imageUrl: string}>(
      `${this.apiUrl}/${tenantId}/documents/${side}`, 
      formData
    );
  }

  // Add this method if it should exist
  getActiveLeases(tenantId: number): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.apiUrl}/${tenantId}/leases/active`);
  }
}
