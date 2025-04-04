import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';

import { GenericApiService } from '../../../shared/services/generic-api.service';
import { Apartment } from '../../../shared/models';

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
  
  // Immagini
  currentApartment: Apartment = {} as Apartment;
  imageFiles: (File | null)[] = [null, null, null, null, null, null, null, null];
  imagePreviews: (string | null)[] = [null, null, null, null, null, null, null, null];
  
  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ApartmentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { apartmentId?: number }
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Controlla se siamo in modalità modifica
    if (this.data && this.data.apartmentId) {
      this.isEditMode = true;
      this.apartmentId = this.data.apartmentId;
      this.loadApartmentData(this.data.apartmentId);
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
      isAvailable: [true],
      monthlyRent: [0, [Validators.required, Validators.min(0)]],
      status: ['available', Validators.required],
      notes: ['']
    });
  }

  loadApartmentData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getById<Apartment>('apartments', id).subscribe({
      next: (apartment) => {
        this.currentApartment = apartment;
        this.updateForm(apartment);
        this.selectedAmenities = apartment.amenities || [];
        
        // Carica le anteprime delle immagini se disponibili
        if (apartment.images && apartment.images.length > 0) {
          // Pulisce prima tutte le anteprime
          this.imagePreviews = this.imagePreviews.map(() => null);
          
          // Carica ogni immagine con il suo URL corretto
          apartment.images.forEach((imageUrl, index) => {
            if (index < this.imagePreviews.length) {
              // Usa il metodo getImageUrl per ottenere l'URL completo
              this.imagePreviews[index] = this.getImageUrl(imageUrl);
              console.log(`Caricata immagine ${index}: ${imageUrl}`);
            }
          });
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei dati dell\'appartamento', error);
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
      isAvailable: apartment.isAvailable,
      monthlyRent: apartment.monthlyRent,
      status: apartment.status,
      notes: apartment.notes
    });
  }

  // Gestione delle immagini
  onImageSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      this.imageFiles[index] = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviews[index] = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    // Se siamo in modalità modifica e l'appartamento ha già immagini salvate
    if (this.isEditMode && this.apartmentId && 
        this.currentApartment.images && 
        this.currentApartment.images[index]) {
      
      this.isLoading = true;
      
      // Ottieni il path completo dell'immagine da eliminare
      const imagePath = this.currentApartment.images[index];
      const apartmentId = this.apartmentId;
      
      // Estrai il nome del file dal path (l'ultimo segmento dopo l'ultimo /)
      const fileName = imagePath.split('/').pop() || '';
      console.log(`Eliminazione immagine: ${fileName} da appartamento ${apartmentId}`);
      
      // Chiamiamo il deleteFile con il nome file specifico
      this.apiService.deleteFile('apartments', apartmentId, `images/${fileName}`).subscribe({
        next: () => {
          console.log(`Immagine ${fileName} eliminata con successo`);
          
          // Rimuovi l'immagine dall'array delle immagini dell'appartamento
          if (this.currentApartment.images) {
            this.currentApartment.images = this.currentApartment.images.filter((_, i) => i !== index);
          }
          
          // Pulisci l'anteprima e il file
          this.imagePreviews[index] = null;
          this.imageFiles[index] = null;
          
          // Riorganizza gli array dopo l'eliminazione
          this.reorderImagesAfterDelete(index);
          
          // Notifica all'utente con un toast rapido
          this.snackBar.open('Immagine eliminata con successo', '', {
            duration: 2000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Errore durante l\'eliminazione dell\'immagine', error);
          console.log('Path usato:', `images/${fileName}`);
          
          // Rimuovi comunque l'immagine dall'UI anche se c'è un errore lato server
          if (this.currentApartment.images) {
            this.currentApartment.images = this.currentApartment.images.filter((_, i) => i !== index);
          }
          this.imagePreviews[index] = null;
          this.imageFiles[index] = null;
          
          // Riorganizza gli array dopo l'eliminazione
          this.reorderImagesAfterDelete(index);
          
          // Notifica all'utente
          this.snackBar.open('Immagine rimossa dall\'interfaccia', '', {
            duration: 2000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          
          this.isLoading = false;
        }
      });
    } else {
      // Se è solo un'immagine locale non ancora salvata, rimuovila senza chiamare il server
      this.imagePreviews[index] = null;
      this.imageFiles[index] = null;
      
      // Riorganizza gli array dopo l'eliminazione
      this.reorderImagesAfterDelete(index);
    }
  }

  // Nuovo metodo per riordinare gli array dopo l'eliminazione
  reorderImagesAfterDelete(deletedIndex: number): void {
    // Crea nuovi array compatti senza elementi null
    const newImageFiles: (File | null)[] = [];
    const newImagePreviews: (string | null)[] = [];
    
    // Copia tutti gli elementi validi negli array temporanei
    for (let i = 0; i < this.imageFiles.length; i++) {
      if (i !== deletedIndex && this.imageFiles[i] !== null) {
        newImageFiles.push(this.imageFiles[i]);
      }
      
      if (i !== deletedIndex && this.imagePreviews[i] !== null) {
        newImagePreviews.push(this.imagePreviews[i]);
      }
    }
    
    // Riempi gli array originali con i nuovi valori seguiti da null
    for (let i = 0; i < this.imageFiles.length; i++) {
      if (i < newImageFiles.length) {
        this.imageFiles[i] = newImageFiles[i];
        this.imagePreviews[i] = newImagePreviews[i];
      } else {
        this.imageFiles[i] = null;
        this.imagePreviews[i] = null;
      }
    }
  }

  getImageUrl(url: string | undefined): string {
    if (!url || url === '') {
      return '';
    }
    
    // Se il percorso inizia già con http, restituiscilo come è
    if (url.startsWith('http')) {
      return `${url}?t=${new Date().getTime()}`;
    }
    
    // Assicurati che il percorso inizi con /static/
    if (!url.startsWith('/static/') && url.startsWith('/')) {
      url = '/static' + url;
    }
    
    // Altrimenti prependi il base URL dell'API e aggiungi timestamp per evitare il caching
    const apiUrl = environment.apiUrl;
    return `${apiUrl}${url}?t=${new Date().getTime()}`;
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
      // Marca tutti i campi come touched per mostrare gli errori
      this.markFormGroupTouched(this.apartmentForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    
    // Aggiorna l'appartamento corrente con i valori del form
    this.currentApartment = {
      ...this.currentApartment,
      ...this.apartmentForm.value,
      amenities: this.selectedAmenities
    };
    
    // Filtra i file delle immagini non nulli
    const validImageFiles = this.imageFiles.filter(file => file !== null) as File[];
    
    if (this.isEditMode && this.apartmentId) {
      // Aggiorna un appartamento esistente
      this.apiService.update<Apartment>(
        'apartments', 
        this.apartmentId, 
        this.currentApartment,
        validImageFiles.length > 0 ? validImageFiles : undefined
      ).subscribe({
        next: (updatedApartment) => {
          this.isLoading = false;
          this.snackBar.open('Appartamento aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          // Passa un flag per indicare di non aprire il dialog di dettaglio
          this.dialogRef.close({ 
            success: true, 
            apartment: updatedApartment, 
            skipDetailView: true 
          });
        },
        error: (error) => {
          console.error('Errore durante l\'aggiornamento dell\'appartamento', error);
          this.errorMessage = 'Si è verificato un errore durante l\'aggiornamento dell\'appartamento.';
          this.isLoading = false;
        }
      });
    } else {
      // Crea un nuovo appartamento
      this.apiService.create<Apartment>(
        'apartments',
        this.currentApartment,
        validImageFiles.length > 0 ? validImageFiles : undefined
      ).subscribe({
        next: (apartment) => {
          this.isLoading = false;
          this.snackBar.open('Appartamento creato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          
          // Passa un flag per indicare di non aprire il dialog di dettaglio
          this.dialogRef.close({ 
            success: true, 
            apartment: apartment, 
            skipDetailView: true 
          });
        },
        error: (error) => {
          console.error('Errore durante la creazione dell\'appartamento', error);
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
}