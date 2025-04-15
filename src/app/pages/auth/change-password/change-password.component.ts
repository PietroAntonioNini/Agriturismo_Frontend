import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { passwordMatchValidator, passwordValidator } from '../../../shared/validators/password.validator';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Verifica se l'utente è loggato
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
    }
    
    this.changePasswordForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordValidator()]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: passwordMatchValidator('newPassword', 'confirmPassword')
    });
  }

  ngOnInit(): void {}

  // Getter per un accesso facilitato ai campi del form
  get f() { return this.changePasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    // Non procedere se il form non è valido
    if (this.changePasswordForm.invalid) {
      return;
    }

    this.loading = true;
    
    this.authService.changePassword(
      this.f['currentPassword'].value,
      this.f['newPassword'].value
    ).subscribe({
      next: () => {
        this.success = 'Password modificata con successo!';
        this.loading = false;
        this.changePasswordForm.reset();
        this.submitted = false;
        
        // Logout automatico dopo 3 secondi
        setTimeout(() => {
          this.authService.logout();
        }, 3000);
      },
      error: error => {
        this.error = error.error?.detail || 'Errore durante il cambio password';
        this.loading = false;
      }
    });
  }
} 