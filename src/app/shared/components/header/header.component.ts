import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription, interval } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../../shared/services/auth.service';
import { NotificationService, ActivityNotification } from '../../../shared/services/notification.service';
import { GenericApiService } from '../../../shared/services/generic-api.service';
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
  
  // Notifiche
  notifications: ActivityNotification[] = [];
  notificationsCount = 0;
  
  // App info
  appName = 'Agriturismo Manager';
  version = '1.0.0';
  
  private userSubscription: Subscription | null = null;
  private notificationsSubscription: Subscription | null = null;
  private refreshInterval: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private apiService: GenericApiService
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

    // Carica notifiche iniziali
    this.loadReadingNotifications();
    
    // Sottoscrizione alle notifiche
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
        this.notificationsCount = this.notificationService.getUnreadCount();
      }
    );

    // Refresh periodico delle letture (ogni 5 minuti)
    this.refreshInterval = interval(5 * 60 * 1000).subscribe(() => {
      this.loadReadingNotifications(false);
    });
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
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

  /**
   * Carica le notifiche sulle letture mancanti
   */
  loadReadingNotifications(forceRefresh: boolean = true): void {
    this.notificationService.checkMissingReadings(forceRefresh).subscribe({
      next: () => {
        // Le notifiche vengono aggiornate automaticamente tramite la subscription
      },
      error: (error) => {
        console.error('Errore nel caricamento delle notifiche sulle letture:', error);
      }
    });
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notificationId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.markAsRead(notificationId);
  }

  /**
   * Naviga alla pagina utility quando si clicca su una notifica di lettura
   */
  navigateToUtility(notification: ActivityNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (notification.category === 'reading' && notification.metadata?.apartmentIds?.length) {
      // Naviga alla pagina delle letture con filtro per appartamento
      this.router.navigate(['/utility/reading-form'], {
        queryParams: { 
          apartmentId: notification.metadata.apartmentIds[0] 
        }
      });
    } else {
      // Naviga alla pagina generale delle utility
      this.router.navigate(['/utility/reading-history']);
    }
  }

  /**
   * Formatta il tempo relativo (es. "10 minuti fa")
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) {
      return 'Adesso';
    } else if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
    } else if (days < 7) {
      return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
    } else {
      return new Date(timestamp).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short'
      });
    }
  }
}
