import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  // Getter per accesso facilitato ai campi del form
  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    // Non procedere se il form non è valido
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    
    this.authService.forgotPassword(this.f['username'].value, this.f['email'].value)
      .subscribe({
        next: () => {
          this.success = 'Istruzioni per il reset della password sono state inviate alla tua email.';
          this.loading = false;
          this.forgotPasswordForm.reset();
          this.submitted = false;
        },
        error: error => {
          this.error = error.error?.detail || 'Errore durante il reset della password';
          this.loading = false;
        }
      });
  }
} 