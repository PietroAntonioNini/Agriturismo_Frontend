import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { TenantDetailDialogComponent } from '../tenant-detail/tenant-detail-dialog.component';
import { TenantFormComponent } from '../tenant-form/tenant-form-dialog.component';

interface Tenant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  documentExpiry?: Date;
  status?: string;
  // Altre proprietà dell'inquilino
}

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  // Proprietà per la visualizzazione dati
  tenants: Tenant[] = [];
  filteredTenants: Tenant[] = [];
  displayedColumns: string[] = ['avatar', 'name', 'contact', 'document', 'actions'];
  searchQuery: string = '';
  isLoading: boolean = true;
  errorMessage: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  
  // Proprietà per la paginazione
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  paginationStart: number = 1;
  paginationEnd: number = 0;
  
  // Filtri attivi
  activeFilters: string[] = [];

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  // Carica gli inquilini dall'API
  loadTenants(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getAll<Tenant>('tenants').subscribe({
      next: (tenants) => {
        this.tenants = tenants;
        this.applyFilter(); // Applica eventuali filtri già impostati
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento degli inquilini. Riprova più tardi.';
        this.isLoading = false;
      }
    });
  }

  // Applica filtri e ricerca
  applyFilter(): void {
    let filtered = [...this.tenants];
    
    // Applica filtro di ricerca
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(tenant => 
        tenant.firstName.toLowerCase().includes(query) ||
        tenant.lastName.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.phone.includes(query) ||
        tenant.documentNumber.toLowerCase().includes(query)
      );
    }
    
    // Applica filtri attivi
    if (this.activeFilters.length > 0) {
      filtered = filtered.filter(tenant => {
        if (this.activeFilters.includes('expired') && this.isDocumentExpired(tenant)) {
          return true;
        }
        
        if (this.activeFilters.includes('active') && tenant.status === 'active') {
          return true;
        }
        
        if (this.activeFilters.includes('pending') && tenant.status === 'pending') {
          return true;
        }
        
        return this.activeFilters.length === 0;
      });
    }
    
    this.updatePagination(filtered);
  }

  // Aggiorna paginazione
  updatePagination(filteredData: Tenant[]): void {
    this.totalPages = Math.max(1, Math.ceil(filteredData.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, filteredData.length);
    
    this.paginationStart = filteredData.length > 0 ? startIndex + 1 : 0;
    this.paginationEnd = endIndex;
    
    this.filteredTenants = filteredData.slice(startIndex, endIndex);
  }

  // Cambia pagina
  changePage(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  // Pulisci ricerca
  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  // Imposta modalità di visualizzazione
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // Aggiorna filtri attivi
  updateFilters(): void {
    // Questa funzione riceverà i cambiamenti dai chip di filtro
    // e aggiornerà l'array activeFilters
    this.applyFilter();
  }

  // Controlla se il documento è scaduto
  isDocumentExpired(tenant: Tenant): boolean {
    if (!tenant.documentExpiry) return false;
    
    const expiryDate = new Date(tenant.documentExpiry);
    const today = new Date();
    
    return expiryDate < today;
  }

  // Ottieni le iniziali dell'inquilino
  getTenantInitials(tenant: Tenant): string {
    return `${tenant.firstName.charAt(0)}${tenant.lastName.charAt(0)}`.toUpperCase();
  }

  // Ottieni classe CSS dello stato dell'inquilino
  getTenantStatusClass(tenant: Tenant): string {
    if (this.isDocumentExpired(tenant)) return 'status-expired';
    
    switch (tenant.status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  }

  // Ottieni etichetta dello stato dell'inquilino
  getTenantStatusLabel(tenant: Tenant): string {
    if (this.isDocumentExpired(tenant)) return 'Documento Scaduto';
    
    switch (tenant.status) {
      case 'active':
        return 'Attivo';
      case 'pending':
        return 'In Attesa';
      default:
        return 'Stato Sconosciuto';
    }
  }

  // Azioni dell'interfaccia
  viewTenantDetails(tenantId: number): void {
    this.dialog.open(TenantDetailDialogComponent, {
      data: { tenantId },
      width: '800px',
      maxHeight: '90vh'
    });
  }

  editTenant(tenantId: number): void {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      data: { tenantId },
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadTenants();
      }
    });
  }

  openTenantForm(): void {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadTenants();
      }
    });
  }

  deleteTenant(tenant: Tenant): void {
    this.confirmationService.confirmDelete('l\'inquilino', `${tenant.firstName} ${tenant.lastName}`)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('tenants', tenant.id).subscribe({
            next: () => {
              this.loadTenants();
              this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
                duration: 3000
              });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione dell\'inquilino', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'inquilino', 'Chiudi', {
                duration: 3000
              });
            }
          });
        }
      });
  }
}