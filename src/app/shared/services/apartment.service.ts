import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Apartment } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApartmentService {
  private apiUrl = `${environment.apiUrl}/apartments`;

  constructor(private http: HttpClient) { }

  // Get all apartments
  getApartments(): Observable<Apartment[]> {
    return this.http.get<Apartment[]>(this.apiUrl);
  }

  // Get apartment by ID
  getApartment(id: number): Observable<Apartment> {
    return this.http.get<Apartment>(`${this.apiUrl}/${id}`);
  }

  // Create new apartment
  createApartment(apartment: Apartment, images?: File[]): Observable<Apartment> {
    if (!images || images.length === 0) {
      // If no images, use the original JSON approach
      return this.http.post<Apartment>(this.apiUrl, apartment);
    }
    
    // If we have images, use FormData
    const formData = new FormData();
    formData.append('apartment', JSON.stringify(apartment));
    
    // Add all images to formData
    images.forEach((image, index) => {
      if (image) {
        formData.append(`image${index}`, image);
      }
    });
    
    return this.http.post<Apartment>(`${this.apiUrl}/with-images`, formData);
  }

  // Update existing apartment
  updateApartment(id: string | number, apartment: Apartment, images?: File[]): Observable<Apartment> {
    if (!images || images.length === 0) {
      // If no images, use the original JSON approach
      return this.http.put<Apartment>(`${this.apiUrl}/${id}`, apartment);
    }
    
    // If we have images, use FormData
    const formData = new FormData();
    formData.append('apartment', JSON.stringify(apartment));
    
    // Add all images to formData
    images.forEach((image, index) => {
      if (image) {
        formData.append(`image${index}`, image);
      }
    });
    
    return this.http.put<Apartment>(`${this.apiUrl}/${id}/with-images`, formData);
  }

  // Delete apartment
  deleteApartment(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Upload apartment image
  uploadApartmentImage(apartmentId: number, file: File, index: number): Observable<{imageUrl: string}> {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.http.post<{imageUrl: string}>(
      `${this.apiUrl}/${apartmentId}/images/${index}`, 
      formData
    );
  }

  // Delete apartment image
  deleteApartmentImage(apartmentId: number, imageIndex: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${apartmentId}/images/${imageIndex}`);
  }
}