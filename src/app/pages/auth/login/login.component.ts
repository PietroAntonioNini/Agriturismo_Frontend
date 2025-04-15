import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { finalize, Subject, takeUntil } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { passwordMatchValidator, passwordValidator } from '../../../shared/validators/password.validator';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  registerForm: FormGroup;
  loading = false;
  registrationLoading = false;
  submitted = false;
  registrationSubmitted = false;
  error = '';
  registrationError = '';
  returnUrl: string;
  showPassword = false;
  showRegPassword = false;
  isFlipped = false;
  registrationStep = 1; // Primo step della registrazione
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private titleService: Title
  ) {
    // Imposta il titolo della pagina
    this.titleService.setTitle('Accedi | Agriturismo Manager');
    
    // Reindirizza alla dashboard se già loggato
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
    
    // Inizializza il form di login con validazione
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
    
    // Inizializza il form di registrazione con validazione
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
    
    // Ottieni l'URL di ritorno dai parametri o usa '/dashboard' come predefinito
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  ngOnInit(): void {
    // Controlla se c'è un username salvato nel localStorage per il "Remember Me"
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      this.loginForm.patchValue({
        username: savedUsername,
        rememberMe: true
      });
    }
    
    // Aggiungi effetto di focus sull'input del nome utente se vuoto
    if (!this.loginForm.get('username')?.value) {
      setTimeout(() => {
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
          usernameInput.focus();
        }
      }, 100);
    }
  }
  
  ngOnDestroy(): void {
    // Pulisce gli observable quando il componente viene distrutto
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getter per accedere facilmente ai controlli del form di login
  get f() { return this.loginForm.controls; }
  
  // Getter per accedere facilmente ai controlli del form di registrazione
  get r() { return this.registerForm.controls; }

  // Mostra/Nascondi password toggle per il login
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    
    // Ripristina il focus sull'input della password
    setTimeout(() => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }
  
  // Mostra/Nascondi password toggle per la registrazione
  toggleRegPasswordVisibility(): void {
    this.showRegPassword = !this.showRegPassword;
    
    // Ripristina il focus sull'input della password
    setTimeout(() => {
      const passwordInput = document.getElementById('regPassword');
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }
  
  // Gira la card per mostrare il form di registrazione o login
  flipCard(): void {
    this.isFlipped = !this.isFlipped;
    
    // Reset degli errori quando si cambia form
    this.error = '';
    this.registrationError = '';
    
    // Reset dello stato di submit
    this.submitted = false;
    this.registrationSubmitted = false;
    
    // Reset dello step di registrazione quando si torna al login
    if (!this.isFlipped) {
      this.registrationStep = 1;
    }
    
    // Focus sul primo campo del form dopo la transizione
    setTimeout(() => {
      const firstInput = this.isFlipped 
        ? document.getElementById('firstName')
        : document.getElementById('username');
      
      if (firstInput) {
        firstInput.focus();
      }
    }, 500); // Attendi che la transizione finisca
  }
  
  // Avanza al secondo step della registrazione
  nextStep(): void {
    // Valida solo i campi del primo step
    this.registrationSubmitted = true;
    
    if (this.r['firstName'].invalid || this.r['lastName'].invalid || this.r['username'].invalid) {
      return;
    }
    
    this.registrationStep = 2;
    this.registrationSubmitted = false;
    
    // Focus sul primo campo del secondo step
    setTimeout(() => {
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.focus();
      }
    }, 100);
  }
  
  // Torna al primo step della registrazione
  previousStep(): void {
    this.registrationStep = 1;
    this.registrationSubmitted = false;
    
    // Focus sul primo campo
    setTimeout(() => {
      const firstNameInput = document.getElementById('firstName');
      if (firstNameInput) {
        firstNameInput.focus();
      }
    }, 100);
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Verifica se il form è valido
    if (this.loginForm.invalid) {
      // Aggiunge l'effetto shake al primo campo non valido
      const invalidControls = this.loginForm.invalid ? Object.keys(this.loginForm.controls).filter(
        key => this.loginForm.controls[key].invalid
      ) : [];
      
      if (invalidControls.length > 0) {
        const firstInvalidField = document.getElementById(invalidControls[0]);
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
      }
      return;
    }

    this.loading = true;

    const username = this.f['username'].value;
    const password = this.f['password'].value;
    const rememberMe = this.f['rememberMe'].value;

    // Salva l'username nel localStorage se "Remember Me" è selezionato
    if (rememberMe) {
      localStorage.setItem('rememberedUsername', username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }

    this.authService.login(username, password)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          // Login riuscito, mostra messaggi di benvenuto se necessario
          console.log('Login effettuato con successo', response);
          
          // Reindirizza alla dashboard o all'URL di ritorno
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          // Gestisci errori di autenticazione con messaggi utente-friendly
          if (error.status === 401) {
            this.error = 'Nome utente o password non validi';
          } else if (error.status === 403) {
            this.error = 'Il tuo account è stato bloccato. Contatta l\'assistenza.';
          } else if (error.status === 429) {
            this.error = 'Troppi tentativi di accesso. Riprova tra qualche minuto.';
          } else if (!navigator.onLine) {
            this.error = 'Nessuna connessione internet. Verifica la tua rete e riprova.';
          } else {
            this.error = error.error?.detail || 'Si è verificato un errore durante l\'accesso';
          }
          
          // Rimuovi messaggio di errore dopo 5 secondi
          setTimeout(() => {
            if (this.error) {
              this.error = '';
            }
          }, 5000);
        }
      });
  }
  
  // Gestisce l'invio del form di registrazione
  onRegisterSubmit(): void {
    this.registrationSubmitted = true;
    this.registrationError = '';

    // Non procedere se il form non è valido
    if (this.registerForm.invalid) {
      // Aggiunge l'effetto shake al primo campo non valido
      const invalidControls = this.registerForm.invalid ? Object.keys(this.registerForm.controls).filter(
        key => this.registerForm.controls[key].invalid
      ) : [];
      
      if (invalidControls.length > 0) {
        const firstInvalidField = document.getElementById(invalidControls[0]);
        if (firstInvalidField) {
          firstInvalidField.focus();
        }
      }
      return;
    }

    this.registrationLoading = true;
    
    const userData = {
      firstName: this.r['firstName'].value,
      lastName: this.r['lastName'].value,
      username: this.r['username'].value,
      email: this.r['email'].value,
      password: this.r['password'].value,
      role: 'staff', // Ruolo predefinito, può essere cambiato dall'admin
      isActive: true
    };

    this.authService.register(userData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.registrationLoading = false;
        })
      )
      .subscribe({
        next: () => {
          // Registrazione completata, effettua il login automaticamente
          this.authService.login(userData.username, userData.password)
            .subscribe({
              next: () => {
                this.router.navigate(['/dashboard']);
              },
              error: error => {
                // Registrazione completata ma login fallito, torna alla schermata di login
                this.registrationError = 'Registrazione completata, ma login automatico fallito. Prova ad accedere manualmente.';
                setTimeout(() => {
                  this.flipCard(); // Torna alla schermata di login
                  
                  // Precompila il form di login con lo username appena registrato
                  this.loginForm.patchValue({
                    username: userData.username
                  });
                }, 3000);
              }
            });
        },
        error: error => {
          // Gestisci errori di registrazione
          if (error.status === 409) {
            this.registrationError = 'Username o email già in uso';
          } else {
            this.registrationError = error.error?.detail || 'Errore durante la registrazione';
          }
          
          // Rimuovi messaggio di errore dopo 5 secondi
          setTimeout(() => {
            if (this.registrationError) {
              this.registrationError = '';
            }
          }, 5000);
        }
      });
  }
  
  // Metodo per entrare con credenziali demo
  loginAsDemo(event: Event): void {
    event.preventDefault();
    this.loginForm.setValue({
      username: 'demo',
      password: 'demo123',
      rememberMe: false
    });
    this.onSubmit();
  }
}