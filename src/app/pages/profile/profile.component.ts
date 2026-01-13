import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { User } from '../../shared/models';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  currentUser: User | null = null;
  isLoading = false;
  isEditing = false;
  errorMessage: string | null = null;
  
  profileForm: FormGroup;
  private userSubscription: Subscription | null = null;
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {
    this.currentUser$ = this.authService.currentUser$;
    
    this.profileForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Verifica se l'utente è loggato
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Ricarica il profilo per assicurarsi di avere i dati più aggiornati
    this.isLoading = true;
    this.authService.refreshUserProfile();

    // Sottoscrizione all'utente corrente
    this.userSubscription = this.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserData(user);
        this.isLoading = false;
      } else {
        // Se non c'è utente, prova a caricarlo dal localStorage
        const storedUser = this.authService.getUserFromStorage();
        if (storedUser) {
          this.currentUser = storedUser;
          this.loadUserData(storedUser);
          this.isLoading = false;
        } else {
          this.isLoading = false;
          this.errorMessage = 'Impossibile caricare i dati del profilo';
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadUserData(user: User): void {
    this.profileForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    });
    this.isLoading = false;
  }

  getUserInitials(user: User | null): string {
    if (!user || !user.firstName || !user.lastName) {
      return 'U';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getUserRoleLabel(role: string): string {
    const roleMap: {[key: string]: string} = {
      'admin': 'Amministratore',
      'manager': 'Manager',
      'staff': 'Staff'
    };
    return roleMap[role] || 'Utente';
  }

  getRoleColor(role: string): string {
    const colorMap: {[key: string]: string} = {
      'admin': 'warn',
      'manager': 'primary',
      'staff': 'accent'
    };
    return colorMap[role] || 'primary';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch {
      return 'N/A';
    }
  }

  toggleEdit(): void {
    if (this.isEditing) {
      // Annulla modifiche
      if (this.currentUser) {
        this.loadUserData(this.currentUser);
      }
    }
    this.isEditing = !this.isEditing;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    if (!this.currentUser) {
      this.snackBar.open('Errore: utente non trovato', 'Chiudi', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.profileForm.value;
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    // Prova ad aggiornare il profilo tramite API
    // Il backend si aspetta snake_case
    this.http.put<any>(`${this.apiUrl}/users/me`, {
      first_name: formValue.firstName,
      last_name: formValue.lastName,
      email: formValue.email
    }, { headers }).subscribe({
      next: (updatedUser) => {
        // Mappa la risposta da snake_case a camelCase
        const mappedUser = this.mapSnakeCaseToCamelCase(updatedUser);
        this.authService.setCurrentUser(mappedUser);
        this.currentUser = mappedUser;
        this.isEditing = false;
        this.isLoading = false;
        this.snackBar.open('Profilo aggiornato con successo!', 'Chiudi', { duration: 3000 });
      },
      error: (error) => {
        console.error('Errore aggiornamento profilo:', error);
        this.isLoading = false;
        const errorMsg = error.error?.detail || error.error?.message || 'Errore durante l\'aggiornamento del profilo';
        this.snackBar.open(errorMsg, 'Chiudi', { duration: 5000 });
      }
    });
  }

  navigateToChangePassword(): void {
    this.router.navigate(['/auth/change-password']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get f() {
    return this.profileForm.controls;
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
}

