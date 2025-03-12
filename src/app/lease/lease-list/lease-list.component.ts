import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

// Material Imports
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { LeaseService } from '../../shared/services/lease.service';
import { TenantService } from '../../shared/services/tenant.service';
import { ApartmentService } from '../../shared/services/apartment.service';

// Models
import { Lease } from '../../shared/models/lease.model';
import { Tenant } from '../../shared/models';
import { Apartment } from '../../shared/models';

@Component({
  selector: 'app-lease-list',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './lease-list.component.html',
  styleUrls: ['./lease-list.component.scss']
})
export class LeaseListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'tenant', 'apartment', 'startDate', 'endDate', 'monthlyRent', 'status', 'actions'];
  dataSource = new MatTableDataSource<Lease>([]);
  isLoading = true;
  errorMessage: string | null = null;
  
  // Filtri
  statusFilter = new FormControl('');
  tenantFilter = new FormControl('');
  apartmentFilter = new FormControl('');
  
  tenants: Tenant[] = [];
  apartments: Apartment[] = [];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private leaseService: LeaseService,
    private tenantService: TenantService,
    private apartmentService: ApartmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLeases();
    this.loadTenants();
    this.loadApartments();
    
    // Configurazione dei filtri
    this.statusFilter.valueChanges.subscribe(() => this.applyFilters());
    this.tenantFilter.valueChanges.subscribe(() => this.applyFilters());
    this.apartmentFilter.valueChanges.subscribe(() => this.applyFilters());
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadLeases(): void {
    this.isLoading = true;
    this.leaseService.getLeases().subscribe({
      next: (leases) => {
        this.dataSource.data = leases;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei contratti.';
        this.isLoading = false;
      }
    });
  }
  
  loadTenants(): void {
    this.tenantService.getTenants().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
      }
    });
  }
  
  loadApartments(): void {
    this.apartmentService.getApartments().subscribe({
      next: (apartments) => {
        this.apartments = apartments;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
      }
    });
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (data: Lease, filter: string) => {
      const statusMatch = !this.statusFilter.value || data.isActive === (this.statusFilter.value === 'active');
      const tenantMatch = !this.tenantFilter.value || data.tenantId === Number(this.tenantFilter.value);
      const apartmentMatch = !this.apartmentFilter.value || data.apartmentId === Number(this.apartmentFilter.value);
      
      return statusMatch && tenantMatch && apartmentMatch;
    };
    
    // Trigger filter
    this.dataSource.filter = 'filtered';
  }

  resetFilters(): void {
    this.statusFilter.setValue('');
    this.tenantFilter.setValue('');
    this.apartmentFilter.setValue('');
    this.dataSource.filter = '';
  }

  getTenantName(tenantId: number): string {
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : 'N/D';
  }
  
  getApartmentName(apartmentId: number): string {
    const apartment = this.apartments.find(a => a.id === apartmentId);
    return apartment ? apartment.name : 'N/D';
  }
  
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Attivo' : 'Terminato';
  }
  
  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }
  
  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }
  
  deleteLease(id: number): void {
    if (confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
      this.leaseService.deleteLease(id).subscribe({
        next: () => {
          this.snackBar.open('Contratto eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.loadLeases();
        },
        error: (error) => {
          console.error('Errore durante l\'eliminazione del contratto', error);
          this.snackBar.open('Si è verificato un errore durante l\'eliminazione del contratto', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        }
      });
    }
  }
}