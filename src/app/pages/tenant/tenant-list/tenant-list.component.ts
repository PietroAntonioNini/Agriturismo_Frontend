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
import { MatChipListboxChange } from '@angular/material/chips';
import { MatChipOption } from '@angular/material/chips';
import { MatChipListbox } from '@angular/material/chips';
import { combineLatest, timeout } from 'rxjs';

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
  hasLease?: boolean;
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
  displayedColumns: string[] = ['avatar', 'name', 'contact', 'document', 'lease', 'actions'];
  searchQuery: string = '';
  isLoading: boolean = true;
  errorMessage: string | null = null;
  viewMode: 'grid' | 'list' = 'list';
  
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

  // Carica gli inquilini dall'API con ottimizzazioni
  loadTenants(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Usa i metodi standard ora che il backend ha risolto il problema cache
    const tenantsRequest = this.apiService.getAll<Tenant>('tenants');
    const leasesRequest = this.apiService.getAll<any>('leases', { status: 'active' });

    // Combina le due richieste con timeout
    const timeoutMs = 30000; // 30 secondi di timeout
    
    const tenantsWithTimeout = tenantsRequest.pipe(
      // Aggiungi timeout per evitare attese infinite
      timeout(timeoutMs)
    );
    
    const leasesWithTimeout = leasesRequest.pipe(
      timeout(timeoutMs)
    );

    // Esegui le chiamate in parallelo
    combineLatest([tenantsWithTimeout, leasesWithTimeout]).subscribe({
      next: ([tenants, activeLeases]) => {
        if (!tenants) tenants = [];
        if (!activeLeases) activeLeases = [];

        // Ottimizzazione: usa Map invece di Set per lookup più efficiente
        const tenantIdsWithActiveLease = new Map();
        activeLeases.forEach(lease => {
          tenantIdsWithActiveLease.set(lease.tenantId, true);
        });

        // Mappa lo stato del contratto a ogni inquilino
        this.tenants = tenants.map(tenant => ({
          ...tenant,
          hasLease: tenantIdsWithActiveLease.has(tenant.id)
        }));

        this.applyFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei dati', error);
        this.errorMessage = 'Si è verificato un errore. Riprova più tardi.';
        this.isLoading = false;
        this.tenants = [];
        this.filteredTenants = [];
      }
    });
  }

  // Applica filtri e ricerca
  applyFilter(): void {
    let filtered = [...this.tenants];
    
    // Applica filtri Ricerca
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(tenant => 
        tenant.firstName.toLowerCase().includes(query) ||
        tenant.lastName.toLowerCase().includes(query) ||
        tenant.email?.toLowerCase().includes(query) || // Aggiunto il controllo di null/undefined
        tenant.phone?.includes(query) || // Aggiunto il controllo di null/undefined
        tenant.documentNumber?.toLowerCase().includes(query) // Aggiunto il controllo di null/undefined
      );
    }
    
    // Applica filtri per stato contratto
    if (this.activeFilters.length > 0) {
      filtered = filtered.filter(tenant => {
        if (this.activeFilters.includes('with_lease') && tenant.hasLease) {
          return true;
        }
        if (this.activeFilters.includes('without_lease') && !tenant.hasLease) {
          return true;
        }
        return false;
      });
    }
    
    // Aggiorna paginazione con i risultati filtrati
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

  isStatusFilter(value: 'all' | 'with_lease' | 'without_lease'): boolean {
    if (value === 'all') return this.activeFilters.length === 0;
    return this.activeFilters.includes(value);
  }

  setStatusFilter(value: 'all' | 'with_lease' | 'without_lease'): void {
    this.activeFilters = value === 'all' ? [] : [value];
    this.applyFilter();
  }

  // Aggiorna filtri attivi
  onFilterChange(event: MatChipListboxChange): void {
    // Controlla se abbiamo selezioni e gestiscile correttamente
    if (event.source) {
      const selectedOptions = event.source.selected;
      
      // Crea un array vuoto per i nostri valori di filtro
      this.activeFilters = [];
      
      // Controlla se abbiamo selezioni multiple o una selezione
      if (Array.isArray(selectedOptions)) {
        // È un array di selezioni
        this.activeFilters = selectedOptions.map((chip: MatChipOption) => chip.value as string);
      } else if (selectedOptions) {
        // È una selezione singola
        this.activeFilters.push(selectedOptions.value as string);
      }
      
      this.applyFilter();
    }
  }

  updateFilters(chipListbox: MatChipListbox): void {
    // Ottieni tutti i valori selezionati
    this.activeFilters = [];
    
    // Processa ogni opzione nell'elenco
    chipListbox._chips.forEach(chip => {
      if (chip.selected) {
        this.activeFilters.push(chip.value as string);
      }
    });
    
    // Applica i filtri
    this.applyFilter();
  }

  // Nuovo metodo per gestire i pulsanti di filtro personalizzati
  toggleFilter(filter: string): void {
    const index = this.activeFilters.indexOf(filter);
    if (index > -1) {
      this.activeFilters.splice(index, 1);
    } else {
      this.activeFilters.push(filter);
    }
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
    return `${tenant.firstName?.charAt(0) || ''}${tenant.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  // Ottieni etichetta dello stato dell'inquilino
  getTenantStatusLabel(tenant: Tenant): string {
    return tenant.hasLease ? 'Con contratto' : 'Senza contratto';
  }

  // Ottieni classe CSS dello stato dell'inquilino
  getTenantStatusClass(tenant: Tenant): string {
    return tenant.hasLease ? 'status-active' : 'status-expired';
  }

  // Azioni dell'interfaccia
  viewTenantDetails(tenantId: number): void {
    // Trova il tenant nella lista locale per passare i dati aggiornati
    const tenant = this.tenants.find(t => t.id === tenantId);
    
    // Aggiungi un piccolo ritardo per evitare problemi di caching tra aperture consecutive
    setTimeout(() => {
      const dialogRef = this.dialog.open(TenantDetailDialogComponent, {
        data: { tenantId, tenant }, // Passa anche il tenant aggiornato
        panelClass: 'tenant-detail-dialog'
      });

      // Gestisce il risultato del modale di dettaglio
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.edit && result.tenantId) {
          // Se l'utente ha cliccato su modifica, apre il form di modifica
          this.editTenant(result.tenantId);
        } else if (result && result.deleted) {
          // Se l'inquilino è stato eliminato, ricarica i dati
          this.loadTenants();
        }
      });
    }, 300);
  }

  editTenant(tenantId: number): void {
    // Trova il tenant nella lista locale per passare i dati aggiornati
    const tenant = this.tenants.find(t => t.id === tenantId);
    
    const dialogRef = this.dialog.open(TenantFormComponent, {
      data: { tenantId, tenant } // Passa anche il tenant aggiornato
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Ottimizzazione: aggiorna solo il tenant modificato invece di ricaricare tutto
        this.updateTenantInList(result.tenant);
      }
    });
  }

  openTenantForm(): void {
    const dialogRef = this.dialog.open(TenantFormComponent);
  
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Ottimizzazione: aggiungi il nuovo tenant alla lista invece di ricaricare tutto
        if (result.tenant) {
          this.addTenantToList(result.tenant);
        }
      }
    });
  }

  // Metodo per aggiornare un tenant specifico nella lista
  private updateTenantInList(updatedTenant: Tenant): void {
    if (!updatedTenant) return;

    // Trova e aggiorna il tenant nella lista
    const index = this.tenants.findIndex(t => t.id === updatedTenant.id);
    if (index !== -1) {
      // Mantieni lo stato hasLease esistente se non è stato modificato
      const existingTenant = this.tenants[index];
      this.tenants[index] = {
        ...updatedTenant,
        hasLease: existingTenant.hasLease
      };
      
      // Riapplica i filtri per aggiornare la visualizzazione
      this.applyFilter();
      
      // Mostra feedback all'utente
      this.snackBar.open('Inquilino aggiornato con successo', 'Chiudi', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });


    } else {
      // Se non trovato, ricarica tutto (caso raro)
      this.loadTenants();
    }
  }



  // Metodo per aggiungere un nuovo tenant alla lista
  private addTenantToList(newTenant: Tenant): void {
    if (!newTenant) return;

    // Aggiungi il nuovo tenant all'inizio della lista
    this.tenants.unshift({
      ...newTenant,
      hasLease: false // Nuovo tenant non ha ancora contratti
    });
    
    // Riapplica i filtri per aggiornare la visualizzazione
    this.applyFilter();
    
    // Mostra feedback all'utente
    this.snackBar.open('Inquilino creato con successo', 'Chiudi', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  deleteTenant(tenant: Tenant): void {
    this.confirmationService.confirmDelete('l\'inquilino', `${tenant.firstName} ${tenant.lastName}`)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('tenants', tenant.id).subscribe({
            next: () => {
              // Ottimizzazione: rimuovi il tenant dalla lista invece di ricaricare tutto
              this.removeTenantFromList(tenant.id);
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

  // Metodo per rimuovere un tenant dalla lista
  private removeTenantFromList(tenantId: number): void {
    // Rimuovi il tenant dalla lista principale
    this.tenants = this.tenants.filter(t => t.id !== tenantId);
    
    // Riapplica i filtri per aggiornare la visualizzazione
    this.applyFilter();
    
    // Mostra feedback all'utente
    this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}