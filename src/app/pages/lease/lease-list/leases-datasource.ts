import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map } from 'rxjs/operators';
import { Observable, of as observableOf, merge } from 'rxjs';
import { Lease } from '../../../shared/models/lease.model';

/**
 * Data source personalizzata per i contratti con funzionalità di filtraggio
 */
export class LeasesDataSource extends DataSource<Lease> {
  data: Lease[] = [];
  filteredData: Lease[] = [];
  paginator: MatPaginator | undefined;
  sort: MatSort | undefined;

  constructor() {
    super();
  }

  /**
   * Connette la datasource all'output
   */
  connect(): Observable<Lease[]> {
    if (this.paginator && this.sort) {
      // Combina le funzionalità di paginazione e ordinamento
      return merge(
        observableOf(this.filteredData),
        this.paginator.page,
        this.sort.sortChange
      ).pipe(map(() => {
        return this.getPagedData(this.getSortedData([...this.filteredData]));
      }));
    } else {
      // Senza paginazione e ordinamento
      return observableOf(this.filteredData);
    }
  }

  /**
   * Disconnette la datasource
   */
  disconnect(): void {
    // Nessuna operazione necessaria
  }

  /**
   * Applica un filtro testuale ai dati
   */
  applyTextFilter(text: string): void {
    const filterValue = text.toLowerCase();
    this.filteredData = this.data.filter(lease => {
      // Aggiungi qui le proprietà da filtrare
      return JSON.stringify(lease).toLowerCase().includes(filterValue);
    });
    
    this.updatePaginator();
  }

  /**
   * Applica un filtro di stato ai dati
   */
  applyStatusFilter(status: string[]): void {
    if (!status.length) {
      this.filteredData = this.data;
    } else {
      this.filteredData = this.data.filter(lease => {
        if (status.includes('active') && lease.isActive) {
          return true;
        }
        if (status.includes('inactive') && !lease.isActive) {
          return true;
        }
        if (status.includes('expiring') && this.isLeaseExpiring(lease)) {
          return true;
        }
        return false;
      });
    }
    
    this.updatePaginator();
  }

  /**
   * Combina filtri di testo e stato
   */
  applyFilters(text: string, status: string[]): void {
    // Prima resetta al dataset completo
    this.filteredData = this.data;
    
    // Applica i filtri in sequenza
    if (text) {
      this.applyTextFilter(text);
    }
    
    if (status.length) {
      this.applyStatusFilter(status);
    }
  }

  /**
   * Resetta tutti i filtri
   */
  resetFilters(): void {
    this.filteredData = this.data;
    this.updatePaginator();
  }

  /**
   * Verifica se un contratto è in scadenza (entro 20 giorni)
   */
  private isLeaseExpiring(lease: Lease): boolean {
    if (!lease.isActive) return false;
    
    const today = new Date();
    const twentyDaysFromNow = new Date();
    twentyDaysFromNow.setDate(today.getDate() + 20);
    
    const endDate = new Date(lease.endDate);
    return endDate <= twentyDaysFromNow && endDate >= today;
  }

  /**
   * Aggiorna il paginatore quando i dati cambiano
   */
  private updatePaginator(): void {
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  /**
   * Gestisce la paginazione dei dati
   */
  private getPagedData(data: Lease[]): Lease[] {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.splice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }

  /**
   * Gestisce l'ordinamento dei dati
   */
  private getSortedData(data: Lease[]): Lease[] {
    if (!this.sort || !this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort?.direction === 'asc';
      switch (this.sort?.active) {
        case 'id': return compare(a.id, b.id, isAsc);
        case 'tenant': return compare(a.tenantId, b.tenantId, isAsc);
        case 'apartment': return compare(a.apartmentId, b.apartmentId, isAsc);
        case 'period': return compare(new Date(a.endDate).getTime(), new Date(b.endDate).getTime(), isAsc);
        case 'status': return compare(a.isActive, b.isActive, isAsc);
        case 'amount': return compare(a.monthlyRent, b.monthlyRent, isAsc);
        default: return 0;
      }
    });
  }
}

/**
 * Semplice funzione di ordinamento
 */
function compare(a: string | number | boolean, b: string | number | boolean, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
} 