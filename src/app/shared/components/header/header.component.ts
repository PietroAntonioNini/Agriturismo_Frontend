import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { User } from '../../../shared/models';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  currentUser: User | null = null;
  isAdmin = false;
  
  // Dark mode
  isDarkTheme = false;
  
  // Notifiche (esempio)
  notificationsCount = 2;
  
  // App info
  appName = 'Agriturismo Manager';
  version = '1.0.0';
  
  private userSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Verifica se l'utente ha preferenze per il tema (localStorage o impostazioni)
    this.loadThemePreference();
    
    // Sottoscrizione all'utente corrente
    this.userSubscription = this.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = !!user && user.role === 'admin';
    });
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Ottiene le iniziali dell'utente
   */
  getUserInitials(user: User | null): string {
    if (!user || !user.firstName || !user.lastName) {
      return 'U';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }
  
  /**
   * Restituisce l'etichetta per il ruolo dell'utente
   */
  getUserRoleLabel(role: string): string {
    const roleMap: {[key: string]: string} = {
      'admin': 'Amministratore',
      'manager': 'Manager',
      'staff': 'Staff'
    };
    
    return roleMap[role] || 'Utente';
  }
  
  /**
   * Cambia tema tra chiaro e scuro
   */
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    
    // Aggiorna il data-theme dell'elemento root
    document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    
    // Salva la preferenza
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
  }
  
  /**
   * Carica le preferenze del tema
   */
  private loadThemePreference(): void {
    // Controlla se c'è una preferenza salvata
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkTheme = savedTheme === 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Altrimenti controlla la preferenza del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkTheme = prefersDark;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
