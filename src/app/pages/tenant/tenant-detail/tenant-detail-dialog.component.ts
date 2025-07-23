import { environment } from '../../../../environments/environment';
import { Component, OnInit, Inject, ViewChild, QueryList, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Tenant } from '../../../shared/models';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';
import { ImageService } from '../../../shared/services/image.service';
import { LeaseService } from '../../../shared/services/lease.service';
import { catchError, delay, map, Observable, of, retry, tap } from 'rxjs';

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
  styleUrls: ['./tenant-detail-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantDetailDialogComponent implements OnInit {
  @ViewChild(MatTooltip) tooltips!: QueryList<MatTooltip>;
  
  tenant: Tenant | null = null;
  activeLeases: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  environment = environment;
  documentsModified: boolean = false;
  
  // Proprietà per la gestione delle immagini
  documentFrontImageSrc: string = '';
  documentBackImageSrc: string = '';
  documentLoadingFront: boolean = false;
  documentLoadingBack: boolean = false;
  

  
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
    @Inject(MAT_DIALOG_DATA) public data: { tenantId: number; tenant?: Tenant },
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private ngZone: NgZone,
    private imageService: ImageService,
    private leaseService: LeaseService
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.tenantId) {
      // Se abbiamo già i dati del tenant aggiornati, usali direttamente
      if (this.data.tenant) {
        this.tenant = this.data.tenant;
        this.loadDocumentImages(this.tenant);
        this.loadTenantLeases(this.data.tenantId);
        this.isLoading = false;
        this.cdr.markForCheck();
      } else {
        // Altrimenti carica dal backend
        this.loadTenantData(this.data.tenantId);
      }
    } else {
      this.errorMessage = 'ID inquilino non valido.';
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  loadTenantData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.documentLoadingFront = false;
    this.documentLoadingBack = false;
    
    this.cdr.markForCheck();

    this.apiService.getById<Tenant>('tenants', id).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.loadDocumentImages(tenant);
        this.loadTenantLeases(id);
      },
      error: (error) => {
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'inquilino.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadDocumentImages(tenant: Tenant): void {
    // Il backend garantisce che solo immagini esistenti sono nel database
    this.documentFrontImageSrc = tenant.documentFrontImage ? this.getImageUrl(tenant.documentFrontImage) : '';
    this.documentBackImageSrc = tenant.documentBackImage ? this.getImageUrl(tenant.documentBackImage) : '';
    this.cdr.markForCheck();
  }

  // Metodo per ritentare il caricamento delle immagini
  retryLoadImage(imagePath: string, type: 'front' | 'back', attempts: number = 3): void {
    if (attempts <= 0) return;
    
    console.log(`Tentativo di ricaricamento immagine ${type}, tentativi rimanenti: ${attempts}`);
    
    // Ricontrolla lo stato dell'inquilino con timestamp anti-cache
    const timestamp = new Date().getTime();
    this.apiService.getById<Tenant>('tenants', this.tenant!.id, { _t: timestamp }).subscribe({
      next: (tenant) => {
        const path = type === 'front' ? tenant.documentFrontImage : tenant.documentBackImage;
        
        if (path) {
          // Aggiorna il percorso dell'immagine se è cambiato
          if (path !== imagePath) {
            if (type === 'front') {
              this.tenant!.documentFrontImage = path;
            } else {
              this.tenant!.documentBackImage = path;
            }
          }
          
          // Prova a caricare l'immagine con il nuovo percorso
          this.imageService.preloadImage(path).pipe(
            delay(300 * (4 - attempts)), // Aumenta il ritardo ad ogni tentativo
            catchError(error => {
              console.error(`Tentativo ${4 - attempts} fallito per ${type}:`, error);
              if (attempts > 1) {
                return of(null); // Continua con il prossimo tentativo
              }
              return of('assets/images/no-image.png'); // Ultimo tentativo, usa placeholder
            })
          ).subscribe({
            next: (dataUrl) => {
              if (!dataUrl) {
                // Se dataUrl è null, ritenta
                setTimeout(() => {
                  this.retryLoadImage(path, type, attempts - 1);
                }, 500);
                return;
              }
              
              if (type === 'front') {
                this.documentFrontImageSrc = dataUrl;
              } else {
                this.documentBackImageSrc = dataUrl;
              }
              this.cdr.markForCheck();
            }
          });
        }
      },
      error: () => {
        // In caso di errore, ritenta con meno tentativi
        if (attempts > 1) {
          setTimeout(() => {
            this.retryLoadImage(imagePath, type, attempts - 1);
          }, 1000);
        }
      }
    });
  }

  loadTenantLeases(tenantId: number): void {
    // Aggiungi timestamp per evitare la cache
    const timestamp = new Date().getTime();
    
    this.apiService.getAll<any>('leases', { 
      tenantId: tenantId.toString(), 
      status: 'active',
      _t: timestamp.toString()
    }).subscribe({
      next: (leases) => {
        this.activeLeases = leases;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.errorMessage = 'Errore nel caricamento dei contratti attivi';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteTenant(): void {
    if (!this.tenant) return;

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
    
    // Il backend gestisce automaticamente la sincronizzazione
    return `${environment.apiUrl}${relativePath}`;
  }
  
  downloadDocument(docType: 'front' | 'back', filename: string): void {
    const timestamp = new Date().getTime();
    const nonce = Math.random().toString(36).substring(2, 15);
    const downloadUrl = `${environment.apiUrl}/tenants/${this.tenant!.id}/documents/download/${docType}?_t=${timestamp}&n=${nonce}`;
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
    
    // Ripristina il testo originale dopo un ritardo
    setTimeout(() => {
      this.tooltipTexts[elementType] = 'Copia';
      tooltipRef.hide();
    }, 1500);
  }

  getContractProgress(startDate: string | Date, endDate: string | Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Se il contratto non è ancora iniziato
    if (now < start) {
      return '0%';
    }
    
    // Se il contratto è terminato
    if (now > end) {
      return '100%';
    }
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = now.getTime() - start.getTime();
    
    const progressPercentage = Math.round((elapsedDuration / totalDuration) * 100);
    return `${progressPercentage}%`;
  }
  
  getContractProgressText(startDate: string | Date, endDate: string | Date): string {
    const progressPercentage = parseInt(this.getContractProgress(startDate, endDate), 10);
    
    if (progressPercentage === 0) {
      return 'Contratto non ancora iniziato';
    } else if (progressPercentage === 100) {
      return 'Contratto completato';
    } else if (progressPercentage < 25) {
      return `Completato ${progressPercentage}% - Fase iniziale`;
    } else if (progressPercentage < 50) {
      return `Completato ${progressPercentage}% - Primo periodo`;
    } else if (progressPercentage < 75) {
      return `Completato ${progressPercentage}% - Secondo periodo`;
    } else {
      return `Completato ${progressPercentage}% - Fase finale`;
    }
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
    let imageUrl = '';
    
    // Usa l'immagine in cache base64 se disponibile
    if (imagePath === this.tenant?.documentFrontImage && this.documentFrontImageSrc) {
      imageUrl = this.documentFrontImageSrc;
    } else if (imagePath === this.tenant?.documentBackImage && this.documentBackImageSrc) {
      imageUrl = this.documentBackImageSrc;
    } else {
      imageUrl = this.getImageUrl(imagePath);
    }
    
    this.dialog.open(ImagePreviewDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { imageUrl }
    });
  }

  // Metodo per caricare solo il fronte
  uploadFrontImage(): void {
    this.ngZone.runOutsideAngular(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          this.ngZone.run(() => {
            this.uploadDocumentImage('front', file);
          });
        }
      };
      input.click();
    });
  }

  // Metodo per caricare solo il retro
  uploadBackImage(): void {
    this.ngZone.runOutsideAngular(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          this.ngZone.run(() => {
            this.uploadDocumentImage('back', file);
          });
        }
      };
      input.click();
    });
  }

  // Metodo migliorato per sostituire l'immagine fronte
  replaceFrontImage(): void {
    this.ngZone.runOutsideAngular(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (!file) return;
        
        this.ngZone.run(() => {
          this.isLoading = true;
          this.cdr.markForCheck();
          
          // Visualizza un messaggio di caricamento
          this.snackBar.open('Sostituzione immagine in corso...', '', {
            duration: 0
          });
          
          // Elimina prima il file esistente
          this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/front')
            .subscribe({
              next: () => {
                // Pulisci l'immagine precedente
                this.documentFrontImageSrc = '';
                
                // Dopo l'eliminazione, carica la nuova immagine
                setTimeout(() => {
                  this.uploadDocumentImage('front', file);
                  this.snackBar.dismiss();
                }, 300);
              },
              error: (error) => {
                console.error('Errore nella rimozione del file esistente:', error);
                // Carica comunque la nuova immagine
                setTimeout(() => {
                  this.uploadDocumentImage('front', file);
                  this.snackBar.dismiss();
                }, 300);
              }
            });
        });
      };
      
      input.click();
    });
  }
  
  // Metodo migliorato per sostituire l'immagine retro
  replaceBackImage(): void {
    this.ngZone.runOutsideAngular(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (!file) return;
        
        this.ngZone.run(() => {
          this.isLoading = true;
          this.cdr.markForCheck();
          
          // Visualizza un messaggio di caricamento
          this.snackBar.open('Sostituzione immagine in corso...', '', {
            duration: 0
          });
          
          // Elimina prima il file esistente
          this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/back')
            .subscribe({
              next: () => {
                // Pulisci l'immagine precedente
                this.documentBackImageSrc = '';
                
                // Dopo l'eliminazione, carica la nuova immagine
                setTimeout(() => {
                  this.uploadDocumentImage('back', file);
                  this.snackBar.dismiss();
                }, 300);
              },
              error: (error) => {
                console.error('Errore nella rimozione del file esistente:', error);
                // Carica comunque la nuova immagine
                setTimeout(() => {
                  this.uploadDocumentImage('back', file);
                  this.snackBar.dismiss();
                }, 300);
              }
            });
        });
      };
      
      input.click();
    });
  }

  // Metodo migliorato per caricare un'immagine documento
  uploadDocumentImage(type: 'front' | 'back', file: File): void {
    if (!this.tenant) return;
  
    this.isLoading = true;
    this.cdr.markForCheck();
    
    // Mostra il loader appropriato
    if (type === 'front') {
      this.documentLoadingFront = true;
    } else {
      this.documentLoadingBack = true;
    }
    
    // Usa NgZone per la gestione della preview
    this.ngZone.runOutsideAngular(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imagePreview = event.target?.result as string;
        
        // Ritorna nella zona Angular per aggiornare l'UI
        this.ngZone.run(() => {
          // Usa setTimeout per evitare gli errori NG0100
          setTimeout(() => {
            // Aggiorna l'anteprima con base64
            if (type === 'front') {
              this.documentFrontImageSrc = imagePreview;
            } else {
              this.documentBackImageSrc = imagePreview;
            }
            this.cdr.markForCheck();
          }, 0);
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Crea il FormData per l'upload
    const formData = new FormData();
    formData.append('image', file);
    
    // Parametri anti-cache più efficaci
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Esegui la chiamata API per caricare il file con timeout più lungo
    this.http.post<{ imageUrl: string, success: boolean, timestamp: number }>(
      `${environment.apiUrl}/tenants/${this.tenant.id}/documents/${type}`, 
      formData,
      { 
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0' },
        params: { '_': timestamp, 'nonce': nonce } // Parametri anti-cache aggiuntivi
      }
    ).pipe(
      retry({ count: 3, delay: 500 }) // Riprova 3 volte con 500ms di ritardo
    ).subscribe({
      next: (response) => {
        // Aggiorna il modello locale con l'URL dell'immagine dal server
        if (response && response.imageUrl) {
          setTimeout(() => {
            // Aggiorna l'URL dell'immagine nel tenant
            if (type === 'front' && this.tenant) {
              this.tenant.documentFrontImage = response.imageUrl;
            } else if (type === 'back' && this.tenant) {
              this.tenant.documentBackImage = response.imageUrl;
            }
            
            this.snackBar.open(`Immagine ${type === 'front' ? 'fronte' : 'retro'} caricata con successo`, 'Chiudi', {
              duration: 3000
            });
            
            this.documentsModified = true;
            if (type === 'front') {
              this.documentLoadingFront = false;
            } else {
              this.documentLoadingBack = false;
            }
            
            this.isLoading = false;
            this.cdr.markForCheck();
            
            // Verifica che l'immagine sia stata salvata correttamente
            this.verifyImageSaved(this.tenant!.id, type);
          }, 300);
        } else {
          throw new Error('Risposta del server non valida');
        }
      },
      error: (error) => {
        console.error(`Errore durante il caricamento dell'immagine ${type}:`, error);
        this.snackBar.open(`Errore durante il caricamento dell'immagine`, 'Chiudi', {
          duration: 3000
        });
        
        if (type === 'front') {
          this.documentLoadingFront = false;
          this.documentFrontImageSrc = '';
        } else {
          this.documentLoadingBack = false;
          this.documentBackImageSrc = '';
        }
        
        this.isLoading = false;
        this.cdr.markForCheck();
        
        // Ricarica i dati originali in caso di errore
        setTimeout(() => {
          this.loadTenantData(this.tenant!.id);
        }, 300);
      }
    });
  }

  // Metodo migliorato per verificare che l'immagine sia stata salvata
  verifyImageSaved(tenantId: number, type: 'front' | 'back'): void {
    // Attendi un breve momento per assicurarti che il server abbia elaborato la richiesta
    setTimeout(() => {
      // Aggiungi timestamp per evitare cache
      const timestamp = new Date().getTime();
      const nonce = Math.random().toString(36).substring(2, 15);
      
      this.apiService.getById<Tenant>('tenants', tenantId, { _t: timestamp, n: nonce }).subscribe({
        next: (tenant) => {
          const imagePath = type === 'front' ? tenant.documentFrontImage : tenant.documentBackImage;
          
          if (!imagePath) {
            console.warn(`Verifica fallita: L'immagine ${type} non risulta salvata nel database`);
            this.snackBar.open(`Attenzione: L'immagine potrebbe non essere stata salvata correttamente`, 'Riprova', {
              duration: 5000
            }).onAction().subscribe(() => {
              // Se l'utente clicca su "Riprova", ricarichiamo i dati del tenant
              this.loadTenantData(tenantId);
            });
          } else {
            // Se l'immagine esiste, aggiorna il tenant locale e l'URL
            if (type === 'front') {
              this.tenant!.documentFrontImage = imagePath;
              // Ricarica l'immagine
              this.imageService.preloadImage(imagePath).subscribe(dataUrl => {
                this.documentFrontImageSrc = dataUrl;
                this.cdr.markForCheck();
              });
            } else {
              this.tenant!.documentBackImage = imagePath;
              // Ricarica l'immagine
              this.imageService.preloadImage(imagePath).subscribe(dataUrl => {
                this.documentBackImageSrc = dataUrl;
                this.cdr.markForCheck();
              });
            }
          }
        },
        error: (error) => {
          console.error('Errore durante la verifica del salvataggio dell\'immagine:', error);
        }
      });
    }, 500);
  }

  // Metodo migliorato per rimuovere l'immagine fronte
  removeFrontImage(): void {
    if (!this.tenant || !this.tenant.documentFrontImage) return;
    
    this.confirmationService.confirmDelete('l\'immagine fronte del documento', 'questo documento').subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        this.documentLoadingFront = true;
        this.cdr.markForCheck();
        
        // Salva l'URL corrente prima dell'eliminazione
        const currentUrl = this.tenant?.documentFrontImage;
        
        // Aggiorna immediatamente l'UI per feedback immediato
        this.documentFrontImageSrc = '';
        this.tenant!.documentFrontImage = '';
        
        // Aggiungi parametri anti-cache
        const timestamp = Date.now().toString();
        const nonce = Math.random().toString(36).substring(2, 15);
        
        // Chiama l'API per eliminare il file
        this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/front').pipe(
          retry({ count: 2, delay: 300 }) // Riprova 2 volte con 300ms di ritardo
        ).subscribe({
          next: (response) => {
            this.snackBar.open('Fronte del documento rimosso', 'Chiudi', { 
              duration: 3000 
            });
            
            this.documentsModified = true;
            this.isLoading = false;
            this.documentLoadingFront = false;
            this.cdr.markForCheck();
            
            // Ricarica il tenant per confermare l'eliminazione sul server
            setTimeout(() => this.loadTenantData(this.tenant!.id), 500);
          },
          error: (error) => {
            console.error('Errore nella rimozione del documento', error);
            this.snackBar.open(`Errore nella rimozione del documento`, 'Chiudi', { 
              duration: 3000 
            });
            
            // Ricarica il tenant per assicurarsi che i dati siano coerenti
            this.loadTenantData(this.tenant!.id);
            
            this.isLoading = false;
            this.documentLoadingFront = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  // Metodo migliorato per eliminare l'immagine retro
  removeBackImage(): void {
    if (!this.tenant || !this.tenant.documentBackImage) return;
    
    this.confirmationService.confirmDelete('l\'immagine retro del documento', 'questo documento').subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        this.documentLoadingBack = true;
        this.cdr.markForCheck();
        
        // Salva l'URL corrente prima dell'eliminazione
        const currentUrl = this.tenant?.documentBackImage;
        
        // Aggiorna immediatamente l'UI per feedback immediato
        this.documentBackImageSrc = '';
        this.tenant!.documentBackImage = '';
        
        // Aggiungi parametri anti-cache
        const timestamp = Date.now().toString();
        const nonce = Math.random().toString(36).substring(2, 15);
        
        // Chiama l'API per eliminare il file
        this.apiService.deleteFile('tenants', this.tenant!.id, 'documents/back').pipe(
          retry({ count: 2, delay: 300 }) // Riprova 2 volte con 300ms di ritardo
        ).subscribe({
          next: (response) => {
            this.snackBar.open('Retro del documento rimosso', 'Chiudi', { 
              duration: 3000 
            });
            
            this.documentsModified = true;
            this.isLoading = false;
            this.documentLoadingBack = false;
            this.cdr.markForCheck();
            
            // Ricarica il tenant per confermare l'eliminazione sul server
            setTimeout(() => this.loadTenantData(this.tenant!.id), 500);
          },
          error: (error) => {
            console.error('Errore nella rimozione del documento', error);
            this.snackBar.open(`Errore nella rimozione del documento`, 'Chiudi', { 
              duration: 3000 
            });
            
            // Ricarica il tenant per assicurarsi che i dati siano coerenti
            this.loadTenantData(this.tenant!.id);
            
            this.isLoading = false;
            this.documentLoadingBack = false;
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  // Metodi per gestire le operazioni sui lease
  
  /**
   * Apre il modale per visualizzare il lease
   */
  viewLease(lease: any): void {
    this.leaseService.openLeaseDetail(lease);
  }

  /**
   * Apre il modale per modificare il lease
   */
  editLease(lease: any): void {
    this.leaseService.openLeaseEdit(lease);
  }

  /**
   * Elimina il lease con conferma
   */
  deleteLease(lease: any): void {
    this.leaseService.deleteLease(lease).subscribe({
      next: (deleted: boolean) => {
        if (deleted) {
          this.snackBar.open('Contratto eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          // Ricarica i lease dell'inquilino
          this.loadTenantLeases(this.tenant!.id);
        }
      },
      error: (error: any) => {
        console.error('Errore durante l\'eliminazione del contratto', error);
        this.snackBar.open('Errore durante l\'eliminazione del contratto', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }
}