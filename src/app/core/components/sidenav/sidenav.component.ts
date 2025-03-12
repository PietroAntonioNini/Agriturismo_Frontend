import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: ('admin' | 'manager' | 'staff')[];
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class SidenavComponent implements OnInit {
  @Input() compactMode = false;
  
  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard'
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

  filteredNavItems: NavItem[] = [];
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filterNavItems();
    this.authService.currentUser$.subscribe(() => {
      this.filterNavItems();
    });
  }

  private filterNavItems(): void {
    this.filteredNavItems = this.navItems.filter(item => {
      if (!item.roles) {
        return true;
      }
      
      const userRole = this.authService.getCurrentUser()?.role;
      return userRole && item.roles.includes(userRole as any);
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
