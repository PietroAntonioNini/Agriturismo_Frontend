import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, retryWhen, concatMap, delay } from 'rxjs/operators';

@Injectable()
export class RateLimitingInterceptor implements HttpInterceptor {
  private baseDelay = 1000; // 1 secondo
  private maxRetries = 3;
  private retryCount = new Map<string, number>();
  
  constructor() {}
  
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const requestKey = `${request.method}_${request.url}`;
    
    return next.handle(request).pipe(
      retryWhen(errors => errors.pipe(
        concatMap((error: HttpErrorResponse, count) => {
          // Gestisce solo errori 429 (Too Many Requests) e 503 (Service Unavailable)
          if ((error.status !== 429 && error.status !== 503) || count >= this.maxRetries) {
            return throwError(() => error);
          }
          
          // Incrementa il contatore per questa richiesta
          const currentRetries = this.retryCount.get(requestKey) || 0;
          this.retryCount.set(requestKey, currentRetries + 1);
          
          // Calcola il backoff esponenziale con jitter
          const exponentialDelay = this.baseDelay * Math.pow(2, count);
          const jitter = Math.random() * 0.1 * exponentialDelay; // 10% di jitter
          const finalDelay = exponentialDelay + jitter;
          
          console.log(`Rate limited (${error.status}). Retrying in ${Math.round(finalDelay)}ms (attempt ${count + 1}/${this.maxRetries})`);
          
          // Mostra un messaggio all'utente solo al primo tentativo
          if (count === 0) {
            this.showRateLimitMessage();
          }
          
          // Ritarda la richiesta successiva
          return timer(finalDelay);
        })
      )),
      catchError((error: HttpErrorResponse) => {
        // Pulisci il contatore quando la richiesta fallisce definitivamente
        const requestKey = `${request.method}_${request.url}`;
        this.retryCount.delete(requestKey);
        
        if (error.status === 429 || error.status === 503) {
          console.error(`Rate limit exceeded after ${this.maxRetries} retries`);
          this.showFinalRateLimitMessage();
        }
        
        return throwError(() => error);
      })
    );
  }
  
  private showRateLimitMessage(): void {
    // Mostra un messaggio non invasivo all'utente
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    `;
    message.textContent = 'Troppe richieste, riprova tra poco...';
    document.body.appendChild(message);
    
    // Rimuovi il messaggio dopo 3 secondi
    setTimeout(() => {
      if (message.parentNode) {
        message.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => message.remove(), 300);
      }
    }, 3000);
  }
  
  private showFinalRateLimitMessage(): void {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
    `;
    message.textContent = 'Servizio temporaneamente non disponibile. Riprova più tardi.';
    document.body.appendChild(message);
    
    // Rimuovi il messaggio dopo 5 secondi
    setTimeout(() => {
      if (message.parentNode) {
        message.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => message.remove(), 300);
      }
    }, 5000);
  }
} 