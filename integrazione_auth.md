# Guida all'Integrazione dell'Autenticazione e Sicurezza

Questo documento fornisce dettagli sull'implementazione dell'autenticazione e sicurezza nel backend FastAPI e come integrare queste funzionalità con il frontend Angular.

## 1. Implementazione Backend

### 1.1 Panoramica

Il backend implementa un sistema di autenticazione e sicurezza completo utilizzando:
- JWT (JSON Web Token) per la gestione delle sessioni
- Refresh Token per l'autenticazione persistente
- Hashing delle password con bcrypt
- OAuth2 per la sicurezza delle API
- Rate limiting per protezione contro attacchi
- Validazione password per garantire sicurezza
- Caching per migliorare le performance
- Security Headers per protezione avanzata
- Protezione CSRF per prevenire attacchi Cross-Site Request Forgery
- Redirect HTTPS per garantire connessioni sicure

### 1.2 Tabella utenti

La tabella `users` contiene i seguenti campi:
```
users
│
├── id (Integer, PK) - Identificativo univoco
├── username (String, unique) - Nome utente
├── email (String, unique) - Email
├── hashedPassword (String) - Password criptata
├── firstName (String) - Nome
├── lastName (String) - Cognome
├── role (String) - Ruolo (admin, manager, staff)
├── isActive (Boolean) - Stato dell'account
├── lastLogin (DateTime) - Data ultimo accesso
├── createdAt (DateTime) - Data creazione
└── updatedAt (DateTime) - Data aggiornamento
```

La tabella `refresh_tokens` contiene:
```
refresh_tokens
│
├── id (Integer, PK) - Identificativo univoco
├── token (String, unique) - Token univoco
├── username (String, FK) - Username dell'utente
├── expires (DateTime) - Data di scadenza
├── created_at (DateTime) - Data creazione
├── is_revoked (Boolean) - Se il token è stato revocato
└── revoked_at (DateTime) - Data di revoca
```

### 1.3 Endpoints API

#### 1.3.1 Autenticazione

| Metodo | Endpoint | Descrizione | Payload | Risposta |
|--------|----------|-------------|---------|----------|
| POST | `/api/auth/login` | Ottiene token di accesso e refresh | `username`, `password` | `accessToken`, `refreshToken`, `tokenType`, `expiresIn` |
| POST | `/api/auth/register` | Registra nuovo utente | `UserCreate` | `User` |
| POST | `/api/auth/refresh-token` | Rinnova i token | `refresh_token` | `accessToken`, `refreshToken`, `tokenType`, `expiresIn` |
| POST | `/api/auth/logout` | Revoca token | `refresh_token` | Messaggio di successo |
| POST | `/api/auth/logout-all` | Revoca tutti i token | - | Messaggio di successo |
| GET | `/api/auth/verify-token` | Verifica validità token | - | Informazioni utente |
| PUT | `/api/auth/change-password` | Cambia password | `currentPassword`, `newPassword` | Messaggio di successo |
| GET | `/api/auth/csrf-token` | Ottiene token CSRF | - | `csrf_token`, `expires` |
| POST | `/api/auth/forgot-password` | Richiede reset password | `username`, `email` | Messaggio di successo |
| POST | `/api/auth/reset-password` | Resetta password con token | `token`, `new_password` | Messaggio di successo |

#### 1.3.2 Utenti

| Metodo | Endpoint | Descrizione | Risposta |
|--------|----------|-------------|----------|
| GET | `/api/users/me` | Info utente corrente | `User` |
| GET | `/api/users/` | Lista utenti (solo admin) | `List[User]` |

### 1.4 Schema Dati e Payload

#### UserCreate
```json
{
  "username": "string",
  "email": "user@example.com",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "isActive": true,
  "password": "string"
}
```

#### User Response
```json
{
  "username": "string",
  "email": "user@example.com",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "isActive": true,
  "id": 0,
  "lastLogin": "2023-01-01T00:00:00.000Z",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### TokenPair Response
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "bearer",
  "expiresIn": 3600
}
```

#### UserPasswordChange
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### CSRF Token Response
```json
{
  "csrf_token": "string",
  "expires": "2023-01-01T00:00:00.000Z"
}
```

### 1.5 Formato e Sicurezza JWT

I token JWT contengono le seguenti informazioni (payload):
```json
{
  "sub": "username",
  "role": "admin/manager/staff",
  "exp": 1609459200,
  "iat": 1609455600
}
```

Dove:
- `sub`: Username dell'utente
- `role`: Ruolo dell'utente
- `exp`: Data di scadenza (60 minuti dalla generazione)
- `iat`: Data di generazione del token

### 1.6 Refresh Token

I refresh token sono stringhe UUID casuali memorizzate nel database per un accesso persistente:
- Durata: 30 giorni (configurabile)
- Sono revocabili singolarmente o completamente per un utente
- Si rinnovano ad ogni utilizzo per maggiore sicurezza
- Vengono revocati automaticamente al cambio password

### 1.7 Rate Limiting

Per proteggere da attacchi di forza bruta, il backend implementa limiti di richieste:
- Login: 5 tentativi al minuto
- Registrazione: 3 tentativi al minuto
- Endpoint generici: 60 richieste al minuto

### 1.8 Validazione Password

Per garantire sicurezza, le password devono rispettare i seguenti requisiti:
- Lunghezza minima: 8 caratteri
- Almeno una lettera maiuscola
- Almeno una lettera minuscola
- Almeno un numero
- Almeno un carattere speciale

### 1.9 Security Headers

Il backend implementa diversi header di sicurezza:
- `Strict-Transport-Security`: Forza l'uso di HTTPS
- `Content-Security-Policy`: Previene attacchi XSS
- `X-Content-Type-Options`: Previene il MIME sniffing
- `X-Frame-Options`: Protegge dal clickjacking
- `X-XSS-Protection`: Protezione XSS aggiuntiva
- `Referrer-Policy`: Limita le informazioni nei header referer
- `Permissions-Policy`: Controlla l'accesso alle API del browser

### 1.10 Protezione CSRF

Il backend implementa protezione CSRF per le operazioni POST/PUT/DELETE:
- Token JWT firmati con una chiave segreta
- Cookie HttpOnly per il token CSRF
- Validazione dei token per le operazioni di modifica

### 1.11 Caching

Le richieste GET vengono memorizzate nella cache per migliorare le performance:
- Durata predefinita: 60 secondi
- Esclusione degli endpoint di autenticazione e dati utente
- Inclusione di header di cache per controllo client-side

## 2. Guida all'Integrazione con Frontend Angular

### 2.1 Configurazione richiesta

Per integrare l'autenticazione e sicurezza con Angular:

1. Installa le librerie necessarie:
```bash
npm install @auth0/angular-jwt
```

2. Configura il sistema di autenticazione che:
   - Gestisca la memorizzazione dei token JWT e refresh token
   - Aggiunga automaticamente il token a tutte le richieste API
   - Intercetti le risposte 401 per il refresh automatico del token
   - Implementi logout locale e remoto
   - Gestisca la protezione CSRF

3. Crea componenti standalone per:
   - Login
   - Registrazione
   - Cambio password
   - Password dimenticata
   - Reset password
   - Protezione delle rotte private
   - Gestione errori di autenticazione

### 2.2 Interazione con gli endpoint di autenticazione

#### Login
```typescript
// Formato per il login (utilizzando FormData)
const formData = new FormData();
formData.append('username', 'username');
formData.append('password', 'password');

// Richiesta di login
this.http.post<TokenPair>('/api/auth/login', formData)
  .subscribe(response => {
    // Salva entrambi i token
    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('expires_at', new Date().getTime() + response.expiresIn * 1000);
    // Reindirizzamento o altra logica
  });
```

#### Refresh Token
```typescript
// Richiesta di refresh token (quando l'access token sta per scadere)
const refreshToken = localStorage.getItem('refresh_token');
const formData = new FormData();
formData.append('refresh_token', refreshToken);

this.http.post<TokenPair>('/api/auth/refresh-token', formData)
  .subscribe(response => {
    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('expires_at', new Date().getTime() + response.expiresIn * 1000);
  });
```

#### Logout
```typescript
// Richiesta di logout (singolo dispositivo)
const refreshToken = localStorage.getItem('refresh_token');
const formData = new FormData();
formData.append('refresh_token', refreshToken);

this.http.post('/api/auth/logout', formData)
  .subscribe({
    next: _ => {
      console.log('Logout riuscito');
      // Rimuovi token memorizzati localmente
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('csrf_token'); // Rimuovi anche il token CSRF
      // Reindirizzamento al login
    },
    error: error => {
      console.error('Errore durante il logout:', error);
      // Anche se il logout remoto fallisce, esegui comunque il logout locale
      // Rimuovi token memorizzati localmente
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('csrf_token');
      // Reindirizzamento al login
    }
  });
```

#### Cambio Password
```typescript
// Formato per il cambio password (utilizzando FormData)
const formData = new FormData();
formData.append('currentPassword', 'current-password');
formData.append('newPassword', 'new-password');

// Richiesta di cambio password
this.http.put('/api/auth/change-password', formData)
  .subscribe(response => {
    // Gestione risposta
  });
```

#### Password Dimenticata
```typescript
// Formato per il recupero password (utilizzando FormData)
const formData = new FormData();
formData.append('username', username);
formData.append('email', email);

// Richiesta di recupero password
this.http.post('/api/auth/forgot-password', formData)
  .subscribe({
    next: () => {
      // Mostra messaggio di successo
    },
    error: error => {
      // Gestione errore
    }
  });
```

#### Reset Password
```typescript
// Formato per il reset password (utilizzando FormData)
const formData = new FormData();
formData.append('token', token); // Token ricevuto via email
formData.append('new_password', newPassword);

// Richiesta di reset password
this.http.post('/api/auth/reset-password', formData)
  .subscribe({
    next: () => {
      // Reindirizza al login con messaggio di successo
    },
    error: error => {
      // Gestione errore
    }
  });
```

#### Verifica validità token
```typescript
// Verifica se il token è valido e ottieni informazioni utente
const headers = new HttpHeaders({
  'Authorization': `Bearer ${this.getToken()}`
});

// Prima prova /auth/verify-token
this.http.get<User>('/api/auth/verify-token', { headers })
  .subscribe({
    next: user => {
      // Il token è valido, salva le informazioni utente
      this.currentUserSubject.next(user);
    },
    error: error => {
      // Prova con /users/me come fallback
      this.http.get<User>('/api/users/me', { headers })
        .subscribe({
          next: user => {
            this.currentUserSubject.next(user);
          },
          error: secondError => {
            // Token non valido, reindirizza al login o refresh token
            if (secondError.status === 401) {
              this.refreshToken().subscribe();
            }
          }
        });
    }
  });
```

### 2.3 Implementazione protezione CSRF

#### Ottenere un token CSRF
```typescript
// Richiesta per ottenere il token CSRF
this.http.get<{csrf_token: string, expires: string}>('/api/auth/csrf-token')
  .pipe(
    tap(response => {
      localStorage.setItem('csrf_token', response.csrf_token);
    }),
    catchError(error => {
      console.error('Error getting CSRF token:', error);
      return throwError(() => error);
    })
  );
```

#### Aggiungere il token CSRF alle richieste POST/PUT/DELETE
```typescript
// Implementato nell'interceptor HTTP
private addCsrfToken(request: HttpRequest<any>): HttpRequest<any> {
  const csrfToken = localStorage.getItem('csrf_token');
  
  if (csrfToken) {
    return request.clone({
      setHeaders: { 'X-CSRF-Token': csrfToken }
    });
  }
  return request;
}
```

### 2.4 Protezione delle rotte

Utilizzare il guard di Angular per proteggere le rotte:

```typescript
// auth.guard.ts
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isLoggedIn()) {
      // Verifica ruolo se richiesto
      const requiredRole = route.data['role'];
      if (requiredRole && !this.authService.hasRole(requiredRole)) {
        // Reindirizza se non ha il ruolo richiesto
        this.router.navigate(['/unauthorized']);
        return false;
      }
      
      return true;
    }
    
    // Reindirizza alla pagina di login
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
```

### 2.5 Interceptor HTTP con gestione CSRF e JWT

Implementare un interceptor HTTP che gestisca automaticamente i token JWT e CSRF:

```typescript
// auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Aggiungi JWT token a tutte le richieste (tranne login e refresh)
    if (!request.url.includes('/auth/login') && !request.url.includes('/auth/refresh-token')) {
      request = this.addAuthToken(request);
    }

    // Aggiungi CSRF token a tutte le richieste di modifica (POST/PUT/DELETE/PATCH)
    if (this.requiresCsrfToken(request.method)) {
      request = this.addCsrfToken(request);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            // Gestione errore 401 (Unauthorized)
            return this.handle401Error(request, next);
          } else if (error.status === 403 && error.error?.detail?.includes('CSRF')) {
            // Gestione errore CSRF
            return this.handleCsrfError(request, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private addAuthToken(request: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Controlla se il token è vicino alla scadenza
      const expiresAt = Number(localStorage.getItem('expires_at'));
      const isExpiringSoon = expiresAt - 60000 < new Date().getTime(); // 1 minuto prima della scadenza
      
      if (isExpiringSoon && !this.isRefreshing) {
        // Avvia refresh in background
        this.refreshToken();
      }
      
      return request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return request;
  }
}
```

### 2.6 Implementazione dei componenti Angular

In Angular 17+ utilizziamo componenti standalone per tutti i componenti di autenticazione. Di seguito un esempio di struttura:

```typescript
// Esempio di componente standalone per reset-password
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
}
```

### 2.7 Servizio di autenticazione completo

Implementare un servizio di autenticazione che gestisca JWT, Refresh Token, CSRF e recovery password:

```typescript
// auth.service.ts
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/api`;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Verifica il token all'avvio dell'applicazione
    this.checkToken();
    // Richiedi un token CSRF all'avvio se l'utente è autenticato
    if (this.isLoggedIn()) {
      this.getCsrfToken().subscribe();
    }
  }

  login(username: string, password: string): Observable<TokenPair> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return this.http.post<TokenPair>(`${this.apiUrl}/auth/login`, formData)
      .pipe(
        map(response => {
          // Salva token
          this.storeTokens(response);
          // Carica i dati utente
          this.loadUserProfile();
          // Richiedi un nuovo token CSRF dopo il login
          this.getCsrfToken().subscribe();
          return response;
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }
  
  // ... altri metodi ...

  forgotPassword(username: string, email: string): Observable<any> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, formData)
      .pipe(
        catchError(error => {
          console.error('Errore nel recupero password:', error);
          return throwError(() => error);
        })
      );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('new_password', newPassword);
    
    return this.http.post(`${this.apiUrl}/auth/reset-password`, formData)
      .pipe(
        catchError(error => {
          console.error('Errore nel reset della password:', error);
          return throwError(() => error);
        })
      );
  }
}
```

### 2.8 Configurazione del routing per i componenti di autenticazione

```typescript
// auth.module.ts
const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('../../pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'change-password',
    loadComponent: () => import('../../pages/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('../../pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('../../pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AuthModule { }
```

## 3. Best Practices e Considerazioni sulla Sicurezza

### 3.1 Gestione sicura dei token

- **Access Token JWT**:
  - Memorizzare in localStorage/sessionStorage (compromesso tra sicurezza e usabilità)
  - Impostare una durata breve (30-60 minuti)
  - Non memorizzare dati sensibili nel payload

- **Refresh Token**:
  - Memorizzare in localStorage o preferibilmente in cookie HttpOnly
  - Verificare sempre lato server che non sia stato revocato
  - Usare una durata più lunga (es. 30 giorni) per comodità dell'utente

- **CSRF Token**:
  - Il cookie è gestito automaticamente dal browser (HttpOnly)
  - Memorizzare il valore del token in localStorage/sessionStorage
  - Rinnovare periodicamente o dopo operazioni sensibili

### 3.2 HTTPS e Secure Cookies

- Utilizzare HTTPS in tutti gli ambienti (anche sviluppo)
- Impostare flag `Secure` e `HttpOnly` sui cookie
- Implementare HSTS (Strict-Transport-Security) per evitare attacchi downgrade

### 3.3 Gestione degli errori

- Gestire errori di autorizzazione (401) con refresh automatico
- Gestire errori CSRF (403) con richiesta di nuovo token
- Gestire errori di Rate Limit (429) con backoff esponenziale
- Mostrare messaggi di errore user-friendly senza esporre dettagli tecnici

### 3.4 Gestione del Rate Limiting

```typescript
// Esempio di gestione del rate limiting con backoff esponenziale
@Injectable()
export class RateLimitingInterceptor implements HttpInterceptor {
  private retryDelay = 1000; // 1 secondo
  private maxRetries = 3;
  
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      retryWhen(errors => errors.pipe(
        concatMap((error, count) => {
          // Gestisce solo errori 429 (Too Many Requests)
          if (error.status !== 429 || count >= this.maxRetries) {
            return throwError(error);
          }
          
          // Calcola il backoff esponenziale
          const delay = this.retryDelay * Math.pow(2, count);
          console.log(`Rate limited. Retrying in ${delay}ms`);
          
          // Mostra un messaggio all'utente
          this.notificationService.warn('Troppe richieste, riprova tra poco');
          
          // Ritarda la richiesta successiva
          return timer(delay);
        })
      ))
    );
  }
}
```

### 3.5 Validazione e Sanitizzazione Input

```typescript
// Esempio di validazione password lato frontend
export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const value = control.value;
    
    if (!value) {
      return null;
    }
    
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial && value.length >= 8;
    
    return !passwordValid ? { invalidPassword: true } : null;
  };
}

// Sanitizzazione input per prevenire XSS
@Pipe({name: 'safeHtml'})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
```

### 3.6 Gestione della Sessione

- Implementare logout automatico dopo inattività
- Offrire opzione "Ricordami" per sessioni più lunghe
- Permettere all'utente di visualizzare e terminare sessioni attive

```typescript
// Esempio di servizio per il monitoraggio dell'inattività
@Injectable({
  providedIn: 'root'
})
export class IdleMonitorService {
  private idle$ = new Subject<boolean>();
  private idleTimeout = 15 * 60 * 1000; // 15 minuti di inattività
  private idleTimer: any;
  
  constructor(private authService: AuthService) {
    // Monitoraggio eventi utente
    fromEvent(document, 'mousemove').pipe(
      throttleTime(1000)
    ).subscribe(() => this.resetIdleTimer());
    
    fromEvent(document, 'keypress').subscribe(() => this.resetIdleTimer());
    
    this.idle$.pipe(
      filter(idle => idle === true)
    ).subscribe(() => {
      // Logout automatico dopo inattività
      this.authService.logout();
      alert('La tua sessione è scaduta per inattività.');
    });
    
    // Inizializza timer
    this.resetIdleTimer();
  }
  
  private resetIdleTimer(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idle$.next(true);
    }, this.idleTimeout);
  }
}
```

## 4. Checklist di integrazione

- [ ] Installazione delle librerie necessarie
- [ ] Implementazione del servizio AuthService
- [ ] Implementazione dell'interceptor per JWT e CSRF
- [ ] Implementazione del guard per le rotte protette
- [ ] Creazione dei componenti di login, registrazione e gestione password
- [ ] Configurazione del modulo app con gli interceptor
- [ ] Test completo del flusso di autenticazione
- [ ] Implementazione della gestione errori e rate limiting
- [ ] Integrazione con il sistema di notifiche dell'applicazione
- [ ] Test di sicurezza (XSS, CSRF, Injection)
