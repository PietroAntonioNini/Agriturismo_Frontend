import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StatementDefaultsPayload {
  tari?: number;
  meterFee?: number;
  unitCosts?: { electricity?: number; water?: number; gas?: number };
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly endpoint = `${environment.apiUrl}/settings/billing-defaults`;

  constructor(private http: HttpClient) {}

  getStatementDefaults(): Observable<StatementDefaultsPayload | null> {
    return this.http.get<StatementDefaultsPayload>(this.endpoint).pipe(
      catchError(error => {
        console.error('Errore nel recupero dei default fatturazione', error);
        return of(null);
      })
    );
  }

  saveStatementDefaults(payload: StatementDefaultsPayload): Observable<StatementDefaultsPayload | null> {
    return this.http.put<StatementDefaultsPayload>(this.endpoint, payload).pipe(
      tap(() => {/* ok */}),
      catchError(error => {
        console.error('Errore nel salvataggio dei default fatturazione', error);
        return of(null);
      })
    );
  }
}


