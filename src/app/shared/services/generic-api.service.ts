import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UtilityReading, MonthlyUtilityData, ApartmentUtilityData } from '../models';

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
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<T[]>(this.apiUrl(entity), { params: httpParams });
  }

  // GET: Elemento singolo per ID
  getById<T>(entity: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl(entity)}/${id}`);
  }

  // POST: Creazione elemento (anche con immagini opzionali)
  create<T>(entity: string, data: Partial<T>, files?: File[], fileFieldPrefix?: string): Observable<T> {
    if (!files || files.length === 0) {
      return this.http.post<T>(this.apiUrl(entity), data);
    }

    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    files.forEach((file, index) => formData.append(`${fileFieldPrefix || 'file'}${index}`, file));
    return this.http.post<T>(`${this.apiUrl(entity)}/with-images`, formData);
  }

  // PUT: Aggiornamento elemento (anche con immagini opzionali)
  update<T>(entity: string, id: number | string, data: Partial<T>, files?: File[]): Observable<T> {
    // Per i tenant, usa SEMPRE l'endpoint with-images
    if (entity === 'tenants') {
        const formData = new FormData();
        formData.append('tenant', JSON.stringify(data));
        
        if (files && files.length > 0) {
            files.forEach((file, index) => {
                const fieldName = index === 0 ? 'documentFrontImage' : 'documentBackImage';
                formData.append(fieldName, file);
            });
        }
        
        return this.http.put<T>(`${this.apiUrl(entity)}/${id}/with-images`, formData);
    }
    
    // Per altre entità, comportamento normale
    if (!files || files.length === 0) {
        return this.http.put<T>(`${this.apiUrl(entity)}/${id}`, data);
    }
    
    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    files.forEach((file, index) => formData.append(`file${index}`, file));
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

  // PATCH: Aggiornamento parziale di un elemento
  patch<T>(entity: string, id: number | string, data: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl(entity)}/${id}`, data);
  }

  // GET: Elementi per chiave-valore
  getByField<T>(entity: string, field: string, value: any): Observable<T[]> {
    const params = new HttpParams().set(field, value);
    return this.http.get<T[]>(this.apiUrl(entity), { params });
  }

  // Metodi per la gestione dei record legati a un'entità principale
  getRelatedRecords<T>(mainEntity: string, mainId: number | string, relatedEntity: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiUrl(mainEntity)}/${mainId}/${relatedEntity}`);
  }

  addRelatedRecord<T>(mainEntity: string, mainId: number | string, relatedEntity: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl(mainEntity)}/${mainId}/${relatedEntity}`, data);
  }

  updateRelatedRecord<T>(mainEntity: string, mainId: number | string, relatedEntity: string, relatedId: number | string, data: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl(mainEntity)}/${mainId}/${relatedEntity}/${relatedId}`, data);
  }

  deleteRelatedRecord(mainEntity: string, mainId: number | string, relatedEntity: string, relatedId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl(mainEntity)}/${mainId}/${relatedEntity}/${relatedId}`);
  }

  // Metodi specifici migrati da ApartmentService
  updateStatus<T>(entity: string, id: number | string, status: string): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl(entity)}/${id}/status`, { status });
  }

  getAvailableEntities<T>(entity: string): Observable<T[]> {
    return this.getAll<T>(entity, { isAvailable: true });
  }

  getActiveEntities<T>(entity: string): Observable<T[]> {
    return this.getAll<T>(entity, { isActive: true });
  }
  
  getExpiringSoonEntities<T>(entity: string, daysThreshold: number = 30): Observable<T[]> {
    return this.getAll<T>(entity, { 
      isActive: true,
      expiringWithin: daysThreshold
    });
  }

  // Metodi specifici migrati da LeaseService
  addDocument(entity: string, id: number | string, document: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl(entity)}/${id}/documents`, document);
  }

  recordPayment(entity: string, id: number | string, paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl(entity)}/${id}/payments`, paymentData);
  }

  // Metodi specifici migrati da UtilityService
  getUtilitySummaryByApartment(apartmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/summary/${apartmentId}`);
  }

  getYearlyUtilityStatistics(year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/statistics/${year}`);
  }

  getApartmentConsumption(apartmentId: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl('utilities')}/apartment/${apartmentId}/consumption/${year}`);
  }

  // Cerca inquilini in base a una query di ricerca
  searchTenants<T>(query: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiUrl('tenants')}/search`, {
      params: new HttpParams().set('q', query)
    });
  }

  // Ottiene gli inquilini associati a un appartamento
  getTenantsByApartment<T>(apartmentId: number): Observable<T[]> {
    return this.getRelatedRecords<T>('apartments', apartmentId, 'tenants');
  }

  // Ottiene i contratti attivi di un inquilino
  getActiveLeasesByTenant<T>(tenantId: number): Observable<T[]> {
    return this.getRelatedRecords<T>('tenants', tenantId, 'active-leases');
  }

  // Ottiene lo storico dei pagamenti di un inquilino
  getPaymentHistoryByTenant<T>(tenantId: number): Observable<T[]> {
    return this.getRelatedRecords<T>('tenants', tenantId, 'payment-history');
  }

  // Aggiorna le preferenze di comunicazione di un inquilino
  updateCommunicationPreferences<T>(
    tenantId: number, 
    preferences: { email: boolean; sms: boolean; whatsapp: boolean }
  ): Observable<T> {
    return this.http.patch<T>(
      `${this.apiUrl('tenants')}/${tenantId}/communication-preferences`, 
      preferences
    );
  }

  // Metodo di ricerca generico che può essere usato per qualsiasi entità
  search<T>(entity: string, query: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiUrl(entity)}/search`, {
      params: new HttpParams().set('q', query)
    });
  }

  // === METODI AGGIUNTIVI MIGRATI DA UTILITYSERVICE ===

  // Ottiene tutte le letture delle utilities
  getAllReadings<T>(params?: { [key: string]: any }): Observable<T[]> {
    return this.getAll<T>('utilities', params).pipe(
      catchError(error => {
        console.error('Errore durante il recupero delle letture', error);
        return of([]);
      })
    );
  }

  // Crea una nuova lettura utility
  createReading<T>(reading: Partial<T>): Observable<T | null> {
    return this.create<T>('utilities', reading).pipe(
      catchError(error => {
        console.error('Errore durante la creazione della lettura', error);
        return of(null);
      })
    );
  }

  // Aggiorna una lettura utility
  updateReading<T>(id: number, reading: Partial<T>): Observable<T | null> {
    return this.update<T>('utilities', id, reading).pipe(
      catchError(error => {
        console.error(`Errore durante l'aggiornamento della lettura con ID ${id}`, error);
        return of(null);
      })
    );
  }

  // Elimina una lettura utility
  deleteReading(id: number): Observable<boolean> {
    return this.delete('utilities', id).pipe(
      map(() => true),
      catchError(error => {
        console.error(`Errore durante l'eliminazione della lettura con ID ${id}`, error);
        return of(false);
      })
    );
  }

  // Ottiene i dati delle utility per un anno specifico
  getUtilityDataByYear<T>(year: number): Observable<T[]> {
    return this.getAll<T>('utilities', { year: year.toString() }).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero dei dati per l'anno ${year}`, error);
        return of([]);
      })
    );
  }

  // Ottiene l'ultima lettura per un appartamento e un tipo di utility
  getLastReading<T>(apartmentId: number, type: string): Observable<T | null> {
    const params = {
      apartmentId: apartmentId.toString(),
      type: type,
      _sort: 'readingDate',
      _order: 'desc',
      _limit: '1'
    };
      
    return this.getAll<T>('utilities', params).pipe(
      map((readings: T[]) => readings.length > 0 ? readings[0] : null),
      catchError(error => {
        console.error(`Errore durante il recupero dell'ultima lettura per l'appartamento ${apartmentId}`, error);
        return of(null);
      })
    );
  }

  // Calcola il costo totale di una lettura
  calculateUtilityTotalCost(reading: any): number {
    let totalCost = 0;
    
    // Calcola il costo per ogni tipo di utenza
    if (reading.electricityConsumption && reading.electricityCost) {
      totalCost += reading.electricityConsumption * reading.electricityCost;
    } else if (reading.type === 'electricity' && reading.consumption) {
      totalCost += reading.consumption * (reading.unitCost || 0);
    }
    
    if (reading.waterConsumption && reading.waterCost) {
      totalCost += reading.waterConsumption * reading.waterCost;
    } else if (reading.type === 'water' && reading.consumption) {
      totalCost += reading.consumption * (reading.unitCost || 0);
    }
    
    if (reading.gasConsumption && reading.gasCost) {
      totalCost += reading.gasConsumption * reading.gasCost;
    } else if (reading.type === 'gas' && reading.consumption) {
      totalCost += reading.consumption * (reading.unitCost || 0);
    }
    
    return totalCost;
  }

  // Processa i dati delle letture per i grafici
  processReadingsForChart(readings: any[], year: number): MonthlyUtilityData[] {
    const result: MonthlyUtilityData[] = [];
    
    // Raggruppa le letture per appartamento e mese
    const groupedReadings = new Map<string, any[]>();
    
    readings.forEach(reading => {
      const readingDate = new Date(reading.readingDate);
      if (readingDate.getFullYear() === year) {
        const month = readingDate.getMonth() + 1;
        const key = `${reading.apartmentId}-${month}`;
        
        if (!groupedReadings.has(key)) {
          groupedReadings.set(key, []);
        }
        
        groupedReadings.get(key)?.push(reading);
      }
    });
    
    // Calcola i consumi mensili per ogni appartamento
    groupedReadings.forEach((apartmentReadings, key) => {
      const [apartmentIdStr, monthStr] = key.split('-');
      const apartmentId = parseInt(apartmentIdStr);
      const month = parseInt(monthStr);
      
      let electricity = 0;
      let water = 0;
      let gas = 0;
      
      apartmentReadings.forEach(reading => {
        // Check for specific consumption properties first, then fall back to type-based logic
        if (reading.electricityConsumption) {
          electricity += reading.electricityConsumption;
        } else if (reading.type === 'electricity') {
          electricity += reading.consumption;
        }
        
        if (reading.waterConsumption) {
          water += reading.waterConsumption;
        } else if (reading.type === 'water') {
          water += reading.consumption;
        }
        
        if (reading.gasConsumption) {
          gas += reading.gasConsumption;
        } else if (reading.type === 'gas') {
          gas += reading.consumption;
        }
      });
      
      // Aggiungi i dati al risultato
      result.push({
        month,
        year,
        apartmentId,
        apartmentName: `Appartamento ${apartmentId}`, // Questo verrebbe sostituito con il nome reale
        electricity,
        water,
        gas
      });
    });
    
    return result;
  }

  // Ottiene i dati formattati per i grafici
  getFormattedChartData(data: MonthlyUtilityData[]): ApartmentUtilityData[] {
    // Raggruppa i dati per appartamento
    const apartmentMap = new Map<number, MonthlyUtilityData[]>();
    
    data.forEach(item => {
      if (!apartmentMap.has(item.apartmentId)) {
        apartmentMap.set(item.apartmentId, []);
      }
      apartmentMap.get(item.apartmentId)?.push(item);
    });
    
    // Formatta i dati per ogni appartamento
    const result: ApartmentUtilityData[] = [];
    
    apartmentMap.forEach((monthlyData, apartmentId) => {
      // Ordina i dati per mese
      monthlyData.sort((a, b) => a.month - b.month);
      
      result.push({
        apartmentId,
        apartmentName: monthlyData[0]?.apartmentName || `Appartamento ${apartmentId}`,
        monthlyData: monthlyData.map(item => ({
          month: item.month,
          electricity: item.electricity,
          water: item.water,
          gas: item.gas
        }))
      });
    });
    
    return result;
  }
}