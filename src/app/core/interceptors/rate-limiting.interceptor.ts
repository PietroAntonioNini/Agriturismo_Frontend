import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, retry } from 'rxjs/operators';

@Injectable()
export class RateLimitingInterceptor implements HttpInterceptor {
  private retryDelay = 1000; // 1 secondo
  private maxRetries = 3;
  
  constructor() {}
  
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 429) {
          // Calcola il tempo di attesa dal header Retry-After se presente
          let delayTime = this.retryDelay;
          if (error.headers.has('Retry-After')) {
            const retryAfter = error.headers.get('Retry-After');
            delayTime = Number(retryAfter) * 1000 || this.retryDelay;
          }
          
          console.log(`Rate limited. Retrying after ${delayTime}ms`);
          
          // Ritorna un observable che emette dopo il ritardo e poi riprova la richiesta
          return timer(delayTime).pipe(
            mergeMap(() => next.handle(request))
          );
        }
        
        return throwError(() => error);
      })
    );
  }
} 