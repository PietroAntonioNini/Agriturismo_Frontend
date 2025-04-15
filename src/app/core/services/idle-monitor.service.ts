import { Injectable } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { filter, throttleTime } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleMonitorService {
  private idle$ = new Subject<boolean>();
  private idleTimeout = 15 * 60 * 1000; // 15 minuti di inattività
  private idleTimer: any;
  
  constructor(private authService: AuthService) {
    // Monitoraggio eventi utente
    fromEvent(document, 'mousemove').pipe(
      throttleTime(1000)
    ).subscribe(() => this.resetIdleTimer());
    
    fromEvent(document, 'keypress').subscribe(() => this.resetIdleTimer());
    
    fromEvent(document, 'click').subscribe(() => this.resetIdleTimer());
    
    fromEvent(document, 'scroll').pipe(
      throttleTime(1000)
    ).subscribe(() => this.resetIdleTimer());
    
    this.idle$.pipe(
      filter(idle => idle === true)
    ).subscribe(() => {
      console.log('Sessione scaduta per inattività');
      // Logout automatico dopo inattività
      this.authService.logout();
      alert('La tua sessione è scaduta per inattività.');
    });
    
    // Inizializza timer
    this.resetIdleTimer();
  }
  
  private resetIdleTimer(): void {
    if (!this.authService.isLoggedIn()) {
      return; // Non monitorare se l'utente non è loggato
    }
    
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idle$.next(true);
    }, this.idleTimeout);
  }
  
  // Metodo per impostare un timeout personalizzato
  setIdleTimeout(minutes: number): void {
    this.idleTimeout = minutes * 60 * 1000;
    this.resetIdleTimer();
  }
} 