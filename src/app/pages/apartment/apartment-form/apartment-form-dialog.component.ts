import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs/operators';
import { ImageService } from '../../../shared/services/image.service';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Apartment } from '../../../shared/models';
import { NotificationService } from '../../../shared/services/notification.service';

// Definizione dell'interfaccia per i servizi comuni
interface CommonService {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-apartment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './apartment-form-dialog.component.html',
  styleUrls: ['./apartment-form-dialog.component.scss']
})
export class ApartmentFormComponent implements OnInit {
  apartmentForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  apartmentId: number | null = null;
  errorMessage: string | null = null;
  selectedAmenities: string[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];
  isDragging = false;
  
  // New approach with dynamic arrays
  currentApartment: Apartment = {} as Apartment;
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  // Cache per le immagini nuove già convertite in base64
  private newImagePreviews: string[] = [];

  // Lista di servizi comuni con le loro icone
  commonServices: CommonService[] = [
    { name: 'WiFi', icon: 'wifi' },
    { name: 'Aria Condizionata', icon: 'ac_unit' },
    { name: 'Riscaldamento', icon: 'wb_sunny' },
    { name: 'Lavatrice', icon: 'local_laundry_service' },
    { name: 'TV', icon: 'tv' },
    { name: 'Ascensore', icon: 'elevator' },
    { name: 'Balcone', icon: 'balcony' },
    { name: 'Lavastoviglie', icon: 'countertops' },
    { name: 'Palestra', icon: 'fitness_center' },
    { name: 'Animali ammessi', icon: 'pets' },
    { name: 'Sicurezza', icon: 'security' },
    { name: 'Area BBQ comune', icon: 'outdoor_grill' },
    { name: 'Fumo', icon: 'smoking_rooms' },
    { name: 'Cassaforte', icon: 'lock' },
    { name: 'Accesso disabili', icon: 'accessible' },
  ];
  
  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ApartmentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { apartmentId?: number; apartment?: Apartment },
    private imageService: ImageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Controlla se siamo in modalità modifica
    if (this.data && this.data.apartmentId) {
      this.isEditMode = true;
      this.apartmentId = this.data.apartmentId;
      
      // Se abbiamo già i dati dell'appartamento aggiornati, usali direttamente
      if (this.data.apartment) {
        this.currentApartment = this.data.apartment;
        this.updateForm(this.currentApartment);
        this.selectedAmenities = this.currentApartment.amenities || [];
        
        // Clear existing arrays
        this.imageFiles = [];
        this.imagePreviews = [];
        this.newImagePreviews = [];
        
        // Carica le anteprime delle immagini se disponibili
        if (this.currentApartment.images && this.currentApartment.images.length > 0) {
          // Carica ogni immagine con il suo URL corretto
          this.currentApartment.images.forEach((imageUrl) => {
            // Usa il metodo getImageUrl per ottenere l'URL completo
            const fullUrl = this.getImageUrl(imageUrl);
            this.imagePreviews.push(fullUrl);
          });
        }
        
        this.isLoading = false;
      } else {
        // Altrimenti carica dal backend
        this.loadApartmentData(this.data.apartmentId);
      }
    } else {
      this.isEditMode = false;
      this.currentApartment = {} as Apartment;
    }
  }

  initForm(): void {
    this.apartmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      floor: [0, [Validators.required, Validators.min(0)]],
      squareMeters: [0, [Validators.required, Validators.min(1)]],
      rooms: [1, [Validators.required, Validators.min(1)]],
      bathrooms: [1, [Validators.required, Validators.min(1)]],
      hasParking: [true],
      isFurnished: [true],
      monthlyRent: [0, [Validators.required, Validators.min(0)]],
      status: ['available', Validators.required],
      notes: ['']
    });
  }

  loadApartmentData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Use the getById method without the third parameter
    this.apiService.getById<Apartment>('apartments', id).subscribe({
      next: (apartment) => {
        this.currentApartment = apartment;
        this.updateForm(apartment);
        this.selectedAmenities = apartment.amenities || [];
        
        // Clear existing arrays
        this.imageFiles = [];
        this.imagePreviews = [];
        this.newImagePreviews = [];
        
        // Carica le anteprime delle immagini se disponibili
        if (apartment.images && apartment.images.length > 0) {
          // Carica ogni immagine con il suo URL corretto
          apartment.images.forEach((imageUrl) => {
            // Usa il metodo getImageUrl per ottenere l'URL completo
            const fullUrl = this.getImageUrl(imageUrl);
            this.imagePreviews.push(fullUrl);
          });
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'appartamento.';
        this.isLoading = false;
      }
    });
  }

  updateForm(apartment: Apartment): void {
    this.apartmentForm.patchValue({
      name: apartment.name,
      description: apartment.description,
      floor: apartment.floor,
      squareMeters: apartment.squareMeters,
      rooms: apartment.rooms,
      bathrooms: apartment.bathrooms,
      hasParking: apartment.hasParking,
      isFurnished: apartment.isFurnished,
      monthlyRent: apartment.monthlyRent,
      status: apartment.status,
      notes: apartment.notes
    });
  }

  // Image management methods for dynamic arrays
  getImageCount(): number {
    // Usa il metodo filtrato invece dell'array completo
    return this.getFilteredPreviews().length;
  }

  // Nuovo metodo per filtrare le immagini non valide
  getFilteredPreviews(): string[] {
    // Filtra le immagini vuote o rotte
    const filtered = this.imagePreviews.filter(preview => 
      preview && preview !== '' && !preview.includes('undefined'));
    
    return filtered;
  }

  onMultipleImagesSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Calculate available slots
    const currentCount = this.getImageCount();
    const availableSlots = 8 - currentCount;
    
    if (availableSlots <= 0) {
      this.snackBar.open('Hai già caricato il numero massimo di immagini (8)', 'Chiudi', {
        duration: 3000
      });
      return;
    }
    
    // Process files with proper type casting
    const filesToProcess = Array.from(files).slice(0, availableSlots) as File[];
    
    filesToProcess.forEach((file: File) => {
      // Add the file to our array
      this.imageFiles.push(file);
      
      // Create a preview and cache it
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        this.newImagePreviews.push(base64);
        this.imagePreviews.push(base64);
      };
      reader.readAsDataURL(file);
    });
    
    // Notify if we couldn't add all files
    if (files.length > availableSlots) {
      this.snackBar.open(`Sono state aggiunte ${availableSlots} immagini. Limite massimo di 8 immagini raggiunto.`, 'Chiudi', {
        duration: 4000
      });
    }
  }

  // Drag & drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Create a mock event object to reuse existing logic
      const mockEvent = { target: { files: files } };
      this.onMultipleImagesSelected(mockEvent);
    }
  }

  // Metodo per eliminare immagini
  removeImage(index: number): void {
    this.isLoading = true;
    
    if (this.isEditMode && this.apartmentId) {
      const originalImagesCount = this.currentApartment.images?.length || 0;
      
      if (index < originalImagesCount) {
        // Elimina immagine esistente dal backend
        const imagePath = this.currentApartment.images![index];
        const fileName = imagePath.split('/').pop() || '';
        
        this.apiService.deleteFile('apartments', this.apartmentId, `images/${fileName}`)
          .pipe(finalize(() => this.isLoading = false))
          .subscribe({
            next: () => {
              // Rimuovi dall'array e ricostruisci le preview
              this.currentApartment.images!.splice(index, 1);
              this.rebuildImagePreviews();
              
              this.snackBar.open('Immagine eliminata con successo', '', {
                duration: 2000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom'
              });
            },
            error: (error) => {
              this.snackBar.open('Errore nella rimozione dell\'immagine', '', {
                duration: 2000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom'
              });
            }
          });
      } else {
        // Elimina immagine nuova (solo frontend)
        const newImageIndex = index - originalImagesCount;
        
        if (newImageIndex >= 0 && newImageIndex < this.imageFiles.length) {
          this.imageFiles.splice(newImageIndex, 1);
          if (newImageIndex < this.newImagePreviews.length) {
            this.newImagePreviews.splice(newImageIndex, 1);
          }
        }
        
        this.rebuildImagePreviews();
        this.isLoading = false;
        
        this.snackBar.open('Immagine rimossa', '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    } else {
      // Nuovo appartamento - elimina solo dal frontend
      if (index < this.imageFiles.length) {
        this.imageFiles.splice(index, 1);
        if (index < this.newImagePreviews.length) {
          this.newImagePreviews.splice(index, 1);
        }
      }
      
      this.rebuildImagePreviews();
      this.isLoading = false;
      
      this.snackBar.open('Immagine rimossa', '', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }
  
  // Metodo per ricostruire completamente l'array imagePreviews
  private rebuildImagePreviews(): void {
    this.imagePreviews = [];
    
    // Aggiungi le immagini esistenti dal backend
    if (this.currentApartment.images && this.currentApartment.images.length > 0) {
      this.currentApartment.images.forEach((imageUrl) => {
        const fullUrl = this.getImageUrl(imageUrl);
        this.imagePreviews.push(fullUrl);
      });
    }
    
    // Aggiungi le nuove immagini dal cache
    this.newImagePreviews.forEach((base64) => {
      this.imagePreviews.push(base64);
    });
  }



  getImageUrl(url: string | undefined): string {
    if (!url || url === '') {
      return '';
    }
    
    // If path already starts with http, return as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Make sure path starts with /static/
    if (!url.startsWith('/static/') && url.startsWith('/')) {
      url = '/static' + url;
    }
    
    // Il backend gestisce automaticamente la sincronizzazione
    const apiUrl = environment.apiUrl;
    return `${apiUrl}${url}`;
  }

  addAmenity(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    
    // Add the amenity
    if (value) {
      this.selectedAmenities.push(value);
    }
    
    // Clear the input value
    event.chipInput!.clear();
  }

  removeAmenity(amenity: string): void {
    const index = this.selectedAmenities.indexOf(amenity);

    if (index >= 0) {
      this.selectedAmenities.splice(index, 1);
    }
  }

  onSubmit(): void {
    if (this.apartmentForm.invalid) {
      // Mark all fields as touched to show errors
      this.markFormGroupTouched(this.apartmentForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Update current apartment with form values
    this.currentApartment = {
      ...this.currentApartment,
      ...this.apartmentForm.value,
      amenities: this.selectedAmenities
    };



     // Assicurati di inviare solo le immagini valide
    const validImages = this.currentApartment.images ? 
    this.currentApartment.images.filter(img => img && img !== '') : [];
    
    // Crea un oggetto che includa esplicitamente tutti i campi necessari
    const apartmentData = {
      name: this.apartmentForm.value.name,
      description: this.apartmentForm.value.description,
      floor: this.apartmentForm.value.floor,
      squareMeters: this.apartmentForm.value.squareMeters,
      rooms: this.apartmentForm.value.rooms,
      bathrooms: this.apartmentForm.value.bathrooms,
      hasParking: this.apartmentForm.value.hasParking,
      isFurnished: this.apartmentForm.value.isFurnished,
      monthlyRent: this.apartmentForm.value.monthlyRent,
      status: this.apartmentForm.value.status,
      notes: this.apartmentForm.value.notes,
      amenities: this.selectedAmenities,
      images: validImages
    };

    if (this.isEditMode && this.apartmentId) {
      // Update existing apartment
      this.apiService.update<Apartment>(
        'apartments', 
        this.apartmentId, 
        apartmentData,
        this.imageFiles.length > 0 ? this.imageFiles : undefined
      ).subscribe({
        next: (updatedApartment) => {
          this.isLoading = false;

          // Aggiungi notifica
          this.notificationService.notifyApartment('updated', updatedApartment.name, updatedApartment.id);

          this.snackBar.open('Appartamento aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          // Pass a flag to indicate not to open detail dialog
          this.dialogRef.close({ 
            success: true, 
            apartment: updatedApartment, 
            skipDetailView: true 
          });
        },
        error: (error) => {
          this.errorMessage = 'Si è verificato un errore durante l\'aggiornamento dell\'appartamento.';
          this.isLoading = false;
        }
      });
    } else {
      // Create new apartment
      this.apiService.create<Apartment>(
        'apartments',
        apartmentData,
        this.imageFiles.length > 0 ? this.imageFiles : undefined
      ).subscribe({
        next: (apartment) => {
          this.isLoading = false;
          
          // Aggiungi notifica
          this.notificationService.notifyApartment('created', apartment.name, apartment.id);
          
          this.snackBar.open('Appartamento creato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          // Pass a flag to indicate not to open detail dialog
          this.dialogRef.close({ 
            success: true, 
            apartment: apartment, 
            skipDetailView: true 
          });
        },
        error: (error) => {
          this.errorMessage = 'Si è verificato un errore durante la creazione dell\'appartamento.';
          this.isLoading = false;
        }
      });
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFormControlError(controlName: string): string {
    const control = controlName.includes('.') ? 
      this.apartmentForm.get(controlName) : 
      this.apartmentForm.get(controlName);
      
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('min')) {
      return `Valore minimo: ${control.getError('min').min}`;
    }
    if (control?.hasError('max')) {
      return `Valore massimo: ${control.getError('max').max}`;
    }
    if (control?.hasError('maxlength')) {
      return `Massimo ${control.getError('maxlength').requiredLength} caratteri`;
    }
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Verifica se un servizio è già selezionato
  isServiceSelected(serviceName: string): boolean {
    return this.selectedAmenities.includes(serviceName);
  }

  // Attiva/disattiva un servizio dalla lista
  toggleService(serviceName: string): void {
    if (this.isServiceSelected(serviceName)) {
      this.removeAmenity(serviceName);
    } else {
      this.selectedAmenities.push(serviceName);
    }
  }

  // Aggiunge un servizio personalizzato
  addCustomService(serviceName: string): void {
    const trimmedName = serviceName.trim();
    
    if (!trimmedName) {
      return;
    }
    
    // Controlla se il servizio esiste già
    if (!this.isServiceSelected(trimmedName)) {
      this.selectedAmenities.push(trimmedName);
    }
  }

  // Ottiene l'icona appropriata per un servizio
  getServiceIcon(serviceName: string): string {
    const serviceLower = serviceName.toLowerCase();
    
    // Cerca nei servizi comuni
    for (const service of this.commonServices) {
      if (service.name.toLowerCase() === serviceLower) {
        return service.icon;
      }
    }
    
    // Mappa per servizi aggiuntivi
    const iconMap: { [key: string]: string } = {
      'internet': 'wifi',
      'garage': 'garage',
      'asciugatrice': 'dry_cleaning',
      'terrazza': 'deck',
      'giardino': 'grass',
      'portiere': 'person',
      'pulizie': 'cleaning_services',
      'piscina': 'pool'
    };
    
    // Cerca corrispondenze parziali
    for (const key in iconMap) {
      if (serviceLower.includes(key) || key.includes(serviceLower)) {
        return iconMap[key];
      }
    }
    
    // Icona predefinita
    return 'check_circle';
  }
}