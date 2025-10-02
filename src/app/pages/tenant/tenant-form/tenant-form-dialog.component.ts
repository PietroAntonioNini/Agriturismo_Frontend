import { Component, OnInit, Inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Tenant } from '../../../shared/models';
import { ImageService } from '../../../shared/services/image.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './tenant-form-dialog.component.html',
  styleUrls: ['./tenant-form-dialog.component.scss']
})
export class TenantFormComponent implements OnInit {
  currentTenant: Tenant = {} as Tenant;
  tenantForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  tenantId: number | null = null;
  errorMessage: string | null = null;
  frontPreview: string | null = null;
  backPreview: string | null = null;
  frontImageFile: File | null = null;
  backImageFile: File | null = null;
  documentLoadingFront: boolean = false;
  documentLoadingBack: boolean = false;
  documentFrontImageSrc: string = '';
  documentBackImageSrc: string = '';
  
  @ViewChild('fileInputFront') fileInputFront!: ElementRef;
  @ViewChild('fileInputBack') fileInputBack!: ElementRef;

  // Opzioni per tipo documento
  documentTypes = [
    'Carta d\'identità',
    'Passaporto',
    'Patente di guida',
    'Permesso di soggiorno'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<TenantFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tenantId?: number; tenant?: Tenant },
    private imageService: ImageService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Controlla se siamo in modalità modifica
    if (this.data && this.data.tenantId) {
      this.isEditMode = true;
      this.tenantId = this.data.tenantId;
      
      // Se abbiamo già i dati del tenant aggiornati, usali direttamente
      if (this.data.tenant) {
        this.currentTenant = this.data.tenant;
        this.updateForm(this.currentTenant);
        this.loadDocumentImages(this.currentTenant);
        this.isLoading = false;
      } else {
        // Altrimenti carica dal backend
        this.loadTenantData(this.data.tenantId);
      }
    } else {
      this.isEditMode = false;
      this.currentTenant = {} as Tenant;
    }
  }

  initForm(): void {
    this.tenantForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]+$')]],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      documentExpiryDate: ['', Validators.required],
      address: [''],
      communicationPreferences: this.fb.group({
        email: [false],
        sms: [false],
        whatsapp: [true]
      }),
      notes: ['']
    });
  }

  loadTenantData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.documentLoadingFront = false;
    this.documentLoadingBack = false;

    this.apiService.getById<Tenant>('tenants', id).subscribe({
      next: (tenant) => {
        this.currentTenant = tenant;
        this.updateForm(tenant);
        // Carica le immagini dopo l'aggiornamento del form
        this.loadDocumentImages(tenant);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei dati dell\'inquilino', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'inquilino.';
        this.isLoading = false;
      }
    });
  }

  // Carica le immagini dei documenti
  loadDocumentImages(tenant: Tenant): void {
    // Carica l'immagine fronte se presente
    if (tenant.documentFrontImage && tenant.documentFrontImage !== '') {
      this.documentLoadingFront = true;
      
      this.imageService.preloadImage(tenant.documentFrontImage).subscribe({
        next: (dataUrl) => {
          this.documentFrontImageSrc = dataUrl;
          this.frontPreview = dataUrl; // Imposta anche frontPreview
          this.documentLoadingFront = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Errore caricamento immagine fronte:', error);
          this.documentLoadingFront = false;
          this.cdr.markForCheck();
        }
      });
    }
    
    // Carica l'immagine retro se presente
    if (tenant.documentBackImage && tenant.documentBackImage !== '') {
      this.documentLoadingBack = true;
      
      this.imageService.preloadImage(tenant.documentBackImage).subscribe({
        next: (dataUrl) => {
          this.documentBackImageSrc = dataUrl;
          this.backPreview = dataUrl; // Imposta anche backPreview
          this.documentLoadingBack = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Errore caricamento immagine retro:', error);
          this.documentLoadingBack = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  updateForm(tenant: Tenant): void {
    this.tenantForm.patchValue({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email || '',
      phone: tenant.phone,
      documentType: tenant.documentType,
      documentNumber: tenant.documentNumber,
      documentExpiryDate: tenant.documentExpiryDate,
      address: tenant.address || '',
      communicationPreferences: {
        email: tenant.communicationPreferences?.email || false,
        sms: tenant.communicationPreferences?.sms || false,
        whatsapp: tenant.communicationPreferences?.whatsapp || false
      },
      notes: tenant.notes || '',
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
    
    // Set document image previews if available
    if (tenant.documentFrontImage) {
      this.frontPreview = tenant.documentFrontImage;
    }
    
    if (tenant.documentBackImage) {
      this.backPreview = tenant.documentBackImage;
    }
  }

  getImageUrl(url: string | undefined): string {
    if (!url || url === '') {
      return '';
    }
    
    // Se il percorso inizia già con http, restituiscilo come è
    if (url.startsWith('http')) {
      return url;
    }
    
    // Gestisci il prefisso /static/ se necessario
    if (!url.startsWith('/static/') && url.startsWith('/')) {
      url = '/static' + url;
    }
    
    // Il backend gestisce automaticamente la sincronizzazione
    return `${environment.apiUrl}${url}`;
  }

  getFormControlError(controlName: string): string {
    const control = this.tenantForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }
    if (control?.hasError('pattern')) {
      if (controlName === 'phone') {
        return 'Formato telefono non valido (solo numeri, spazi e +)';
      }
      return 'Formato non valido';
    }
    return 'Campo non valido';
  }

  onFrontImageSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      
      // Mostro un indicatore di caricamento
      this.documentLoadingFront = true;
      
      // Crea subito l'anteprima dell'immagine per feedback immediato
      const reader = new FileReader();
      reader.onload = () => {
        this.frontPreview = reader.result as string;
        this.documentFrontImageSrc = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
      
      // Ottieni l'ID del tenant
      const tenantId = this.tenantId || (this.currentTenant?.id);
      
      if (tenantId) {
        // Carica immediatamente l'immagine sul server
        this.uploadFrontImage(file, tenantId);
      } else {
        // Se non abbiamo un ID (nuova creazione), salviamo solo il file per l'upload finale
        this.frontImageFile = file;
        this.documentLoadingFront = false;
        this.cdr.markForCheck();
      }
    }
  }

  onBackImageSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      
      // Mostro un indicatore di caricamento
      this.documentLoadingBack = true;
      
      // Crea subito l'anteprima dell'immagine per feedback immediato
      const reader = new FileReader();
      reader.onload = () => {
        this.backPreview = reader.result as string;
        this.documentBackImageSrc = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
      
      // Ottieni l'ID del tenant
      const tenantId = this.tenantId || (this.currentTenant?.id);
      
      if (tenantId) {
        // Carica immediatamente l'immagine sul server
        this.uploadBackImage(file, tenantId);
      } else {
        // Se non abbiamo un ID (nuova creazione), salviamo solo il file per l'upload finale
        this.backImageFile = file;
        this.documentLoadingBack = false;
        this.cdr.markForCheck();
      }
    }
  }

  // Metodo per caricare il fronte del documento
  uploadFrontImage(file: File, tenantId: number): void {
    this.isLoading = true;
    this.documentLoadingFront = true;
    this.cdr.markForCheck();
    

    
    // Creiamo un FormData da inviare al server
    const formData = new FormData();
    formData.append('image', file);
    
    // Usa il servizio API per caricare il file
    this.apiService.uploadFile('tenants', tenantId, 'documents/front', file).subscribe({
      next: (response) => {
        // Aggiorna l'inquilino con il nuovo URL dell'immagine
        if (response.imageUrl) {
          this.currentTenant.documentFrontImage = response.imageUrl;
          
          // Aggiorna l'UI con feedback
          this.snackBar.open('Fronte del documento caricato', 'Chiudi', { duration: 3000 });
          
          // Assicuriamoci che sia tutto aggiornato correttamente
          this.loadDocumentImages(this.currentTenant);
        }
        
        // Nascondi l'indicatore di caricamento
        this.isLoading = false;
        this.documentLoadingFront = false;
        
        // Non serve più salvare il file per l'upload finale, è già stato caricato
        this.frontImageFile = null;
        
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Errore nel caricamento del documento fronte:', error);
        
        // Feedback all'utente
        this.snackBar.open('Errore nel caricamento del documento', 'Chiudi', { duration: 3000 });
        
        // Nascondi l'indicatore di caricamento ma mantieni il file per l'upload successivo
        this.isLoading = false;
        this.documentLoadingFront = false;
        this.frontImageFile = file;
        
        this.cdr.markForCheck();
      }
    });
  }

  // Metodo per caricare il retro del documento
  uploadBackImage(file: File, tenantId: number): void {
    this.isLoading = true;
    this.documentLoadingBack = true;
    this.cdr.markForCheck();
    

    
    // Creiamo un FormData da inviare al server
    const formData = new FormData();
    formData.append('image', file);
    
    // Usa il servizio API per caricare il file
    this.apiService.uploadFile('tenants', tenantId, 'documents/back', file).subscribe({
      next: (response) => {
        // Aggiorna l'inquilino con il nuovo URL dell'immagine
        if (response.imageUrl) {
          this.currentTenant.documentBackImage = response.imageUrl;
          
          // Aggiorna l'UI con feedback
          this.snackBar.open('Retro del documento caricato', 'Chiudi', { duration: 3000 });
          
          // Assicuriamoci che sia tutto aggiornato correttamente
          this.loadDocumentImages(this.currentTenant);
        }
        
        // Nascondi l'indicatore di caricamento
        this.isLoading = false;
        this.documentLoadingBack = false;
        
        // Non serve più salvare il file per l'upload finale, è già stato caricato
        this.backImageFile = null;
        
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Errore nel caricamento del documento retro:', error);
        
        // Feedback all'utente
        this.snackBar.open('Errore nel caricamento del documento', 'Chiudi', { duration: 3000 });
        
        // Nascondi l'indicatore di caricamento ma mantieni il file per l'upload successivo
        this.isLoading = false;
        this.documentLoadingBack = false;
        this.backImageFile = file;
        
        this.cdr.markForCheck();
      }
    });
  }

  // Rimuove l'immagine fronte
  removeFrontImage(): void {
    console.log('removeFrontImage chiamato', {
      'this.tenantId': this.tenantId,
      'this.data': this.data,
      'this.currentTenant': this.currentTenant
    });

    // Assicurati di avere sempre un ID valido
    const tenantIdToUse = this.tenantId || (this.currentTenant?.id) || (this.data?.tenantId);
    
    if (!tenantIdToUse) {
      console.error('Nessun ID tenant valido trovato!');
      this.snackBar.open('Errore: ID inquilino non valido', 'Chiudi', { duration: 3000 });
      return;
    }

    // Resetta le proprietà locali PRIMA di chiamare l'API
    this.frontPreview = null;
    this.frontImageFile = null;
    this.documentFrontImageSrc = '';
    
    // Resetta anche l'input file
    if (this.fileInputFront) {
      this.fileInputFront.nativeElement.value = '';
    }
    
    // Assegna subito l'immagine del documento a stringa vuota
    // per feedback immediato all'utente anche se l'API fallisce
    if (this.currentTenant.documentFrontImage) {
      // Salva una copia dell'immagine originale prima di cancellarla (per sicurezza)
      const originalImage = this.currentTenant.documentFrontImage;
      
      // Mostriamo immediatamente lo stato di caricamento
      this.isLoading = true;
      this.documentLoadingFront = true;
      this.currentTenant.documentFrontImage = '';
      this.cdr.markForCheck();
      
      console.log(`Eliminazione documento front dell'inquilino ID: ${tenantIdToUse}`);
      
      this.apiService.deleteFile('tenants', tenantIdToUse, 'documents/front').subscribe({
        next: () => {
          console.log('Documento fronte eliminato con successo');
          
          // Aggiorna l'UI immediatamente
          this.snackBar.open('Fronte del documento rimosso', 'Chiudi', { duration: 3000 });
          
          // Assicurati che l'immagine sia rimossa e l'input file sia vuoto
          this.currentTenant.documentFrontImage = '';
          this.frontPreview = null;
          this.frontImageFile = null;
          this.documentFrontImageSrc = '';
          if (this.fileInputFront) {
            this.fileInputFront.nativeElement.value = '';
          }
          
          // Nascondi i loader
          this.isLoading = false;
          this.documentLoadingFront = false;
          
          // Forza l'aggiornamento della vista
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => {
          console.error('Errore nella rimozione del documento', error);
          
          // In caso di errore, ripristina l'immagine originale
          this.currentTenant.documentFrontImage = originalImage;
          
          this.snackBar.open('Errore nella rimozione del documento', 'Chiudi', { duration: 3000 });
          this.isLoading = false;
          this.documentLoadingFront = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  // Rimuove l'immagine retro
  removeBackImage(): void {
    console.log('removeBackImage chiamato', {
      'this.tenantId': this.tenantId,
      'this.data': this.data,
      'this.currentTenant': this.currentTenant
    });

    // Assicurati di avere sempre un ID valido
    const tenantIdToUse = this.tenantId || (this.currentTenant?.id) || (this.data?.tenantId);
    
    if (!tenantIdToUse) {
      console.error('Nessun ID tenant valido trovato!');
      this.snackBar.open('Errore: ID inquilino non valido', 'Chiudi', { duration: 3000 });
      return;
    }

    // Resetta le proprietà locali PRIMA di chiamare l'API
    this.backPreview = null;
    this.backImageFile = null;
    this.documentBackImageSrc = '';
    
    // Resetta anche l'input file
    if (this.fileInputBack) {
      this.fileInputBack.nativeElement.value = '';
    }
    
    // Assegna subito l'immagine del documento a stringa vuota
    // per feedback immediato all'utente anche se l'API fallisce
    if (this.currentTenant.documentBackImage) {
      // Salva una copia dell'immagine originale prima di cancellarla (per sicurezza)
      const originalImage = this.currentTenant.documentBackImage;
      
      // Mostriamo immediatamente lo stato di caricamento
      this.isLoading = true;
      this.documentLoadingBack = true;
      this.currentTenant.documentBackImage = '';
      this.cdr.markForCheck();
      
      console.log(`Eliminazione documento back dell'inquilino ID: ${tenantIdToUse}`);
      
      this.apiService.deleteFile('tenants', tenantIdToUse, 'documents/back').subscribe({
        next: () => {
          console.log('Documento retro eliminato con successo');
          
          // Aggiorna l'UI immediatamente
          this.snackBar.open('Retro del documento rimosso', 'Chiudi', { duration: 3000 });
          
          // Assicurati che l'immagine sia rimossa e l'input file sia vuoto
          this.currentTenant.documentBackImage = '';
          this.backPreview = null;
          this.backImageFile = null;
          this.documentBackImageSrc = '';
          if (this.fileInputBack) {
            this.fileInputBack.nativeElement.value = '';
          }
          
          // Nascondi i loader
          this.isLoading = false;
          this.documentLoadingBack = false;
          
          // Forza l'aggiornamento della vista
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => {
          console.error('Errore nella rimozione del documento', error);
          
          // In caso di errore, ripristina l'immagine originale
          this.currentTenant.documentBackImage = originalImage;
          
          this.snackBar.open('Errore nella rimozione del documento', 'Chiudi', { duration: 3000 });
          this.isLoading = false;
          this.documentLoadingBack = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  // Modificare il metodo onSubmit per gestire meglio le immagini
  onSubmit(): void {
    if (this.tenantForm.invalid) {
      // Mark fields as touched to show errors
      Object.keys(this.tenantForm.controls).forEach(key => {
        const control = this.tenantForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
  
    this.isLoading = true;
    this.errorMessage = null;
    
    // Crea una copia pulita dei valori del form senza campi gestiti dal server
    const formValues = {...this.tenantForm.value};
    
    // Converti la data in formato YYYY-MM-DD
    if (formValues.documentExpiryDate) {
      const dateObj = new Date(formValues.documentExpiryDate);
      formValues.documentExpiryDate = dateObj.toISOString().split('T')[0];
    }
    
    // Crea un oggetto tenant con i campi necessari, includendo esplicitamente le immagini
    const currentUser = this.authService.getCurrentUser();
    const tenantToUpdate = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      documentType: formValues.documentType,
      documentNumber: formValues.documentNumber,
      documentExpiryDate: formValues.documentExpiryDate,
      address: formValues.address || "",
      communicationPreferences: formValues.communicationPreferences,
      notes: formValues.notes || "",
      userId: currentUser?.id, // ← AGGIUNGI userId
      // Aggiungi esplicitamente gli URL delle immagini, anche se vuoti
      documentFrontImage: this.currentTenant.documentFrontImage || "",
      documentBackImage: this.currentTenant.documentBackImage || ""
    };
    
    // Preparare i file solo se non sono già stati caricati
    const files: File[] = [];
    
    // Assicuriamoci che i file siano effettivamente da caricare
    // Ma solo se non abbiamo già caricato le immagini sul server
    if (this.frontImageFile && (!this.currentTenant.documentFrontImage || this.currentTenant.documentFrontImage === '')) {
      console.log('Includendo nuova immagine fronte nell\'aggiornamento');
      files.push(this.frontImageFile);
    }
    
    if (this.backImageFile && (!this.currentTenant.documentBackImage || this.currentTenant.documentBackImage === '')) {
      console.log('Includendo nuova immagine retro nell\'aggiornamento');
      files.push(this.backImageFile);
    }
    
    this.snackBar.open('Salvataggio in corso...', '', {
      duration: 0,
    });
    
    console.log('Aggiornamento inquilino con', {
      'dati': tenantToUpdate,
      'file': files.map(f => f.name),
      'isEditMode': this.isEditMode,
      'tenantId': this.tenantId,
      'documentFrontImage': this.currentTenant.documentFrontImage ? 'presente' : 'assente',
      'documentBackImage': this.currentTenant.documentBackImage ? 'presente' : 'assente'
    });
    
    // Gestione più intelligente dell'endpoint da utilizzare
    let saveObservable;
    
    if (this.isEditMode && this.tenantId) {
      // Siamo in modalità modifica
      if (files.length > 0) {
        // Se ci sono file da caricare, usa il metodo di update normale con FormData
        console.log('Usando endpoint with-images perché ci sono nuovi file da caricare');
        saveObservable = this.apiService.update<Tenant>('tenants', this.tenantId, tenantToUpdate, files);
      } else {
        // Se non ci sono file, usa una chiamata HTTP PUT diretta all'endpoint standard senza /with-images
        // Questo evita problemi con il FormData quando non ci sono file
        console.log('Usando endpoint PUT standard perché non ci sono nuovi file da caricare');
        const url = `${environment.apiUrl}/tenants/${this.tenantId}`;
        saveObservable = this.http.put<Tenant>(url, tenantToUpdate);
      }
    } else {
      // Siamo in modalità creazione
      console.log('Modalità creazione: usando endpoint create standard');
      saveObservable = this.apiService.create<Tenant>('tenants', tenantToUpdate, files);
    }

    saveObservable.subscribe({
      next: (tenant) => {
        this.isLoading = false;
        this.snackBar.dismiss();
        // Aggiungi notifica
        if (tenant) {
          const action = this.isEditMode ? 'updated' : 'created';
          const tenantName = `${tenant.firstName} ${tenant.lastName}`;
          this.notificationService.notifyTenant(action, tenantName, tenant.id);
        }
        
        this.snackBar.open(
          this.isEditMode ? 'Inquilino aggiornato con successo' : 'Inquilino creato con successo', 
          'Chiudi', 
          { duration: 3000 }
        );
        
        // Aggiorna i dati dell'inquilino corrente
        if (tenant) {
          this.currentTenant = tenant;
          
          // Reset file references
          this.frontImageFile = null;
          this.backImageFile = null;
          
          // Ricarica le immagini fresche dal server per sicurezza
          if (this.isEditMode) {
            this.loadDocumentImages(tenant);
          }
        }
        
        // Chiudi il dialog e passa i dati aggiornati
        this.dialogRef.close({ success: true, tenant: tenant });
      },
      error: (error) => {
        console.error(`Errore durante ${this.isEditMode ? 'l\'aggiornamento' : 'la creazione'} dell'inquilino`, error);
        this.isLoading = false;
        this.snackBar.dismiss();
        this.errorMessage = `Si è verificato un errore durante ${this.isEditMode ? 'l\'aggiornamento' : 'la creazione'} dell'inquilino.`;
        this.snackBar.open(`Errore durante ${this.isEditMode ? 'l\'aggiornamento' : 'la creazione'} dell'inquilino`, 'Chiudi', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Metodo per chiudere il dialog
  onCancel(): void {
    this.dialogRef.close();
  }

  // Metodi helper
  private handleSuccess(action: string, id?: number): void {
    this.isLoading = false;
    this.snackBar.open(`Inquilino ${action} con successo`, 'Chiudi', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
    this.router.navigate(id ? ['/tenant/detail', id] : ['/tenant/list']);
  }

  private handleError(error: any, action: string): void {
    console.error(`Errore durante ${action} dell'inquilino`, error);
    this.isLoading = false;
    this.errorMessage = `Si è verificato un errore durante ${action} dell'inquilino.`;
    this.snackBar.open(`Errore durante ${action} dell'inquilino`, 'Chiudi', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  togglePreference(preference: 'email' | 'sms' | 'whatsapp'): void {
    const control = this.tenantForm.get(`communicationPreferences.${preference}`);
    if (control) {
      control.setValue(!control.value);
    }
  }
}