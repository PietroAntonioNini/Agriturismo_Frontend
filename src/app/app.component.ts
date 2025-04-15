import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { filter } from 'rxjs/operators';

// Componenti core
import { HeaderComponent } from './shared/components/header/header.component';
import { SidenavComponent } from './shared/components/sidenav/sidenav.component';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    HeaderComponent,
    SidenavComponent,
  ]
})
export class AppComponent {
  title = 'Agriturismo Manager';
  isAuthPage = false;

  constructor(private router: Router, private authService: AuthService) {
    // Monitoraggio delle navigazioni per identificare le pagine di autenticazione
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isAuthPage = event.url.includes('/auth');
    });
  }

  showNavigation(): boolean {
    return !this.isAuthPage && this.authService.isLoggedIn();
  }
}
