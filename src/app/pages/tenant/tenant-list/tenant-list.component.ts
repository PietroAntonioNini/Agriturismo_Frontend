import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Tenant } from '../../../shared/models';
import { TenantDetailDialogComponent } from '../tenant-detail/tenant-detail-dialog.component';
import { TenantFormComponent } from '../tenant-form/tenant-form.component';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'phone', 'email', 'documentType', 'documentNumber', 'documents', 'actions'];
  dataSource = new MatTableDataSource<Tenant>([]);
  isLoading = true;
  errorMessage: string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    if (this.paginator) {
      this.paginator.pageSize = 10;
    }
    this.dataSource.sort = this.sort;
  }

  loadTenants(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getAll<Tenant>('tenants').subscribe({
      next: (tenants) => {
        this.dataSource.data = tenants;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento degli inquilini', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento degli inquilini. Riprova più tardi.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openTenantDetails(tenantId: number): void {
    const dialogRef = this.dialog.open(TenantDetailDialogComponent, {
      data: { tenantId },
      width: '800px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.deleted) {
          this.loadTenants();
        } else if (result.edit) {
          this.openTenantForm(result.tenantId);
        }
      }
    });
  }
  
  openTenantForm(tenantId?: number): void {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      data: { tenantId },
      width: '900px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadTenants();
        if (result.tenant) {
          // Opzionalmente, apri il dialog dei dettagli dopo aver salvato
          setTimeout(() => {
            this.openTenantDetails(result.tenant.id);
          }, 300);
        }
      }
    });
  }

  deleteTenant(tenant: Tenant): void {
    // Utilizza il servizio di conferma
    this.confirmationService.confirmDelete('l\'inquilino', `${tenant.firstName} ${tenant.lastName}`)
    .subscribe(confirmed => {
      if (confirmed) {
        this.apiService.delete('tenants', tenant.id).subscribe({
          next: () => {
            this.loadTenants();
            this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            });
          },
          error: (error) => {
            console.error('Errore durante l\'eliminazione dell\'inquilino', error);
            this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'inquilino', 'Chiudi', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }

  getFullName(tenant: Tenant): string {
    return `${tenant.firstName} ${tenant.lastName}`;
  }
}