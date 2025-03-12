import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule, MatDrawerMode } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Componenti core
import { HeaderComponent } from './core/components/header/header.component';
import { SidenavComponent } from './core/components/sidenav/sidenav.component';
import { FooterComponent } from './core/components/footer/footer.component';

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
    FooterComponent
  ]
})
export class AppComponent {
  title = 'Agriturismo Manager';
  sidenavOpened = true;
  sidenavMode: MatDrawerMode = 'side';
  sidenavExpanded = false;

  toggleSidenav(): void {
    this.sidenavExpanded = !this.sidenavExpanded;
  }

  openSidenav(): void {
    this.sidenavExpanded = true;
  }

  closeSidenav(): void {
    this.sidenavExpanded = false;
  }
}
