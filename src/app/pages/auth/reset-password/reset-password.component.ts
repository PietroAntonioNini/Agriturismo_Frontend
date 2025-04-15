import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Estrai il token dall'URL se presente
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    if (!this.token) {
      this.errorMessage = 'Token di reset non valido. Riprovare il processo di recupero password.';
    }
  }

  // Validatore per verificare che le password corrispondano
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.resetForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // Se non c'è token, avvisa l'utente e blocca la procedura
    if (!this.token) {
      this.errorMessage = 'Token di reset non valido. Riprovare il processo di recupero password.';
      this.isLoading = false;
      return;
    }

    const newPassword = this.resetForm.get('password')?.value;
    
    this.authService.resetPassword(this.token, newPassword)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Password aggiornata con successo. Sarai reindirizzato alla pagina di login.';
          
          // Reindirizza al login dopo 2 secondi
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error?.error?.message || 'Si è verificato un errore durante il reset della password. Riprova più tardi.';
          console.error('Reset password error:', error);
        }
      });
  }

  // Controllo facilitato per verificare se i campi sono invalidi
  isFieldInvalid(field: string): boolean {
    const control = this.resetForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  // Metodo per tornare alla pagina di login
  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
} 