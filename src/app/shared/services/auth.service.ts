import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models';
import { NotificationService } from './notification.service';
import { GenericApiService } from './generic-api.service';
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationService: NotificationService,
    private apiService: GenericApiService
  ) {
  }

  // Metodo di inizializzazione chiamato dopo che HttpClient è pronto
  initialize(): void {
    // Verifica il token all'avvio dell'applicazione
    this.checkToken();
    // Richiedi un token CSRF all'avvio se l'utente è autenticato
    if (this.isLoggedIn()) {
      // Pre-carica eventuale utente salvato per evitare race-condition su interceptor
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as User;
          this.currentUserSubject.next(user);
        } catch {}
      }
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
        tap(response => {
          // Dopo aver caricato il profilo utente, salva l'utente nel localStorage
          if (this.currentUserSubject.value) {
            this.setCurrentUser(this.currentUserSubject.value);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  // Recupera l'utente dal localStorage se presente (utility in più punti)
  getUserFromStorage(): User | null {
    try {
      const s = localStorage.getItem('currentUser');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
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
    
    return this.http.post<TokenPair>(`${this.apiUrl}/auth/refresh-token`, {
      refresh_token: refreshToken
    })
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
    
    const valid = new Date().getTime() < expiresAt;
    return valid;
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

  setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Converte i dati utente da snake_case (API) a camelCase (modello User)
   */
  private mapSnakeCaseToCamelCase(apiUser: any): User {
    return {
      id: apiUser.id,
      username: apiUser.username || apiUser.user_name || '',
      email: apiUser.email || '',
      firstName: apiUser.firstName || apiUser.first_name || '',
      lastName: apiUser.lastName || apiUser.last_name || '',
      role: apiUser.role || 'staff',
      isActive: apiUser.isActive !== undefined ? apiUser.isActive : (apiUser.is_active !== undefined ? apiUser.is_active : true),
      lastLogin: apiUser.lastLogin ? new Date(apiUser.lastLogin) : (apiUser.last_login ? new Date(apiUser.last_login) : undefined),
      createdAt: apiUser.createdAt ? new Date(apiUser.createdAt) : (apiUser.created_at ? new Date(apiUser.created_at) : new Date()),
      updatedAt: apiUser.updatedAt ? new Date(apiUser.updatedAt) : (apiUser.updated_at ? new Date(apiUser.updated_at) : new Date())
    };
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
    this.http.get<any>(`${this.apiUrl}/auth/verify-token`, { headers })
      .subscribe({
        next: user => {
          // Alcuni backend non includono l'id in verify-token: fallback a /users/me
          if ((user as any)?.id === undefined || (user as any)?.id === null) {
            this.http.get<any>(`${this.apiUrl}/users/me`, { headers })
              .subscribe({
                next: me => {
                  const mappedUser = this.mapSnakeCaseToCamelCase(me);
                  this.setCurrentUser(mappedUser);
                },
                error: err => {
                  console.error('Errore nel recupero di /users/me dopo verify-token OK:', err);
                  this.setCurrentUser(user); // salva comunque il profilo parziale
                }
              });
          } else {
            const mappedUser = this.mapSnakeCaseToCamelCase(user);
            this.setCurrentUser(mappedUser);
          }
        },
        error: error => {
          console.error('Errore con verify-token, provo /users/me:', error);
          
          // Se fallisce, prova /users/me
          this.http.get<any>(`${this.apiUrl}/users/me`, { headers })
            .subscribe({
              next: user => {
                const mappedUser = this.mapSnakeCaseToCamelCase(user);
                this.setCurrentUser(mappedUser);
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
    // Rimuovi anche dati specifici dell'utente e cache in memoria
    localStorage.removeItem('currentUser');
    localStorage.removeItem('dashboard_notifications');
    try {
      this.notificationService.clearAllNotifications();
    } catch {}

    try {
      this.apiService.clearCache();
    } catch {}
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }
  
  private checkToken(): void {
    if (this.isLoggedIn()) {
      this.loadUserProfile();
    }
  }

  /**
   * Metodo pubblico per ricaricare il profilo utente
   */
  refreshUserProfile(): void {
    if (this.isLoggedIn()) {
      this.loadUserProfile();
    }
  }

  forgotPassword(username: string, email: string): Observable<any> {
    
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { username, email })
      .pipe(
        tap(response => console.log("Risposta recupero password:", response)),
        catchError(error => {
          console.error('Errore recupero password:', error);
          return throwError(() => error);
        })
      );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    
    return this.http.post(`${this.apiUrl}/auth/reset-password`, { 
      token: token, 
      new_password: newPassword 
    })
      .pipe(
        tap(response => console.log("Risposta reset password:", response)),
        catchError(error => {
          console.error('Errore reset password:', error);
          return throwError(() => error);
        })
      );
  }
}

