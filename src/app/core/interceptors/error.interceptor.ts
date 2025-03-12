import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../shared/services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Si è verificato un errore sconosciuto';
        
        if (error.error instanceof ErrorEvent) {
          // Errore client-side
          errorMessage = `Errore: ${error.error.message}`;
        } else {
          // Errore server-side
          switch (error.status) {
            case 401:
              errorMessage = 'Non sei autorizzato ad accedere a questa risorsa';
              this.authService.logout();
              break;
            case 403:
              errorMessage = 'Non hai i permessi necessari per accedere a questa risorsa';
              break;
            case 404:
              errorMessage = 'Risorsa non trovata';
              break;
            case 500:
              errorMessage = 'Errore interno del server';
              break;
            default:
              errorMessage = `Errore ${error.status}: ${error.error.message || error.statusText}`;
          }
        }
        
        this.snackBar.open(errorMessage, 'Chiudi', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        
        return throwError(() => error);
      })
    );
  }
} 