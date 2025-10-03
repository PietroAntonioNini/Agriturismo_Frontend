import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_DATE_LOCALE, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { RateLimitingInterceptor } from './core/interceptors/rate-limiting.interceptor';
import { IdleMonitorService } from './core/services/idle-monitor.service';
import { AuthService } from './shared/services/auth.service';

// ⭐ Registra il locale italiano
registerLocaleData(localeIt);

// ⭐ Formato date italiano (gg/mm/aaaa) per Angular Material
export const IT_DATE_FORMATS = {
  parse: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

// Funzione di inizializzazione per AuthService
export function initializeAuth(authService: AuthService) {
  return () => authService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        // Usa withInterceptors per Angular 17+
      ]),
      withInterceptorsFromDi()
    ),
    // Usa il vecchio metodo di registrazione degli interceptor (per compatibilità)
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RateLimitingInterceptor,
      multi: true
    },
    // Inizializza AuthService dopo la creazione di HttpClient
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },
    provideAnimations(),
    // Avvia il monitor di inattività
    IdleMonitorService,
    // ⭐ CONFIGURAZIONE DATE FORMATO ITALIANO (gg/mm/aaaa)
    // Locale italiano per tutta l'applicazione
    { provide: LOCALE_ID, useValue: 'it-IT' },
    // Locale italiano per Material Datepicker
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
    // Formato date personalizzato italiano
    { provide: MAT_DATE_FORMATS, useValue: IT_DATE_FORMATS },
    // Usa NativeDateAdapter con locale italiano
    {
      provide: DateAdapter,
      useClass: NativeDateAdapter,
      deps: [MAT_DATE_LOCALE]
    }
  ]
};
