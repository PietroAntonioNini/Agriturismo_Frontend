import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StatementDefaultsPayload {
  tari?: number;
  meterFee?: number;
  unitCosts?: { electricity?: number; water?: number; gas?: number; laundry?: number };
}

/** Valori restituiti da GET /settings/automation */
export type AutomationType = 'manual' | 'immediate' | 'scheduled';

export interface AutomationSettings {
  automationType: AutomationType;
  automationDays: number;
}

/** Payload per PUT /settings/automation. automationDays obbligatorio solo se automationType === 'scheduled'. */
export interface AutomationPayload {
  automationType: AutomationType;
  automationDays?: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly endpoint = `${environment.apiUrl}/settings/billing-defaults`;
  private readonly automationEndpoint = `${environment.apiUrl}/settings/automation`;

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

  getAutomation(): Observable<AutomationSettings | null> {
    return this.http.get<AutomationSettings>(this.automationEndpoint).pipe(
      catchError(error => {
        console.error('Errore nel recupero delle impostazioni automazione', error);
        return of(null);
      })
    );
  }

  saveAutomation(payload: AutomationPayload): Observable<AutomationSettings | null> {
    return this.http.put<AutomationSettings>(this.automationEndpoint, payload).pipe(
      tap(() => {/* ok */}),
      catchError(error => {
        console.error('Errore nel salvataggio delle impostazioni automazione', error);
        return of(null);
      })
    );
  }
}


