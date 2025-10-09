import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';
import { PerformanceMonitorService } from '../../shared/services/performance-monitor.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private performanceMonitor: PerformanceMonitorService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const startTime = Date.now();

    // Aggiungi JWT token a tutte le richieste (tranne login e refresh)
    if (!request.url.includes('/auth/login') && !request.url.includes('/auth/refresh-token')) {
      request = this.addAuthToken(request);
    }

    // Aggiungi CSRF token a tutte le richieste di modifica (POST/PUT/DELETE/PATCH)
    if (this.requiresCsrfToken(request.method)) {
      request = this.addCsrfToken(request);
    }

    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        // Registra la performance solo per le risposte HTTP complete
        if (event.type === 4) { // HttpEventType.Response
          const duration = Date.now() - startTime;
          const response = event as any;
          this.performanceMonitor.recordApiCall(
            request.url,
            request.method,
            duration,
            response.status,
            response.status >= 200 && response.status < 300
          );
        }
      }),
      catchError(error => {
        // Registra anche gli errori
        const duration = Date.now() - startTime;
        this.performanceMonitor.recordApiCall(
          request.url,
          request.method,
          duration,
          error.status || 0,
          false
        );
        
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            // Gestione errore 401 (Unauthorized)
            return this.handle401Error(request, next);
          } else if (error.status === 403 && error.error?.detail?.includes('CSRF')) {
            // Gestione errore CSRF
            return this.handleCsrfError(request, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private addAuthToken(request: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Controlla se il token è vicino alla scadenza
      const expiresAt = Number(localStorage.getItem('expires_at'));
      const isExpiringSoon = expiresAt - 60000 < new Date().getTime(); // 1 minuto prima della scadenza
      
      if (isExpiringSoon && !this.isRefreshing) {
        // Avvia refresh in background
        this.refreshToken();
      }
      
      return request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return request;
  }

  private addCsrfToken(request: HttpRequest<any>): HttpRequest<any> {
    const csrfToken = localStorage.getItem('csrf_token');
    
    if (csrfToken) {
      return request.clone({
        setHeaders: { 'X-CSRF-Token': csrfToken }
      });
    }
    return request;
  }

  private requiresCsrfToken(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  }

  private handleCsrfError(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Richiedi un nuovo token CSRF e riprova la richiesta
    return this.authService.getCsrfToken().pipe(
      switchMap(token => {
        return next.handle(this.addCsrfToken(request));
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap(token => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token.accessToken);
          return next.handle(this.addAuthToken(request));
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => error);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => next.handle(this.addAuthToken(request)))
      );
    }
  }
  
  private refreshToken() {
    this.authService.refreshToken().subscribe();
  }
}