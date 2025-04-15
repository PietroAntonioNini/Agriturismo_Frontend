import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { passwordMatchValidator, passwordValidator } from '../../../shared/validators/password.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Reindirizza alla home se già loggato
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    
    this.registerForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordValidator()]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: passwordMatchValidator('password', 'confirmPassword')
    });
  }

  ngOnInit(): void {}

  // Getter per un accesso facilitato ai campi del form
  get f() { return this.registerForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Non procedere se il form non è valido
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    
    const userData = {
      firstName: this.f['firstName'].value,
      lastName: this.f['lastName'].value,
      username: this.f['username'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
      role: 'staff', // Ruolo predefinito, può essere cambiato dall'admin
      isActive: true
    };

    this.authService.register(userData)
      .subscribe({
        next: () => {
          // Registrazione completata, effettua il login
          this.authService.login(userData.username, userData.password)
            .subscribe({
              next: () => {
                this.router.navigate(['/']);
              },
              error: error => {
                this.error = 'Registrazione completata, ma login automatico fallito. Prova ad accedere manualmente.';
                this.loading = false;
              }
            });
        },
        error: error => {
          this.error = error.error?.detail || 'Errore durante la registrazione';
          this.loading = false;
        }
      });
  }
} 