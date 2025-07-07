import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UtilityReading, UtilityReadingCreate, MonthlyUtilityData, ApartmentUtilityData, LastReading, UtilityStatistics, UtilityTypeConfig } from '../models';

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
  getById<T>(entity: string, id: number | string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    // Se non ci sono parametri, aggiungi un timestamp per evitare la cache
    if (!params || Object.keys(params).length === 0) {
      const timestamp = new Date().getTime();
      httpParams = httpParams.set('_t', timestamp.toString());
    }
    
    return this.http.get<T>(
      `${this.apiUrl(entity)}/${id}`, 
      { 
        params: httpParams,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }
    );
  }
  

  // POST: Creazione elemento (anche con immagini opzionali)
  create<T>(entity: string, data: Partial<T>, files?: File[], fileFieldPrefix?: string): Observable<T> {
    if (!files || files.length === 0) {
      // Se è un'entità apartment, assicuriamoci che amenities sia sempre un array
      if (entity === 'apartments') {
        const apartmentData = {...data} as Partial<T> & { amenities?: string[] };
        if (!apartmentData.amenities) {
          apartmentData.amenities = [];
        }
        console.log('Sending apartment data without files:', apartmentData);
        return this.http.post<T>(this.apiUrl(entity), apartmentData);
      }
      return this.http.post<T>(this.apiUrl(entity), data);
    }
  
    const formData = new FormData();
    
    // Use 'apartment' key for apartment entity, not the entity name
    if (entity === 'apartments') {
      const apartmentData = {...data} as Partial<T> & { amenities?: string[] };

      // This ensures it's always included in the JSON data
      if (!apartmentData.amenities) {
        apartmentData.amenities = [];
      }

      console.log('Sending apartment data with files:', apartmentData);
      formData.append('apartment', JSON.stringify(apartmentData));
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }
    } else if (entity === 'tenants') {
      // Per i tenant, usiamo un formato specifico richiesto dal backend
      formData.append('tenants', JSON.stringify(data));
      
      // Aggiungiamo i file con i nomi specifici richiesti dal backend
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          const fieldName = `document${index}`;
          formData.append(fieldName, file);
        });
      }
    } else {
      formData.append(entity, JSON.stringify(data));

      files.forEach((file, index) => {
        const fieldName = `file${index}`;
        formData.append(fieldName, file);
      });
    }
    
    return this.http.post<T>(`${this.apiUrl(entity)}/with-images`, formData);
  }

  // PUT: Aggiornamento elemento (anche con immagini opzionali)
  update<T>(entity: string, id: number | string, data: Partial<T>, files?: File[]): Observable<T> {
    if (entity === 'tenants') {
        const formData = new FormData();
        formData.append('tenants', JSON.stringify(data));
        
        if (files && files.length > 0) {
            files.forEach((file, index) => {
                const fieldName = `document${index}`;
                formData.append(fieldName, file);
            });
        }
        
        return this.http.put<T>(`${this.apiUrl(entity)}/${id}/with-images`, formData);
    } else if (entity === 'apartments') {
      const formData = new FormData();

      const apartmentData = {...data} as Partial<T> & { amenities?: string[] };

      // This ensures it's always included in the JSON data
      if (!apartmentData.amenities) {
        apartmentData.amenities = [];
      }

      console.log('Updating apartment with amenities:', apartmentData.amenities);
      formData.append('apartment', JSON.stringify(apartmentData));
      
      if (files && files.length > 0) {
          // Usa nomi file specifici come richiesto dal backend
          files.forEach(file => {
            formData.append('files', file);
          });
      }
      
      return this.http.put<T>(`${this.apiUrl(entity)}/${id}/with-images`, formData);
    } 
    
    if (!files || files.length === 0) {
      // Se è un'entità apartment, assicuriamoci che amenities sia sempre un array
      if (entity === 'apartments') {
        const apartmentData = {...data} as Partial<T> & { amenities?: string[] };
        if (!apartmentData.amenities) {
          apartmentData.amenities = [];
        }
        console.log('Updating apartment without files:', apartmentData);
        return this.http.put<T>(`${this.apiUrl(entity)}/${id}`, apartmentData);
      }
      return this.http.put<T>(`${this.apiUrl(entity)}/${id}`, data);
    }
    
    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    if (files) {
      files.forEach((file, index) => formData.append(`file${index}`, file));
    }
    return this.http.put<T>(`${this.apiUrl(entity)}/${id}/with-images`, formData);
  }

  // DELETE: Eliminazione elemento
  delete(entity: string, id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl(entity)}/${id}`);
  }

  // Aggiornare il metodo uploadFile per aggiungere timestamp e gestione anti-cache
  uploadFile(entity: string, id: number | string, path: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Aggiungi timestamp per evitare la cache
    const timestamp = Date.now();
    const url = `${this.apiUrl(entity)}/${id}/${path}?_=${timestamp}`;
    
    return this.http.post<{ imageUrl: string }>(
      url, 
      formData,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    ).pipe(
      catchError(error => {
        console.error(`Errore durante l'upload del file per ${entity}/${id}/${path}`, error);
        throw error;
      })
    );
  }

  // Aggiornare il metodo deleteFile per migliorare l'affidabilità
  deleteFile(entity: string, id: number | string, path: string): Observable<void> {
    // Aggiungi timestamp per evitare la cache
    const timestamp = Date.now();
    const url = `${this.apiUrl(entity)}/${id}/${path}?_=${timestamp}`;
    
    return this.http.delete<void>(
      url,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    ).pipe(
      tap(() => console.log(`File eliminato con successo: ${entity}/${id}/${path}`)),
      catchError(error => {
        console.error(`Errore durante l'eliminazione del file per ${entity}/${id}/${path}`, error);
        throw error;
      })
    );
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

  // === METODI UTILITY READINGS (CENTRALIZZATI) ===

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
      let electricityCost = 0;
      let waterCost = 0;
      let gasCost = 0;
      
      apartmentReadings.forEach(reading => {
        // Check for specific consumption properties first, then fall back to type-based logic
        if (reading.electricityConsumption) {
          electricity += reading.electricityConsumption;
          electricityCost += reading.electricityCost || 0;
        } else if (reading.type === 'electricity') {
          electricity += reading.consumption;
          electricityCost += reading.totalCost || 0;
        }
        
        if (reading.waterConsumption) {
          water += reading.waterConsumption;
          waterCost += reading.waterCost || 0;
        } else if (reading.type === 'water') {
          water += reading.consumption;
          waterCost += reading.totalCost || 0;
        }
        
        if (reading.gasConsumption) {
          gas += reading.gasConsumption;
          gasCost += reading.gasCost || 0;
        } else if (reading.type === 'gas') {
          gas += reading.consumption;
          gasCost += reading.totalCost || 0;
        }
      });
      
      const totalCost = electricityCost + waterCost + gasCost;
      
      // Aggiungi i dati al risultato
      result.push({
        month,
        year,
        apartmentId,
        apartmentName: `Appartamento ${apartmentId}`, // Questo verrebbe sostituito con il nome reale
        electricity,
        water,
        gas,
        electricityCost,
        waterCost,
        gasCost,
        totalCost
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
    
    // Array dei nomi dei mesi
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    
    // Formatta i dati per ogni appartamento
    const result: ApartmentUtilityData[] = [];
    
    apartmentMap.forEach((monthlyData, apartmentId) => {
      // Ordina i dati per mese
      monthlyData.sort((a, b) => a.month - b.month);
      
      // Calcola i totali annuali
      const yearlyTotals = {
        electricity: monthlyData.reduce((sum, item) => sum + item.electricity, 0),
        water: monthlyData.reduce((sum, item) => sum + item.water, 0),
        gas: monthlyData.reduce((sum, item) => sum + item.gas, 0),
        totalCost: monthlyData.reduce((sum, item) => sum + item.totalCost, 0)
      };
      
      result.push({
        apartmentId,
        apartmentName: monthlyData[0]?.apartmentName || `Appartamento ${apartmentId}`,
        monthlyData: monthlyData.map(item => ({
          month: item.month,
          monthName: monthNames[item.month - 1],
          electricity: item.electricity,
          water: item.water,
          gas: item.gas,
          electricityCost: item.electricityCost,
          waterCost: item.waterCost,
          gasCost: item.gasCost,
          totalCost: item.totalCost
        })),
        yearlyTotals
      });
    });
    
    return result;
  }

  // === METODI SPECIFICI PER UTILITY READINGS ===

  // Ottiene i tipi di utility configurati dal backend
  getUtilityTypes(): Observable<UtilityTypeConfig[]> {
    return this.http.get<UtilityTypeConfig[]>(`${this.apiUrl('utilities')}/types`).pipe(
      catchError(error => {
        console.error('Errore durante il recupero dei tipi utility dal backend', error);
        // Fallback ai tipi predefiniti in caso di errore
        return of([
          {
            type: 'electricity' as const,
            label: 'Elettricità',
            unit: 'kWh',
            icon: 'bolt',
            color: '#FF6B6B',
            defaultCost: 0.25
          },
          {
            type: 'water' as const,
            label: 'Acqua',
            unit: 'm³',
            icon: 'water_drop',
            color: '#4ECDC4',
            defaultCost: 1.50
          },
          {
            type: 'gas' as const,
            label: 'Gas',
            unit: 'm³',
            icon: 'local_fire_department',
            color: '#45B7D1',
            defaultCost: 0.80
          }
        ] as UtilityTypeConfig[]);
      })
    );
  }

  // Ottiene tutte le letture delle utilities
  getAllUtilityReadings(params?: { [key: string]: any }): Observable<UtilityReading[]> {
    return this.getAll<UtilityReading>('utilities', params).pipe(
      catchError(error => {
        console.error('Errore durante il recupero delle letture utility', error);
        return of([]);
      })
    );
  }

  // Crea una nuova lettura utility
  createUtilityReading(reading: Partial<UtilityReading>): Observable<UtilityReading | null> {
    return this.create<UtilityReading>('utilities', reading).pipe(
      catchError(error => {
        console.error('Errore durante la creazione della lettura utility', error);
        return of(null);
      })
    );
  }

  // Aggiorna una lettura utility
  updateUtilityReading(id: number, reading: Partial<UtilityReading>): Observable<UtilityReading | null> {
    return this.update<UtilityReading>('utilities', id, reading).pipe(
      catchError(error => {
        console.error(`Errore durante l'aggiornamento della lettura utility con ID ${id}`, error);
        return of(null);
      })
    );
  }

  // Elimina una lettura utility
  deleteUtilityReading(id: number): Observable<boolean> {
    return this.delete('utilities', id).pipe(
      map(() => true),
      catchError(error => {
        console.error(`Errore durante l'eliminazione della lettura utility con ID ${id}`, error);
        return of(false);
      })
    );
  }

  // Ottiene l'ultima lettura per un appartamento e tipo di utenza (restituisce LastReading)
  getLastUtilityReading(apartmentId: number, type: string): Observable<LastReading | null> {
    const params = {
      apartmentId: apartmentId.toString(),
      type: type,
      _sort: 'readingDate',
      _order: 'desc',
      _limit: '1'
    };
    
    return this.getAll<UtilityReading>('utilities', params).pipe(
      map((readings: UtilityReading[]) => {
        if (readings.length > 0) {
          const reading = readings[0];
          return {
            apartmentId: reading.apartmentId,
            type: reading.type,
            lastReading: reading.currentReading,
            lastReadingDate: reading.readingDate,
            hasHistory: true
          } as LastReading;
        } else {
          // Nessuna lettura precedente - prima lettura
          return {
            apartmentId: apartmentId,
            type: type as 'electricity' | 'water' | 'gas',
            lastReading: 0,
            lastReadingDate: new Date(),
            hasHistory: false
          } as LastReading;
        }
      }),
      catchError(error => {
        console.error(`Errore durante il recupero dell'ultima lettura per l'appartamento ${apartmentId}`, error);
        // In caso di errore, restituisce come prima lettura
        return of({
          apartmentId: apartmentId,
          type: type as 'electricity' | 'water' | 'gas',
          lastReading: 0,
          lastReadingDate: new Date(),
          hasHistory: false
        } as LastReading);
      })
    );
  }

  // Toggle stato pagamento di una lettura
  toggleUtilityPaymentStatus(id: number, isPaid: boolean): Observable<UtilityReading | null> {
    const updateData = { 
      isPaid: isPaid,
      paidDate: isPaid ? new Date() : undefined
    };
    
    return this.patch<UtilityReading>('utilities', id, updateData).pipe(
      catchError(error => {
        console.error(`Errore durante l'aggiornamento dello stato pagamento per ID ${id}`, error);
        return of(null);
      })
    );
  }

  // Ottiene letture per appartamento e anno
  getUtilityReadingsByApartmentAndYear(apartmentId: number, year: number): Observable<UtilityReading[]> {
    const params = {
      apartmentId: apartmentId.toString(),
      year: year.toString()
    };
    
    return this.getAll<UtilityReading>('utilities', params).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero delle letture per appartamento ${apartmentId} anno ${year}`, error);
        return of([]);
      })
    );
  }

  // Ottiene statistiche utility per la dashboard
  getUtilityStatistics(year: number): Observable<UtilityStatistics | null> {
    return this.http.get<UtilityStatistics>(`${this.apiUrl('utilities')}/statistics/overview?year=${year}`).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero delle statistiche utility per l'anno ${year}`, error);
        return of(null);
      })
    );
  }

  // Ottiene dati mensili per appartamenti (per grafici)
  getMonthlyUtilityData(year: number): Observable<MonthlyUtilityData[]> {
    return this.http.get<MonthlyUtilityData[]>(`${this.apiUrl('utilities')}/statistics/${year}`).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero dei dati mensili per l'anno ${year}`, error);
        return of([]);
      })
    );
  }

  // Ottiene dati consumo per appartamento specifico
  getApartmentUtilityData(apartmentId: number, year: number): Observable<ApartmentUtilityData | null> {
    return this.http.get<ApartmentUtilityData>(`${this.apiUrl('utilities')}/apartment/${apartmentId}/consumption/${year}`).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero dei dati per appartamento ${apartmentId} anno ${year}`, error);
        return of(null);
      })
    );
  }

  // Crea una nuova lettura utility con payload specifico per il backend
  createUtilityReadingWithCorrectFormat(reading: UtilityReadingCreate): Observable<UtilityReading | null> {
    return this.http.post<UtilityReading>(`${this.apiUrl('utilities')}`, reading).pipe(
      catchError(error => {
        console.error('Errore durante la creazione della lettura utility', error);
        return of(null);
      })
    );
  }

  // Aggiorna una lettura utility con payload specifico per il backend
  updateUtilityReadingWithCorrectFormat(id: number, reading: UtilityReadingCreate): Observable<UtilityReading | null> {
    return this.http.put<UtilityReading>(`${this.apiUrl('utilities')}/${id}`, reading).pipe(
      catchError(error => {
        console.error(`Errore durante l'aggiornamento della lettura utility con ID ${id}`, error);
        return of(null);
      })
    );
  }
}