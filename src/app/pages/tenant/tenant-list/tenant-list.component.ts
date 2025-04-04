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
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Tenant } from '../../../shared/models';
import { TenantDetailDialogComponent } from '../tenant-detail/tenant-detail-dialog.component';
import { TenantFormComponent } from '../tenant-form/tenant-form-dialog.component';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { DocumentPreviewTooltipComponent } from '../../../shared/components/document-preview-tooltip/document-preview-tooltip.component';
import { environment } from '../../../../environments/environment';

// Importazione del componente per l'anteprima dell'immagine a schermo intero
import { ImagePreviewDialogComponent } from '../tenant-detail/tenant-detail-dialog.component';

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
    MatProgressSpinnerModule,
  ],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss']
})
export class TenantListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'phone', 'email', 'documentType', 'documentNumber', 'documents', 'actions'];
  dataSource = new MatTableDataSource<Tenant>([]);
  isLoading = true;
  errorMessage: string | null = null;
  private overlayRef: OverlayRef | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private confirmationService: ConfirmationDialogService,
    private overlay: Overlay 
  ) {}

  ngOnInit(): void {
    this.loadTenants();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Configurazione personalizzata del paginatore
    if (this.paginator) {
      this.paginator._intl.nextPageLabel = 'Pagina successiva';
      this.paginator._intl.previousPageLabel = 'Pagina precedente';
      this.paginator._intl.firstPageLabel = 'Prima pagina';
      this.paginator._intl.lastPageLabel = 'Ultima pagina';
      this.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
        if (length === 0 || pageSize === 0) {
          return `0 di ${length}`;
        }
        length = Math.max(length, 0);
        const startIndex = page * pageSize;
        const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
        return `${page + 1} di ${Math.ceil(length / pageSize)}`;
      };
    }
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
        } else if (result.documentsModified) {
          // Ricarica i dati se i documenti sono stati modificati
          this.loadTenants();
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

  // Metodo per mostrare il tooltip con le anteprime dei documenti
  showDocumentPreview(tenant: Tenant, event: MouseEvent): void {
    // Mostra solo se ci sono entrambi i documenti
    if (!tenant.documentFrontImage || !tenant.documentBackImage) {
      return;
    }

    // Chiudi qualsiasi tooltip esistente
    this.hideDocumentPreview();
    
    // Ottieni l'elemento che ha innescato l'evento (l'icona check)
    const targetElement = event.currentTarget as HTMLElement;

    // Crea una posizione per il tooltip ancorato all'icona
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(targetElement)
      .withPositions([
        { 
          originX: 'center', 
          originY: 'bottom', 
          overlayX: 'center', 
          overlayY: 'top', 
          offsetY: 5 
        }
      ]);

    // Crea l'overlay per il tooltip
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false,
      panelClass: 'document-preview-overlay'
    });

    // Crea il componente per il tooltip
    const tooltipPortal = new ComponentPortal(DocumentPreviewTooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    
    // Passa i dati al tooltip
    tooltipRef.instance.documentFront = this.getImageUrl(tenant.documentFrontImage);
    tooltipRef.instance.documentBack = this.getImageUrl(tenant.documentBackImage);
    tooltipRef.instance.documentFrontPath = tenant.documentFrontImage;
    tooltipRef.instance.documentBackPath = tenant.documentBackImage;
    
    // Sottoscrizione all'evento di apertura dell'anteprima completa
    tooltipRef.instance.onImageClick.subscribe((imagePath: string) => {
      this.hideDocumentPreview(); // Chiudi il tooltip prima di aprire l'anteprima
      this.openImagePreview(imagePath);
    });
  }

  // Metodo per nascondere il tooltip
  hideDocumentPreview(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  // Metodo per ottenere l'URL dell'immagine
  getImageUrl(relativePath: string): string {
    if (!relativePath) {
      return 'assets/images/no-image.png';
    }
    
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    if (!relativePath.startsWith('/static/') && relativePath.startsWith('/')) {
      relativePath = '/static' + relativePath;
    }
    
    return `${environment.apiUrl}${relativePath}`;
  }

  // Metodo per aprire l'anteprima completa dell'immagine
  openImagePreview(imagePath: string): void {
    const imageUrl = this.getImageUrl(imagePath);
    
    this.dialog.open(ImagePreviewDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { imageUrl }
    });
  }
}