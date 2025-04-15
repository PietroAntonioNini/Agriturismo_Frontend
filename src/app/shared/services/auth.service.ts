import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/api`;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Verifica il token all'avvio dell'applicazione
    this.checkToken();
    // Richiedi un token CSRF all'avvio se l'utente è autenticato
    if (this.isLoggedIn()) {
      this.getCsrfToken().subscribe();
    }
  }

  login(username: string, password: string): Observable<TokenPair> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return this.http.post<TokenPair>(`${this.apiUrl}/auth/login`, formData)
      .pipe(
        map(response => {
          // Salva token
          this.storeTokens(response);
          // Carica i dati utente
          this.loadUserProfile();
          // Richiedi un nuovo token CSRF dopo il login
          this.getCsrfToken().subscribe();
          return response;
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }
  
  register(user: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, user);
  }
  
  getCsrfToken(): Observable<{csrf_token: string, expires: string}> {
    return this.http.get<{csrf_token: string, expires: string}>(`${this.apiUrl}/auth/csrf-token`)
      .pipe(
        tap(response => {
          localStorage.setItem('csrf_token', response.csrf_token);
        }),
        catchError(error => {
          console.error('Error getting CSRF token:', error);
          return throwError(() => error);
        })
      );
  }
  
  refreshToken(): Observable<TokenPair> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    
    const formData = new FormData();
    formData.append('refresh_token', refreshToken);
    
    return this.http.post<TokenPair>(`${this.apiUrl}/auth/refresh-token`, formData)
      .pipe(
        map(response => {
          this.storeTokens(response);
          this.refreshTokenSubject.next(response.accessToken);
          return response;
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }
  
  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refresh_token: refreshToken })
        .subscribe({
          next: _ => {
            console.log('Logout riuscito');
            this.clearLocalStorage();
          },
          error: error => {
            console.error('Errore durante il logout:', error);
            // Anche se il logout remoto fallisce, esegui comunque il logout locale
            this.clearLocalStorage();
          }
        });
    } else {
      this.clearLocalStorage();
    }
  }
  
  logoutAllDevices(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout-all`, {})
      .pipe(
        finalize(() => this.clearLocalStorage())
      );
  }
  
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const formData = new FormData();
    formData.append('currentPassword', currentPassword);
    formData.append('newPassword', newPassword);
    
    return this.http.put(`${this.apiUrl}/auth/change-password`, formData);
  }
  
  isLoggedIn(): boolean {
    const token = localStorage.getItem('access_token');
    const expiresAt = Number(localStorage.getItem('expires_at'));
    
    if (!token || !expiresAt) {
      return false;
    }
    
    return new Date().getTime() < expiresAt;
  }
  
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user !== null && user.role === role;
  }
  
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  private storeTokens(response: TokenPair): void {
    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('expires_at', String(new Date().getTime() + response.expiresIn * 1000));
  }
  
  private loadUserProfile(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });
    
    // Prima prova /auth/verify-token
    this.http.get<User>(`${this.apiUrl}/auth/verify-token`, { headers })
      .subscribe({
        next: user => {
          console.log('Profilo utente caricato con successo da verify-token:', user);
          this.currentUserSubject.next(user);
        },
        error: error => {
          console.error('Errore con verify-token, provo /users/me:', error);
          
          // Se fallisce, prova /users/me
          this.http.get<User>(`${this.apiUrl}/users/me`, { headers })
            .subscribe({
              next: user => {
                console.log('Profilo utente caricato con successo da /users/me:', user);
                this.currentUserSubject.next(user);
              },
              error: secondError => {
                console.error('Failed to load user profile from both endpoints', secondError);
                if (secondError.status === 401) {
                  this.refreshToken().subscribe();
                }
              }
            });
        }
      });
  }
  
  private clearLocalStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('csrf_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }
  
  private checkToken(): void {
    if (this.isLoggedIn()) {
      this.loadUserProfile();
    }
  }

  forgotPassword(username: string, email: string): Observable<any> {
    // Inizia provando con FormData
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    
    console.log("Inviando recupero password con FormData:", { username, email });
    
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, formData)
      .pipe(
        tap(response => console.log("Risposta recupero password:", response)),
        catchError(error => {
          console.error('Errore con FormData:', error);
          
          // Se fallisce con FormData, prova con JSON
          console.log("Riprovo con JSON");
          return this.http.post(`${this.apiUrl}/auth/forgot-password`, { username, email })
            .pipe(
              tap(response => console.log("Risposta recupero password (JSON):", response)),
              catchError(jsonError => {
                console.error('Errore anche con JSON:', jsonError);
                return throwError(() => jsonError);
              })
            );
        })
      );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    // Inizia provando con FormData
    const formData = new FormData();
    formData.append('token', token);
    formData.append('new_password', newPassword);
    
    console.log("Inviando reset password con FormData");
    
    return this.http.post(`${this.apiUrl}/auth/reset-password`, formData)
      .pipe(
        tap(response => console.log("Risposta reset password:", response)),
        catchError(error => {
          console.error('Errore con FormData:', error);
          
          // Se fallisce con FormData, prova con JSON
          console.log("Riprovo con JSON");
          return this.http.post(`${this.apiUrl}/auth/reset-password`, { 
            token: token, 
            new_password: newPassword 
          })
            .pipe(
              tap(response => console.log("Risposta reset password (JSON):", response)),
              catchError(jsonError => {
                console.error('Errore anche con JSON:', jsonError);
                return throwError(() => jsonError);
              })
            );
        })
      );
  }
}

