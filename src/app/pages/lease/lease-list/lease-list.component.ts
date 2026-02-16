import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { LeaseService } from '../../../shared/services/lease.service';
import { Lease } from '../../../shared/models/lease.model';
import { Tenant } from '../../../shared/models';
import { Apartment } from '../../../shared/models';
import { LeasesDataSource } from './leases-datasource';

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
export class LeaseListComponent implements OnInit, AfterViewInit {
  // Visualizzazione e colonne
  displayedColumns: string[] = ['id', 'tenant', 'apartment', 'dates', 'rent', 'status', 'actions'];
  dataSource = new LeasesDataSource();
  viewMode: 'grid' | 'list' = 'grid';

  // Paginazione e ordinamento
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Stato componente
  isLoading = false;
  errorMessage: string | null = null;
  searchText = '';
  selectedStatus: string[] = [];
  
  // Proprietà per la paginazione
  paginationStart: number = 1;
  paginationEnd: number = 0;
  currentPage: number = 1;
  totalPages: number = 1;
  
  // Cache per nomi di inquilini e appartamenti
  private tenantNames: { [id: number]: string } = {};
  private apartmentNames: { [id: number]: string } = {};

  constructor(
    private apiService: GenericApiService,
    private leaseService: LeaseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.handleQueryParams();
  }

  ngAfterViewInit(): void {
    if (this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  /**
   * Cambia la modalità di visualizzazione (griglia/lista)
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }
  
  /**
   * Imposta la modalità di visualizzazione
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  /**
   * Gestisce i query parameters per attivare filtri automaticamente
   */
  private handleQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        const filter = params['filter'];
        if (filter === 'expiring') {
          this.selectedStatus = ['expiring'];
          // Applica il filtro quando i dati sono disponibili
          this.applyFiltersWhenDataReady();
        }
      }
    });
  }

  /**
   * Applica i filtri quando i dati sono pronti
   */
  private applyFiltersWhenDataReady(): void {
    // Controlla se i dati sono già caricati
    if (this.dataSource.data.length > 0) {
      this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
    } else {
      // Se i dati non sono ancora caricati, riprovare dopo un breve intervallo
      const checkDataInterval = setInterval(() => {
        if (this.dataSource.data.length > 0) {
          this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
          clearInterval(checkDataInterval);
        }
      }, 50);
      
      // Timeout di sicurezza per evitare loop infiniti
      setTimeout(() => {
        clearInterval(checkDataInterval);
      }, 5000);
    }
  }

  /**
   * Carica tutti i dati iniziali in parallelo per massima efficienza.
   */
  loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    Promise.all([
      this.leaseService.getAllLeasesSortedByExpiration().toPromise(),
      this.apiService.getAll<Tenant>('tenants').toPromise(),
      this.apiService.getAll<Apartment>('apartments').toPromise()
    ]).then(([leases, tenants, apartments]) => {
      // Popola le cache dei nomi
      if (tenants) {
        tenants.forEach(tenant => {
          this.tenantNames[tenant.id] = `${tenant.firstName} ${tenant.lastName}`;
        });
      }
      if (apartments) {
        apartments.forEach(apartment => {
          this.apartmentNames[apartment.id] = apartment.name || `Appartamento #${apartment.id}`;
        });
      }

      // Imposta i dati della tabella
      this.dataSource.data = leases || [];
      this.dataSource.filteredData = leases || [];
      this.updatePaginationLabels();
      
      // Applica filtri se presenti nei query parameters
      if (this.selectedStatus.length > 0) {
        this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
      }
      
    }).catch(error => {
      console.error('Errore durante il caricamento dei dati iniziali', error);
      this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati.';
    }).finally(() => {
      this.isLoading = false;
    });
  }

  /**
   * Restituisce il nome dell'inquilino dato l'ID
   */
  getTenantName(id: number): string {
    return this.tenantNames[id] || `Inquilino #${id}`;
  }

  /**
   * Restituisce il nome dell'appartamento dato l'ID
   */
  getApartmentName(id: number): string {
    return this.apartmentNames[id] || `Appartamento #${id}`;
  }

  /**
   * Aggiorna le etichette di paginazione
   */
  updatePaginationLabels(): void {
    if (this.paginator) {
      this.paginator._intl.itemsPerPageLabel = 'Elementi per pagina:';
      this.paginator._intl.nextPageLabel = 'Pagina successiva';
      this.paginator._intl.previousPageLabel = 'Pagina precedente';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
        if (length === 0 || pageSize === 0) {
          return `0 di ${length}`;
        }
        length = Math.max(length, 0);
        const startIndex = page * pageSize;
        const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
        this.paginationStart = startIndex + 1;
        this.paginationEnd = endIndex;
        this.currentPage = page + 1;
        this.totalPages = Math.ceil(length / pageSize);
        return `${startIndex + 1} - ${endIndex} di ${length}`;
      };
    }
  }

  /**
   * Applica il filtro di testo
   */
  applyTextFilter(): void {
    this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
  }

  /**
   * Verifica se un filtro di stato è selezionato (per le pill: un solo stato attivo alla volta)
   */
  isStatusFilter(value: 'all' | 'active' | 'inactive' | 'expiring'): boolean {
    if (value === 'all') return this.selectedStatus.length === 0;
    return this.selectedStatus.includes(value);
  }

  /**
   * Imposta il filtro di stato (singola selezione, stile fatture)
   */
  setStatusFilter(value: 'all' | 'active' | 'inactive' | 'expiring'): void {
    this.selectedStatus = value === 'all' ? [] : [value];
    this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
  }

  /** @deprecated Usare isStatusFilter + setStatusFilter */
  isFilterActive(status: string): boolean {
    return this.selectedStatus.includes(status);
  }

  /** @deprecated Usare setStatusFilter per comportamento a pill singola */
  toggleStatusFilter(status: string): void {
    const index = this.selectedStatus.indexOf(status);
    if (index === -1) {
      this.selectedStatus.push(status);
    } else {
      this.selectedStatus.splice(index, 1);
    }
    this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
  }

  /**
   * Resetta tutti i filtri
   */
  resetFilters(): void {
    this.searchText = '';
    this.selectedStatus = [];
    this.dataSource.resetFilters();
  }

  /**
   * Pulisce il campo di ricerca
   */
  clearSearch(): void {
    this.searchText = '';
    this.dataSource.applyFilters(this.searchText, this.selectedStatus, this.tenantNames, this.apartmentNames);
  }

  /**
   * Cambia pagina
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && this.paginator) {
      const pageIndex = page - 1;
      this.paginator.pageIndex = pageIndex;
      this.paginator.page.emit({
        pageIndex,
        pageSize: this.paginator.pageSize,
        length: this.dataSource.filteredData.length
      });
    }
  }

  /**
   * Restituisce la classe CSS per lo stato del contratto
   */
  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  /**
   * Restituisce l'etichetta per lo stato del contratto
   */
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Attivo' : 'Terminato';
  }

  /**
   * Formatta una data in formato italiano
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }

  /**
   * Ottiene il nome del mese dalla data
   */
  getMonthName(dateString: Date | string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months[date.getMonth()];
  }

  /**
   * Ottiene il giorno dalla data
   */
  getDayFromDate(dateString: Date | string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getDate().toString();
  }

  /**
   * Elimina un contratto
   */
  deleteLease(id: number): void {
    if (confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
      this.apiService.delete('leases', id).subscribe({
        next: () => {
          this.snackBar.open('Contratto eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.loadInitialData(); // Reload all data after deletion
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