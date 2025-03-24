import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Apartment } from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';

@Component({
  selector: 'app-reading-form',
  templateUrl: './reading-form.component.html',
  styleUrls: ['./reading-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class ReadingFormComponent implements OnInit {
  readingForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  utilityTypes = [
    { value: 'electricity', label: 'Elettricità' },
    { value: 'water', label: 'Acqua' },
    { value: 'gas', label: 'Gas' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: GenericApiService,
    public dialogRef: MatDialogRef<ReadingFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      apartments: Apartment[],
      selectedApartmentId: number | null
    }
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.readingForm = this.fb.group({
      apartmentId: [this.data.selectedApartmentId || '', Validators.required],
      type: ['', Validators.required],
      readingDate: [new Date(), Validators.required],
      previousReading: [0, [Validators.required, Validators.min(0)]],
      currentReading: [0, [Validators.required, Validators.min(0)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
    });

    // Validazione per assicurarsi che la lettura corrente sia maggiore della precedente
    this.readingForm.get('currentReading')?.valueChanges.subscribe(value => {
      const previousReading = this.readingForm.get('previousReading')?.value || 0;
      if (value < previousReading) {
        this.readingForm.get('currentReading')?.setErrors({ lessThanPrevious: true });
      }
    });
  }

  onSubmit(): void {
    if (this.readingForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const formValue = this.readingForm.value;
    const readingData = {
      apartmentId: formValue.apartmentId,
      type: formValue.type,
      readingDate: formValue.readingDate,
      previousReading: formValue.previousReading,
      currentReading: formValue.currentReading,
      unitCost: formValue.unitCost,
      isPaid: false
    };

    this.apiService.createReading<any>(readingData).subscribe({
      next: () => {
        this.isLoading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Errore durante il salvataggio della lettura', error);
        this.errorMessage = 'Si è verificato un errore durante il salvataggio della lettura.';
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFormControlError(controlName: string): string {
    const control = this.readingForm.get(controlName);
    
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('min')) {
      return `Valore minimo: ${control.getError('min').min}`;
    }
    if (control?.hasError('lessThanPrevious')) {
      return 'La lettura corrente deve essere maggiore della precedente';
    }
    return '';
  }
}