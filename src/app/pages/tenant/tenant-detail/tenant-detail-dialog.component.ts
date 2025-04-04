import { environment } from '../../../../environments/environment';
import { Component, OnInit, Inject, ViewChild, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
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
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Tenant } from '../../../shared/models';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

// Componente per l'anteprima dell'immagine a schermo intero
@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="image-preview-container">
      <button mat-icon-button class="close-button" mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.imageUrl" alt="Documento" class="preview-image">
    </div>
  `,
  styles: [`
    .image-preview-container {
      position: relative;
      padding: 16px;
      max-height: 90vh;
      display: flex;
      justify-content: center;
    }
    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
    }
    .preview-image {
      max-width: 100%;
      max-height: 85vh;
      object-fit: contain;
    }
  `]
})
export class ImagePreviewDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { imageUrl: string }) {}
}

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
  documentsModified: boolean = false;
  
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
    private confirmationService: ConfirmationDialogService,
    private dialog: MatDialog
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
    this.dialogRef.close({ documentsModified: this.documentsModified });
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

  getContractProgress(startDate: string | Date, endDate: string | Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    
    // Calcola la percentuale completata
    let percentComplete = Math.round((elapsedDuration / totalDuration) * 100);
    
    // Assicurati che sia tra 0 e 100
    percentComplete = Math.max(0, Math.min(100, percentComplete));
    
    return percentComplete + '%';
  }
  
  getContractProgressText(startDate: string | Date, endDate: string | Date): string {
    const percentComplete = this.getContractProgress(startDate, endDate);
    return percentComplete + ' completato';
  }
  
  getRemainingMonths(endDate: string | Date): number {
    const end = new Date(endDate);
    const today = new Date();
    
    // Calcola la differenza in mesi
    const months = (end.getFullYear() - today.getFullYear()) * 12 + 
                   (end.getMonth() - today.getMonth());
    
    return Math.max(0, months);
  }

  // Metodo per aprire un visualizzatore immagine più grande
  openImagePreview(imagePath: string): void {
    const imageUrl = this.getImageUrl(imagePath);
    
    this.dialog.open(ImagePreviewDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { imageUrl }
    });
  }

  // Metodo per caricare solo il fronte
  uploadFrontImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadDocumentImage('front', file);
      }
    };
    input.click();
  }

  // Metodo per caricare solo il retro
  uploadBackImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadDocumentImage('back', file);
      }
    };
    input.click();
  }

  // Metodo per sostituire l'immagine fronte
  replaceFrontImage(): void {
    this.uploadFrontImage();
  }

  // Metodo per sostituire l'immagine retro
  replaceBackImage(): void {
    this.uploadBackImage();
  }

  // Metodo per caricare un'immagine documento
  uploadDocumentImage(type: 'front' | 'back', file: File): void {
    if (!this.tenant) return;

    this.isLoading = true;
    
    // Crea un FormData per inviare il file
    const formData = new FormData();
    formData.append('file', file);
    
    // Aggiorna il nome del file con il tipo (fronte o retro)
    const fileName = type === 'front' ? 'documentFrontImage' : 'documentBackImage';
    formData.append('fieldName', fileName);
    
    // Chiama l'API per caricare il file
    this.apiService.uploadFile('tenants', this.tenant.id, `documents/${type}`, file).subscribe({
      next: (response) => {
        // Aggiorna il modello locale con il nuovo URL dell'immagine
        if (type === 'front') {
          this.tenant!.documentFrontImage = response.imageUrl;
        } else {
          this.tenant!.documentBackImage = response.imageUrl;
        }
        
        this.snackBar.open(`Immagine ${type === 'front' ? 'fronte' : 'retro'} caricata con successo`, 'Chiudi', {
          duration: 3000
        });
        
        // Ricarica i dati dell'inquilino per aggiornare l'interfaccia
        this.documentsModified = true;
        this.loadTenantData(this.tenant!.id);
      },
      error: (error) => {
        console.error(`Errore durante il caricamento dell'immagine ${type}`, error);
        this.snackBar.open(`Errore durante il caricamento dell'immagine: ${error.message || 'Errore sconosciuto'}`, 'Chiudi', {
          duration: 3000
        });
        this.isLoading = false;
      }
    });
  }

  /// Metodo per eliminare l'immagine fronte
  removeFrontImage(): void {
    if (!this.tenant || !this.tenant.documentFrontImage) return;
    
    this.confirmationService.confirmDelete('l\'immagine fronte del documento', 'questo documento').subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        
        // Chiama l'API per eliminare il file
        this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/front').subscribe({
          next: () => {
            // Aggiorna il modello locale
            this.tenant!.documentFrontImage = '';
            
            this.snackBar.open('Fronte del documento rimosso', 'Chiudi', { 
              duration: 3000 
            });
            
            this.documentsModified = true;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Errore nella rimozione del documento', error);
            this.snackBar.open(`Errore nella rimozione del documento: ${error.message || 'Errore sconosciuto'}`, 'Chiudi', { 
              duration: 3000 
            });
            
            this.isLoading = false;
          }
        });
      }
    });
  }

  // Metodo per eliminare l'immagine retro
  removeBackImage(): void {
    if (!this.tenant || !this.tenant.documentBackImage) return;
    
    this.confirmationService.confirmDelete('l\'immagine retro del documento', 'questo documento').subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        
        // Chiama l'API per eliminare il file
        this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/back').subscribe({
          next: () => {
            // Aggiorna il modello locale
            this.tenant!.documentBackImage = '';
            
            this.snackBar.open('Retro del documento rimosso', 'Chiudi', { 
              duration: 3000 
            });
            
            this.documentsModified = true;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Errore nella rimozione del documento', error);
            this.snackBar.open(`Errore nella rimozione del documento: ${error.message || 'Errore sconosciuto'}`, 'Chiudi', { 
              duration: 3000 
            });
            
            this.isLoading = false;
          }
        });
      }
    });
  }
}