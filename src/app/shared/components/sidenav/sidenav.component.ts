import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LeaseService } from '../../services/lease.service';
import { User } from '../../models';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: ('admin' | 'manager' | 'staff')[];
  badge?: number | string; // Numero notifiche o indicatore
  exact?: boolean;
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class SidenavComponent implements OnInit, OnDestroy {
  // Elementi di navigazione
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/',
      exact: true
    },
    {
      label: 'Inquilini',
      icon: 'people',
      route: '/tenant'
    },
    {
      label: 'Appartamenti',
      icon: 'apartment',
      route: '/apartment'
    },
    {
      label: 'Contratti',
      icon: 'description',
      route: '/lease'
      // badge verrà aggiornato dinamicamente dal servizio
    },
    {
      label: 'Utenze',
      icon: 'power',
      route: '/utility'
    },
    {
      label: 'Fatturazione',
      icon: 'receipt',
      route: '/billing'
    },
    {
      label: 'Utenti',
      icon: 'admin_panel_settings',
      route: '/admin/users',
      roles: ['admin']
    },
    {
      label: 'Impostazioni',
      icon: 'settings',
      route: '/settings',
      roles: ['admin', 'manager']
    }
  ];

  // Elementi di navigazione filtrati per ruolo
  filteredNavItems: NavItem[] = [];
  
  // Stato della sidebar (sempre espansa)
  isExpanded = true;
  
  // Informazioni sull'utente
  currentUser$: Observable<User | null>;
  
  // Informazioni app
  appName = 'Agriturismo Manager';
  appVersion = '1.0.0';
  currentYear = new Date().getFullYear();
  
  private userSubscription: Subscription | null = null;
  private expiringLeasesSubscription: Subscription | null = null;
  
  constructor(
    private authService: AuthService,
    private leaseService: LeaseService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.filterNavItems();
    this.updateExpiringLeasesCount();
    
    this.userSubscription = this.authService.currentUser$.subscribe(() => {
      this.filterNavItems();
    });
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    
    if (this.expiringLeasesSubscription) {
      this.expiringLeasesSubscription.unsubscribe();
    }
  }

  /**
   * Aggiorna il conteggio dei contratti in scadenza
   */
  private updateExpiringLeasesCount(): void {
    this.expiringLeasesSubscription = this.leaseService.getExpiringLeasesCount().subscribe(count => {
      // Trova l'elemento di navigazione "Contratti"
      const leaseNavItem = this.navItems.find(item => item.route === '/lease');
      if (leaseNavItem && count > 0) {
        leaseNavItem.badge = count;
      } else if (leaseNavItem) {
        leaseNavItem.badge = undefined;
      }
      
      // Aggiorna gli elementi filtrati
      this.filterNavItems();
    });
  }

  /**
   * Filtra gli elementi del menu in base al ruolo dell'utente
   */
  private filterNavItems(): void {
    this.filteredNavItems = this.navItems.filter(item => {
      if (!item.roles) {
        return true;
      }
      
      const userRole = this.authService.getCurrentUser()?.role;
      return userRole && item.roles.includes(userRole as any);
    });
  }

  /**
   * Naviga alla route specificata
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
  
  /**
   * Effettua il logout
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
