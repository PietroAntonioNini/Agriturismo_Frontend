import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { TenantService } from '../../../shared/services/tenant.service';
import { ApartmentService } from '../../../shared/services/apartment.service';
import { LeaseService } from '../../../shared/services/lease.service';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    RouterModule
  ]
})
export class DashboardComponent implements OnInit {
  // Statistiche
  totalTenants = 0;
  totalApartments = 0;
  occupiedApartments = 0;
  availableApartments = 0;
  activeLeases = 0;
  expiringLeases = 0;
  unpaidInvoices = 0;
  overdueInvoices = 0;
  
  // Stato di caricamento
  isLoading = true;
  hasError = false;
  errorMessage = '';

  constructor(
    private tenantService: TenantService,
    private apartmentService: ApartmentService,
    private leaseService: LeaseService,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    forkJoin({
      tenants: this.tenantService.getAllTenants(),
      apartments: this.apartmentService.getAllApartments(),
      activeLeases: this.leaseService.getActiveLeases(),
      expiringLeases: this.leaseService.getExpiringSoonLeases(),
      unpaidInvoices: this.invoiceService.getUnpaidInvoices(),
      overdueInvoices: this.invoiceService.getOverdueInvoices()
    }).subscribe({
      next: (data) => {
        this.totalTenants = data.tenants.length;
        this.totalApartments = data.apartments.length;
        this.availableApartments = data.apartments.filter(apt => apt.isAvailable).length;
        this.occupiedApartments = this.totalApartments - this.availableApartments;
        this.activeLeases = data.activeLeases.length;
        this.expiringLeases = data.expiringLeases.length;
        this.unpaidInvoices = data.unpaidInvoices.length;
        this.overdueInvoices = data.overdueInvoices.length;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati della dashboard.';
        console.error('Dashboard loading error:', error);
      }
    });
  }
}
