import { GenericApiService } from './../../shared/services/genericApi.service';
import { Component, OnInit } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

// import { ApartmentService } from '../../shared/services/apartment.service';
import { Apartment } from '../../shared/models';

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
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './apartment-form.component.html',
  styleUrls: ['./apartment-form.component.scss']
})
export class ApartmentFormComponent implements OnInit {
  apartmentForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  apartmentId: string | null = null;
  errorMessage: string | null = null;
  selectedAmenities: string[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];
  
  // Immagini
  currentApartment: Apartment = {} as Apartment;
  imageFiles: (File | null)[] = [null, null, null, null, null , null, null, null];
  imagePreviews: (string | null)[] = [null, null, null, null, null , null, null, null];
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private genericApiService: GenericApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Controlla se siamo in modalità modifica
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.apartmentId = id;
      this.loadApartmentData(id);
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
      hasBalcony: [false],
      hasParking: [false],
      isFurnished: [false],
      isAvailable: [true],
      monthlyRent: [0, [Validators.required, Validators.min(0)]],
      status: ['available', Validators.required],
      notes: ['']
    });
  }

  loadApartmentData(id: any): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.genericApiService.getById<Apartment>('apartment', id).subscribe({
      next: (apartment) => {
        this.currentApartment = apartment;
        this.updateForm(apartment);
        this.selectedAmenities = apartment.amenities || [];
        
        // Carica le anteprime delle immagini se disponibili
        if (apartment.images && apartment.images.length > 0) {
          apartment.images.forEach((imageUrl, index) => {
            if (index < 5) {
              this.imagePreviews[index] = imageUrl;
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
      hasBalcony: apartment.hasBalcony,
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
    this.imagePreviews[index] = null;
    this.imageFiles[index] = null;
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
      this.genericApiService.update<Apartment>(
        "apartament",
        this.apartmentId, 
        this.currentApartment,
        validImageFiles.length > 0 ? validImageFiles : undefined
      ).subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('Appartamento aggiornato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/apartment/detail', this.apartmentId]);
        },
        error: (error) => {
          console.error('Errore durante l\'aggiornamento dell\'appartamento', error);
          this.errorMessage = 'Si è verificato un errore durante l\'aggiornamento dell\'appartamento.';
          this.isLoading = false;
        }
      });
    } else {
      // Crea un nuovo appartamento
      this.genericApiService.create<Apartment>(
        "apartment",
        this.currentApartment ,
        validImageFiles.length > 0 ? validImageFiles : undefined
      ).subscribe({
        next: (apartment) => {
          this.isLoading = false;
          this.snackBar.open('Appartamento creato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/apartment/detail', apartment.id]);
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
}