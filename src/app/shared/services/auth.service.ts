import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, delay } from 'rxjs/operators';
import { User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.createMockUser());
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/users`;
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) {
    // Per test, impostiamo subito un utente mock
    const mockUser = this.createMockUser();
    if (mockUser) {
      localStorage.setItem(this.tokenKey, 'mock_token');
      this.currentUserSubject.next(mockUser);
    }
  }

  private createMockUser(): User {
    return {
      id: 1,
      firstName: 'Admin',
      lastName: 'Utente',
      email: 'admin@agriturismo.it',
      username: 'admin',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      try {
        // In questa versione di test, usiamo sempre l'utente mock
        const user = this.createMockUser();
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error loading user from token', error);
        localStorage.removeItem(this.tokenKey);
      }
    }
  }

  login(username: string, password: string): Observable<User> {
    // Simuliamo un login di successo con ritardo artificiale
    const user = this.createMockUser();
    return of({ token: 'mock_token', user }).pipe(
      delay(800), // Delay artificiale per simulare la rete
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
        this.currentUserSubject.next(response.user);
      }),
      map(response => response.user)
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    // Per test, restituisci sempre true
    return true;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value || this.createMockUser();
  }

  hasRole(role: 'admin' | 'manager' | 'staff'): boolean {
    // Per test, l'utente mock ha ruolo admin
    return true;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // User management methods
  getAllUsers(): Observable<User[]> {
    // Restituiamo dati fittizi
    return of([this.createMockUser()]).pipe(delay(500));
  }

  getUserById(id: number): Observable<User> {
    return of(this.createMockUser()).pipe(delay(500));
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}`, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  changePassword(id: number, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/change-password`, {
      currentPassword,
      newPassword
    });
  }
}
