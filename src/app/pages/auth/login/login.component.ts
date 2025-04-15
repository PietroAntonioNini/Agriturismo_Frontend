import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { finalize, Subject, takeUntil } from 'rxjs';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string;
  showPassword = false;
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
    
    // Inizializza il form con validazione
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
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

  // Getter per accedere facilmente ai controlli del form
  get f() { return this.loginForm.controls; }

  // Mostra/Nascondi password toggle
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