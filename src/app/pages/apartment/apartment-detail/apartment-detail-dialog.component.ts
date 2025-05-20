import { environment } from '../../../../environments/environment';
import { Component, OnInit, Inject, ViewChild, QueryList, ElementRef } from '@angular/core';
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
import { Apartment, Tenant } from '../../../shared/models';
import { Lease } from '../../../shared/models/lease.model';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { TenantDetailDialogComponent } from '../../tenant/tenant-detail/tenant-detail-dialog.component';

// Componente per l'anteprima dell'immagine a schermo intero (riutilizzato da tenant-detail)
@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="image-preview-container">
      <button mat-icon-button class="close-button" mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.imageUrl" alt="Immagine appartamento" class="preview-image">
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
  selector: 'app-apartment-detail-dialog',
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
  templateUrl: './apartment-detail-dialog.component.html',
  styleUrls: ['./apartment-detail-dialog.component.scss']
})
export class ApartmentDetailDialogComponent implements OnInit {
  @ViewChild(MatTooltip) tooltips!: QueryList<MatTooltip>;
  @ViewChild('carouselInner') carouselInner!: ElementRef;
  
  apartment: Apartment | null = null;
  currentTenants: Tenant[] = [];
  activeLeases: Lease[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  environment = environment;
  
  // Per gestire il carosello
  currentImageIndex = 0;
  
  // Proprietà per gestire l'inquilino attivo per l'appartamento
  activeTenant: Tenant | null = null;
  hasActiveTenant = false;
  
  // Oggetto per gestire i testi dei tooltip
  tooltipTexts: { [key: string]: string } = {
    'name': 'Copia',
    'address': 'Copia'
  };

  constructor(
    private router: Router,
    private apiService: GenericApiService,
    private dialogRef: MatDialogRef<ApartmentDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { apartmentId: number },
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.apartmentId) {
      this.loadApartmentData(this.data.apartmentId);
    } else {
      this.errorMessage = 'ID appartamento non valido.';
      this.isLoading = false;
    }
  }

  loadApartmentData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getById<Apartment>('apartments', id).subscribe({
      next: (apartment) => {
        this.apartment = apartment;
        this.loadActiveLeases(id);
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'appartamento', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'appartamento.';
        this.isLoading = false;
      }
    });
  }

  loadActiveLeases(apartmentId: number): void {
    this.apiService.getAll<Lease>('leases', { 
      apartmentId: apartmentId.toString(), 
      status: 'active'
    }).subscribe({
      next: (leases) => {
        this.activeLeases = leases;
        
        // Se ci sono contratti attivi, carica l'inquilino dal primo contratto attivo
        if (leases.length > 0) {
          this.loadTenantFromLease(leases[0].tenantId);
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.errorMessage = 'Errore nel caricamento dei contratti attivi';
        this.isLoading = false;
      }
    });
  }

  loadTenantFromLease(tenantId: number): void {
    // Carica solo l'inquilino associato al contratto attivo
    this.apiService.getById<Tenant>('tenants', tenantId).subscribe({
      next: (tenant) => {
        this.activeTenant = tenant;
        this.hasActiveTenant = true;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'inquilino', error);
        this.isLoading = false;
      }
    });
  }

  deleteApartment(): void {
    if (!this.apartment) return;

    this.confirmationService.confirmDelete('l\'appartamento', this.apartment.name)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('apartments', this.apartment!.id).subscribe({
            next: () => {
              this.snackBar.open('Appartamento eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
              this.dialogRef.close({ deleted: true });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione dell\'appartamento', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'appartamento', 'Chiudi', {
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
      return 'assets/images/no-image.png';
    }
    
    // Se il percorso inizia già con http, restituiscilo come è
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    
    // Assicurati che il percorso inizi con /static/
    if (!relativePath.startsWith('/static/') && relativePath.startsWith('/')) {
      relativePath = '/static' + relativePath;
    }
    
    // Aggiungi timestamp per prevenire la cache
    const timestamp = new Date().getTime();
    return `${environment.apiUrl}${relativePath}?t=${timestamp}`;
  }

  // Metodo per controllare se l'appartamento ha immagini valide
  hasValidImages(): boolean {
    return Boolean(this.apartment?.images && Array.isArray(this.apartment.images) && this.apartment.images.length > 0);
  }

  // Metodo per ottenere solo le immagini valide
  getValidImages(): string[] {
    if (!this.apartment || !this.apartment.images || !Array.isArray(this.apartment.images)) return [];
    return this.apartment.images.filter(img => 
      img && img !== '' && !img.includes('undefined') && img.length > 5);
  }

  close(): void {
    this.dialogRef.close();
  }

  editApartment(): void {
    if (!this.apartment) return;
    this.dialogRef.close({ edit: true, apartmentId: this.apartment.id });
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'occupied':
        return 'status-occupied';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  }

  getStatusFeatureClass(status: string): string {
    switch (status) {
      case 'available':
        return 'feature-status-available';
      case 'occupied':
        return 'feature-status-occupied';
      case 'maintenance':
        return 'feature-status-maintenance';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'occupied':
        return 'Occupato';
      case 'maintenance':
        return 'Manutenzione';
      default:
        return status;
    }
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

  // Metodo per visualizzare i dettagli di un inquilino
  viewTenantDetails(tenantId: number): void {
    // Chiudi questo dialog prima di aprirne un altro
    this.close();
    
    // Apri il dialog del dettaglio inquilino
    this.dialog.open(TenantDetailDialogComponent, {
      data: { tenantId },
      width: '800px'
    });
  }

  // Metodo per ottenere il nome di un inquilino dal suo ID
  getTenantName(tenantId: number): string {
    // Se abbiamo già l'inquilino attivo, facciamo un controllo veloce
    if (this.activeTenant && this.activeTenant.id === tenantId) {
      return `${this.activeTenant.firstName} ${this.activeTenant.lastName}`;
    }
    return 'Inquilino';  // Fallback nel caso improbabile di ID sconosciuto
  }
  
  // Metodi per gestire il carosello di immagini
  scrollCarousel(direction: number): void {
    const validImages = this.getValidImages();
    if (validImages.length <= 1) return;
    
    // Calcola il nuovo indice
    const totalImages = validImages.length;
    this.currentImageIndex = (this.currentImageIndex + direction + totalImages) % totalImages;
  }
  
  navigateToImage(index: number): void {
    const validImages = this.getValidImages();
    if (validImages.length === 0) return;
    
    if (index >= 0 && index < validImages.length) {
      this.currentImageIndex = index;
    }
  }

  // Metodo per ottenere l'icona appropriata in base al servizio
getAmenityIcon(amenity: string): string {
  const amenityLower = amenity.toLowerCase();
  
  // Mappa dei servizi comuni alle relative icone
  const iconMap: { [key: string]: string } = {
    'wifi': 'wifi',
    'internet': 'wifi',
    'parcheggio': 'local_parking',
    'garage': 'garage',
    'ascensore': 'elevator',
    'aria condizionata': 'ac_unit',
    'riscaldamento': 'wb_sunny',
    'lavatrice': 'local_laundry_service',
    'asciugatrice': 'dry_cleaning',
    'lavastoviglie': 'countertops',
    'tv': 'tv',
    'palestra': 'fitness_center',
    'piscina': 'pool',
    'balcone': 'balcony',
    'terrazza': 'deck',
    'giardino': 'grass',
    'sicurezza': 'security',
    'portiere': 'person',
    'animali': 'pets',
    'pulizie': 'cleaning_services'
  };
  
  // Cerca corrispondenze parziali
  for (const key in iconMap) {
    if (amenityLower.includes(key) || key.includes(amenityLower)) {
      return iconMap[key];
    }
  }
  
  // Icona predefinita se non ci sono corrispondenze
  return 'check_circle';
}
}