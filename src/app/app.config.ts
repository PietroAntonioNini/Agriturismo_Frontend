import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { RateLimitingInterceptor } from './core/interceptors/rate-limiting.interceptor';
import { IdleMonitorService } from './core/services/idle-monitor.service';
import { AuthService } from './shared/services/auth.service';

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
    IdleMonitorService
  ]
};
