<<<<<<<< HEAD:src/app/pages/tenant/tenant-detail/tenant-detail.component.ts
import { environment } from './../../../../environments/environment';
import { Component, OnInit } from '@angular/core';
========
import { environment } from './../../../environments/environment';
import { Component, OnInit, Inject, ViewChild, QueryList } from '@angular/core';
>>>>>>>> origin/tenant_popup:src/app/tenant/tenant-detail-dialog/tenant-detail-dialog.component.ts
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

<<<<<<<< HEAD:src/app/pages/tenant/tenant-detail/tenant-detail.component.ts
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Tenant } from '../../../shared/models';
========
import { GenericApiService } from '../../shared/services/generic-api.service';
import { Tenant } from '../../shared/models';
import { ConfirmationDialogService } from '../../shared/services/confirmation-dialog.service';
>>>>>>>> origin/tenant_popup:src/app/tenant/tenant-detail-dialog/tenant-detail-dialog.component.ts

@Component({
  selector: 'app-tenant-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './tenant-detail-dialog.component.html',
  styleUrls: ['./tenant-detail-dialog.component.scss']
})
export class TenantDetailDialogComponent implements OnInit {
  @ViewChild(MatTooltip) tooltips!: QueryList<MatTooltip>;
  
  tenant: Tenant | null = null;
  activeLeases: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  environment = environment;

  // Oggetto per gestire i testi dei tooltip per ogni elemento
  tooltipTexts: { [key: string]: string } = {
    'name': 'Copia',
    'address': 'Copia',
    'email': 'Copia',
    'phone': 'Copia',
    'documentNumber': 'Copia'
  };

  constructor(
    private router: Router,
    private apiService: GenericApiService,
    private dialogRef: MatDialogRef<TenantDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tenantId: number },
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.tenantId) {
      this.loadTenantData(this.data.tenantId);
    } else {
      this.errorMessage = 'ID inquilino non valido.';
      this.isLoading = false;
    }
  }

  loadTenantData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getById<Tenant>('tenants', id).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.loadTenantLeases(id);
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'inquilino', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'inquilino.';
        this.isLoading = false;
      }
    });
  }

  loadTenantLeases(tenantId: number): void {
    this.apiService.getAll<any>('leases', { 
      tenantId: tenantId.toString(), 
      status: 'active'
    }).subscribe({
      next: (leases) => {
        this.activeLeases = leases;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.errorMessage = 'Errore nel caricamento dei contratti attivi';
        this.isLoading = false;
      }
    });
  }

  deleteTenant(): void {
    if (!this.tenant) return;

    // Usa il servizio di conferma invece di confirm()
    this.confirmationService.confirmDelete('l\'inquilino', `${this.tenant.firstName} ${this.tenant.lastName}`)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('tenants', this.tenant!.id).subscribe({
            next: () => {
              this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
              this.dialogRef.close({ deleted: true });
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

  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }

  getImageUrl(relativePath: string): string {
    // Se il percorso è vuoto o null, restituisci un'immagine placeholder
    if (!relativePath) {
      return 'assets/images/no-image.png'; // immagine placeholder
    }
    
    // Se il percorso inizia già con http, restituiscilo come è
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Assicurati che il percorso inizi con /static/
    if (!relativePath.startsWith('/static/') && relativePath.startsWith('/')) {
      relativePath = '/static' + relativePath;
    }
    
    // Altrimenti prependi il base URL dell'API
    return `${environment.apiUrl}${relativePath}`;
  }
  
  downloadDocument(docType: 'front' | 'back', filename: string): void {
    const downloadUrl = `${environment.apiUrl}/tenants/${this.tenant!.id}/documents/download/${docType}`;
    window.open(downloadUrl, '_blank');
  }

  close(): void {
    this.dialogRef.close();
  }

  editTenant(): void {
    if (!this.tenant) return;
    this.dialogRef.close({ edit: true, tenantId: this.tenant.id });
  }
  
  copyToClipboard(text: string, elementType: string, tooltipRef: MatTooltip): void {
    // Copia il testo negli appunti
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Aggiorna il testo del tooltip
    this.tooltipTexts[elementType] = 'Copiato!';
    
    // Forza la visualizzazione del tooltip
    tooltipRef.show();
    
    // Mostra anche un feedback con snackbar
    this.snackBar.open(`${text} copiato negli appunti`, 'Chiudi', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
    
    // Ripristina il testo originale dopo un ritardo
    setTimeout(() => {
      this.tooltipTexts[elementType] = 'Copia';
      tooltipRef.hide();
    }, 1500);
  }
}