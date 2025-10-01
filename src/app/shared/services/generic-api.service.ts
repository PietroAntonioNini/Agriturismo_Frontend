import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UtilityReading, UtilityReadingCreate, MonthlyUtilityData, ApartmentUtilityData, LastReading, UtilityStatistics, UtilityTypeConfig } from '../models';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class GenericApiService {
  // Cache per le richieste GET
  private cache = new Map<string, CacheEntry<any>>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minuti di cache
  private pendingRequests = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) { }

  private apiUrl(entity: string): string {
    return `${environment.apiUrl}/${entity}/`;
  }

  private getCacheKey(entity: string, params?: any): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `${entity}_${paramsString}`;
  }

  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // GET: Tutti gli elementi con cache intelligente
  getAll<T>(entity: string, params?: any, forceRefresh: boolean = false): Observable<T[]> {
    const cacheKey = this.getCacheKey(entity, params);
    
    // Pulisci cache scaduta
    this.clearExpiredCache();
    
    // Se non è richiesto un refresh e la cache è valida, usa la cache
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }
    
    // Se c'è già una richiesta in corso per questa chiave, riutilizzala
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    const request = this.http.get<T[]>(this.apiUrl(entity), { 
      params: httpParams
    }).pipe(
      tap(data => {
        // Salva nella cache
        this.cache.set(cacheKey, {
          data: data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.cacheTimeout
        });
        // Rimuovi dalla lista delle richieste pendenti
        this.pendingRequests.delete(cacheKey);
      }),
      shareReplay(1) // Condividi la risposta tra più subscriber
    );

    // Salva la richiesta pendente
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  // Metodo per invalidare la cache per un'entità specifica
  invalidateCache(entity: string, id?: number | string): void {
    if (id) {
      // Invalida cache per un elemento specifico
      const cacheKey = this.getCacheKey(`${entity}_${id}`);
      this.cache.delete(cacheKey);
    } else {
      // Invalida tutta la cache per un'entità
      for (const key of this.cache.keys()) {
        if (key.startsWith(entity + '_')) {
          this.cache.delete(key);
        }
      }
    }
    
    // Ottimizzazione: invalida anche le richieste pendenti per questa entità
    for (const [key, request] of this.pendingRequests.entries()) {
      if (key.startsWith(entity + '_')) {
        this.pendingRequests.delete(key);
      }
    }
  }

  // Metodo per invalidare cache specifiche con parametri
  invalidateCacheWithParams(entity: string, params?: any): void {
    const cacheKey = this.getCacheKey(entity, params);
    this.cache.delete(cacheKey);
    
    // Invalida anche le richieste pendenti per questa chiave
    this.pendingRequests.delete(cacheKey);
  }



  // Metodo per pulire tutta la cache
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Metodo per ottenere statistiche della cache
  getCacheStats(): { size: number; pendingRequests: number; keys: string[] } {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // GET: Elemento singolo per ID con cache
  getById<T>(entity: string, id: number | string, params?: any, forceRefresh: boolean = false): Observable<T> {
    const cacheKey = this.getCacheKey(`${entity}_${id}`, params);
    
    // Pulisci cache scaduta
    this.clearExpiredCache();
    
    // Se non è richiesto un refresh e la cache è valida, usa la cache
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }

    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<T>(
      `${environment.apiUrl}/${entity}/${id}`, 
      { 
        params: httpParams
      }
    ).pipe(
      tap(data => {
        // Salva nella cache
        this.cache.set(cacheKey, {
          data: data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.cacheTimeout
        });
      })
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
        return this.http.post<T>(this.apiUrl(entity), apartmentData).pipe(
          tap(() => this.invalidateCache(entity)) // Invalida cache dopo creazione
        );
      }
      return this.http.post<T>(this.apiUrl(entity), data).pipe(
        tap(() => this.invalidateCache(entity)) // Invalida cache dopo creazione
      );
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
    
    return this.http.post<T>(`${this.apiUrl(entity)}with-images`, formData);
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
        
        return this.http.put<T>(`${environment.apiUrl}/${entity}/${id}/with-images`, formData).pipe(
        tap(() => {
          this.invalidateCache(entity, id); // Invalida cache dopo aggiornamento
          // Ottimizzazione: se è un tenant, invalida anche la cache dei contratti attivi
          this.invalidateCacheWithParams('leases', { status: 'active' });
        })
      );
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
      
      return this.http.put<T>(`${environment.apiUrl}/${entity}/${id}/with-images`, formData).pipe(
        tap(() => this.invalidateCache(entity, id)) // Invalida cache dopo aggiornamento
      );
    } 
    
    if (!files || files.length === 0) {
      // Se è un'entità apartment, assicuriamoci che amenities sia sempre un array
      if (entity === 'apartments') {
        const apartmentData = {...data} as Partial<T> & { amenities?: string[] };
        if (!apartmentData.amenities) {
          apartmentData.amenities = [];
        }
        console.log('Updating apartment without files:', apartmentData);
        return this.http.put<T>(`${environment.apiUrl}/${entity}/${id}`, apartmentData);
      }
      return this.http.put<T>(`${environment.apiUrl}/${entity}/${id}`, data);
    }
    
    const formData = new FormData();
    formData.append(entity, JSON.stringify(data));
    if (files) {
      files.forEach((file, index) => formData.append(`file${index}`, file));
    }
    return this.http.put<T>(`${this.apiUrl(entity)}${id}/with-images`, formData);
  }

  // DELETE: Eliminazione elemento
  delete(entity: string, id: number | string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/${entity}/${id}`).pipe(
      tap(() => {
        this.invalidateCache(entity, id); // Invalida cache dopo eliminazione
        // Ottimizzazione: se è un tenant, invalida anche la cache dei contratti attivi
        if (entity === 'tenants') {
          this.invalidateCacheWithParams('leases', { status: 'active' });
        }
      })
    );
  }

  // Aggiornare il metodo uploadFile per aggiungere timestamp e gestione anti-cache
  uploadFile(entity: string, id: number | string, path: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Aggiungi timestamp per evitare la cache
    const timestamp = Date.now();
    const url = `${environment.apiUrl}/${entity}/${id}/${path}?_=${timestamp}`;
    
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
    const url = `${environment.apiUrl}/${entity}/${id}/${path}?_=${timestamp}`;
    
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
    return this.http.patch<T>(`${environment.apiUrl}/${entity}/${id}`, data);
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
    return this.http.patch<T>(`${environment.apiUrl}/${entity}/${id}/status`, { status });
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
    return this.http.post<any>(`${environment.apiUrl}/${entity}/${id}/documents`, document);
  }

  recordPayment(entity: string, id: number | string, paymentData: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/${entity}/${id}/payments`, paymentData);
  }

  // Metodi specifici migrati da UtilityService
  getUtilitySummaryByApartment(apartmentId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/utilities/summary/${apartmentId}`);
  }

  getYearlyUtilityStatistics(year: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/utilities/statistics/${year}`);
  }

  getApartmentConsumption(apartmentId: number, year: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/utilities/apartment/${apartmentId}/consumption/${year}`);
  }

  // Cerca inquilini in base a una query di ricerca
  searchTenants<T>(query: string): Observable<T[]> {
    return this.http.get<T[]>(`${environment.apiUrl}/tenants/search`, {
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
      `${environment.apiUrl}/tenants/${tenantId}/communication-preferences`, 
      preferences
    );
  }

  // Metodo di ricerca generico che può essere usato per qualsiasi entità
  search<T>(entity: string, query: string): Observable<T[]> {
    return this.http.get<T[]>(`${environment.apiUrl}/${entity}/search`, {
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
    return this.http.get<UtilityTypeConfig[]>(`${this.apiUrl('utilities')}types`).pipe(
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
  getLastUtilityReading(apartmentId: number, type: string, subtype?: string): Observable<LastReading | null> {
    const params: any = {
      apartmentId: apartmentId.toString(),
      type: type,
      _sort: 'readingDate',
      _order: 'desc',
      _limit: '1'
    };

    // Aggiungi filtro per sottotipo se specificato
    if (subtype) {
      params.subtype = subtype;
    }
    
    return this.getAll<UtilityReading>('utilities', params).pipe(
      switchMap((readings: UtilityReading[]) => {
        if (readings.length > 0) {
          const reading = readings[0];
          return of({
            apartmentId: reading.apartmentId,
            type: reading.type,
            lastReading: reading.currentReading,
            lastReadingDate: reading.readingDate,
            hasHistory: true,
            subtype: reading.subtype
          } as LastReading);
        } else {
          // Se non troviamo letture con il sottotipo specificato e stiamo cercando 'main',
          // proviamo a cercare letture con subtype NULL (letture vecchie)
          if (subtype === 'main') {
            return this.searchForNullSubtypeReadings(apartmentId, type);
          }
          
          // Per 'laundry', se non troviamo letture specifiche, restituiamo come prima lettura
          if (subtype === 'laundry') {
            return of({
              apartmentId: apartmentId,
              type: type as 'electricity' | 'water' | 'gas',
              lastReading: 0,
              lastReadingDate: new Date(),
              hasHistory: false,
              subtype: 'laundry'
            } as LastReading);
          }
          
          // Nessuna lettura precedente - prima lettura
          return of({
            apartmentId: apartmentId,
            type: type as 'electricity' | 'water' | 'gas',
            lastReading: 0,
            lastReadingDate: new Date(),
            hasHistory: false,
            subtype: subtype
          } as LastReading);
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

  // Metodo helper per cercare letture con subtype NULL (letture vecchie)
  private searchForNullSubtypeReadings(apartmentId: number, type: string): Observable<LastReading> {
    const params: any = {
      apartmentId: apartmentId.toString(),
      type: type,
      _sort: 'readingDate',
      _order: 'desc',
      _limit: '1'
    };

    return this.getAll<UtilityReading>('utilities', params).pipe(
      map((readings: UtilityReading[]) => {
        // Filtra le letture che hanno subtype NULL o undefined
        const nullSubtypeReadings = readings.filter(reading => 
          reading.subtype === null || reading.subtype === undefined || reading.subtype === ''
        );

        if (nullSubtypeReadings.length > 0) {
          const reading = nullSubtypeReadings[0];
          return {
            apartmentId: reading.apartmentId,
            type: reading.type,
            lastReading: reading.currentReading,
            lastReadingDate: reading.readingDate,
            hasHistory: true,
            subtype: 'main' // Tratta le letture NULL come 'main'
          } as LastReading;
        } else {
          // Nessuna lettura precedente - prima lettura
          return {
            apartmentId: apartmentId,
            type: type as 'electricity' | 'water' | 'gas',
            lastReading: 0,
            lastReadingDate: new Date(),
            hasHistory: false,
            subtype: 'main'
          } as LastReading;
        }
      }),
      catchError(error => {
        console.error(`Errore durante la ricerca di letture con subtype NULL per l'appartamento ${apartmentId}`, error);
        // In caso di errore, restituisce come prima lettura
        return of({
          apartmentId: apartmentId,
          type: type as 'electricity' | 'water' | 'gas',
          lastReading: 0,
          lastReadingDate: new Date(),
          hasHistory: false,
          subtype: 'main'
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
    return this.http.get<UtilityStatistics>(`${environment.apiUrl}/utilities/statistics/overview?year=${year}`).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero delle statistiche utility per l'anno ${year}`, error);
        return of(null);
      })
    );
  }

  // Ottiene dati mensili per appartamenti (per grafici)
  getMonthlyUtilityData(year: number, forceRefresh: boolean = false): Observable<MonthlyUtilityData[]> {
    let url = `${environment.apiUrl}/utilities/statistics/${year}`;
    
    // Aggiunge timestamp per forzare il refresh ed evitare cache
    if (forceRefresh) {
      const timestamp = new Date().getTime();
      url += `?_refresh=${timestamp}`;
    }
    
    return this.http.get<MonthlyUtilityData[]>(url, {
      headers: forceRefresh ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' } : {}
    }).pipe(
      catchError(error => {
        console.error(`Errore durante il recupero dei dati mensili per l'anno ${year}`, error);
        return of([]);
      })
    );
  }

  // Ottiene dati consumo per appartamento specifico
  getApartmentUtilityData(apartmentId: number, year: number): Observable<ApartmentUtilityData | null> {
    return this.http.get<ApartmentUtilityData>(`${environment.apiUrl}/utilities/apartment/${apartmentId}/consumption/${year}`).pipe(
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

  // ===== METODI AGGIUNTI PER FATTURAZIONE =====

  // Metodo POST generico per endpoint specifici
  post<T>(url: string, data: any, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.post<T>(`${environment.apiUrl}/${url}`, data, { 
      params: httpParams 
    }).pipe(
      catchError(error => {
        console.error(`Errore nella chiamata POST a ${url}:`, error);
        throw error;
      })
    );
  }

  // Metodo per download blob (PDF, etc.)
  getBlob(url: string, params?: any): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get(`${environment.apiUrl}/${url}`, { 
      params: httpParams,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error(`Errore nel download blob da ${url}:`, error);
        throw error;
      })
    );
  }

  // Metodo per chiamate GET a endpoint specifici con cache
  getAllWithCache<T>(url: string, params?: any, forceRefresh: boolean = false): Observable<T[]> {
    const cacheKey = this.getCacheKey(url, params);
    
    // Pulisci cache scaduta
    this.clearExpiredCache();
    
    // Se non è richiesto un refresh e la cache è valida, usa la cache
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return of(this.cache.get(cacheKey)!.data);
    }
    
    // Se c'è già una richiesta in corso per questa chiave, riutilizzala
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    const request = this.http.get<T[]>(`${environment.apiUrl}/${url}`, { 
      params: httpParams
    }).pipe(
      tap(data => {
        // Salva nella cache
        this.cache.set(cacheKey, {
          data: data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.cacheTimeout
        });
        // Rimuovi dalla lista delle richieste pendenti
        this.pendingRequests.delete(cacheKey);
      }),
      shareReplay(1) // Condividi la risposta tra più subscriber
    );

    // Salva la richiesta pendente
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }
}