import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';

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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

// Services
import { GenericApiService } from '../../../shared/services/generic-api.service';

// Models
import { Lease } from '../../../shared/models/lease.model';
import { Tenant } from '../../../shared/models';
import { Apartment } from '../../../shared/models';

@Component({
  selector: 'app-lease-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
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
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './lease-list.component.html',
  styleUrls: ['./lease-list.component.scss']
})
export class LeaseListComponent implements OnInit {
  // Visualizzazione e colonne
  displayedColumns: string[] = ['id', 'tenant', 'apartment', 'dates', 'rent', 'status', 'actions'];
  dataSource = new MatTableDataSource<Lease>([]);
  viewMode: 'grid' | 'list' = 'grid';
  
  // Stati dell'interfaccia
  isLoading = true;
  errorMessage: string | null = null;
  searchText = '';
  
  // Proprietà per la paginazione
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  paginationStart: number = 1;
  paginationEnd: number = 0;
  
  // Filtri
  statusFilter = new FormControl('');
  tenantFilter = new FormControl('');
  apartmentFilter = new FormControl('');
  activeFilters: string[] = [];
  
  // Dati
  tenants: Tenant[] = [];
  apartments: Apartment[] = [];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLeases();
    this.loadTenants();
    this.loadApartments();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Aggiorna la paginazione quando cambia
    if (this.paginator) {
      this.paginator.page.subscribe(() => this.updatePaginationLabels());
    }
  }

  loadLeases(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getAll<Lease>('leases').subscribe({
      next: (leases) => {
        this.dataSource.data = leases;
        this.updatePaginationLabels();
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
    this.apiService.getAll<Tenant>('tenants').subscribe({
      next: (tenants) => {
        this.tenants = tenants;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
      }
    });
  }
  
  loadApartments(): void {
    this.apiService.getAll<Apartment>('apartments').subscribe({
      next: (apartments) => {
        this.apartments = apartments;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli appartamenti', error);
      }
    });
  }

  // Metodi per i filtri
  applyTextFilter(): void {
    this.dataSource.filter = this.searchText.trim().toLowerCase();
    this.updatePaginationLabels();
  }
  
  toggleStatusFilter(status: string): void {
    const index = this.activeFilters.indexOf(status);
    if (index > -1) {
      this.activeFilters.splice(index, 1);
    } else {
      this.activeFilters.push(status);
    }
    this.applyFilters();
  }
  
  isFilterActive(filterName: string): boolean {
    return this.activeFilters.includes(filterName);
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (data: Lease, filter: string) => {
      // Filtro testuale
      const searchMatch = !this.searchText || 
        data.id.toString().includes(this.searchText.toLowerCase()) || 
        this.getTenantName(data.tenantId).toLowerCase().includes(this.searchText.toLowerCase()) ||
        this.getApartmentName(data.apartmentId).toLowerCase().includes(this.searchText.toLowerCase());
      
      // Filtro stato
      let statusMatch = true;
      if (this.activeFilters.length > 0) {
        statusMatch = false;
        
        if (this.activeFilters.includes('active') && data.isActive) {
          statusMatch = true;
        }
        
        if (this.activeFilters.includes('inactive') && !data.isActive) {
          statusMatch = true;
        }
        
        if (this.activeFilters.includes('expiring') && this.isExpiringLease(data)) {
          statusMatch = true;
        }
      }
      
      return searchMatch && statusMatch;
    };
    
    // Trigger filter
    this.dataSource.filter = ' '; // Un carattere qualsiasi per attivare il filtro
    this.updatePaginationLabels();
  }

  resetFilters(): void {
    this.searchText = '';
    this.activeFilters = [];
    this.dataSource.filter = '';
    this.updatePaginationLabels();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters();
    }
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.applyTextFilter();
  }
  
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // Helper methods
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
  
  // Nuovi metodi per manipolare le date
  getMonthName(dateString: Date | string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months[date.getMonth()];
  }
  
  getDayFromDate(dateString: Date | string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getDate().toString();
  }
  
  isExpiringLease(lease: Lease): boolean {
    if (!lease.endDate || !lease.isActive) return false;
    
    const endDate = new Date(lease.endDate);
    const today = new Date();
    const monthsUntilExpiry = (endDate.getFullYear() - today.getFullYear()) * 12 + 
                              (endDate.getMonth() - today.getMonth());
    
    // Considera "in scadenza" se mancano meno di 3 mesi
    return monthsUntilExpiry <= 3 && monthsUntilExpiry >= 0;
  }
  
  updatePaginationLabels(): void {
    if (!this.paginator) return;
    
    const pageSize = this.paginator.pageSize;
    const pageIndex = this.paginator.pageIndex;
    const length = this.dataSource.filteredData.length;
    
    this.paginationStart = length === 0 ? 0 : pageIndex * pageSize + 1;
    this.paginationEnd = Math.min((pageIndex + 1) * pageSize, length);
  }
  
  deleteLease(id: number): void {
    if (confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
      this.apiService.delete('leases', id).subscribe({
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