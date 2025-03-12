import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UtilityReading, UtilitySummary, MonthlyUtilityData, ApartmentUtilityData } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {
  private apiUrl = `${environment.apiUrl}/utilities`;

  constructor(private http: HttpClient) { }

  // Operazioni CRUD per le letture delle utenze
  getAllReadings(params?: { [key: string]: any }): Observable<UtilityReading[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }
    
    return this.http.get<UtilityReading[]>(this.apiUrl, { params: httpParams })
      .pipe(
        catchError(error => {
          console.error('Errore durante il recupero delle letture', error);
          return of([]);
        })
      );
  }

  getReadingById(id: number): Observable<UtilityReading | null> {
    return this.http.get<UtilityReading>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero della lettura con ID ${id}`, error);
          return of(null);
        })
      );
  }

  createReading(reading: Omit<UtilityReading, 'id' | 'consumption' | 'totalCost' | 'createdAt' | 'updatedAt'>): Observable<UtilityReading | null> {
    return this.http.post<UtilityReading>(this.apiUrl, reading)
      .pipe(
        catchError(error => {
          console.error('Errore durante la creazione della lettura', error);
          return of(null);
        })
      );
  }

  updateReading(id: number, reading: Partial<UtilityReading>): Observable<UtilityReading | null> {
    return this.http.put<UtilityReading>(`${this.apiUrl}/${id}`, reading)
      .pipe(
        catchError(error => {
          console.error(`Errore durante l'aggiornamento della lettura con ID ${id}`, error);
          return of(null);
        })
      );
  }

  deleteReading(id: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error(`Errore durante l'eliminazione della lettura con ID ${id}`, error);
          return of(false);
        })
      );
  }

  // Metodi per ottenere dati aggregati
  getUtilityDataByYear(year: number): Observable<MonthlyUtilityData[]> {
    return this.http.get<UtilityReading[]>(`${this.apiUrl}`, {
      params: new HttpParams().set('year', year.toString())
    }).pipe(
      map(readings => this.processReadingsForChart(readings, year)),
      catchError(error => {
        console.error(`Errore durante il recupero dei dati per l'anno ${year}`, error);
        return of([]);
      })
    );
  }

  getUtilitySummaryByApartment(apartmentId: number): Observable<UtilitySummary[]> {
    return this.http.get<UtilitySummary[]>(`${this.apiUrl}/summary/${apartmentId}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero del riepilogo per l'appartamento ${apartmentId}`, error);
          return of([]);
        })
      );
  }

  getLastReading(apartmentId: number, type: string): Observable<UtilityReading | null> {
    const params = new HttpParams()
      .set('apartmentId', apartmentId.toString())
      .set('type', type)
      .set('_sort', 'readingDate')
      .set('_order', 'desc')
      .set('_limit', '1');
      
    return this.http.get<UtilityReading[]>(this.apiUrl, { params })
      .pipe(
        map(readings => readings.length > 0 ? readings[0] : null),
        catchError(error => {
          console.error(`Errore durante il recupero dell'ultima lettura per l'appartamento ${apartmentId}`, error);
          return of(null);
        })
      );
  }

  getYearlyStatistics(year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics/${year}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero delle statistiche per l'anno ${year}`, error);
          return of({});
        })
      );
  }

  getApartmentConsumption(apartmentId: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/apartment/${apartmentId}/consumption/${year}`)
      .pipe(
        catchError(error => {
          console.error(`Errore durante il recupero dei consumi per l'appartamento ${apartmentId}`, error);
          return of({});
        })
      );
  }

  // Metodo helper per processare i dati delle letture per i grafici
  private processReadingsForChart(readings: UtilityReading[], year: number): MonthlyUtilityData[] {
    const result: MonthlyUtilityData[] = [];
    
    // Raggruppa le letture per appartamento e mese
    const groupedReadings = new Map<string, UtilityReading[]>();
    
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

  // Metodo per calcolare il costo totale di una lettura
  calculateTotalCost(reading: Partial<UtilityReading>): number {
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

  // Metodo per ottenere i dati formattati per i grafici
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