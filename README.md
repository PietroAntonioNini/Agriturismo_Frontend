# AgriturismoFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.1.

## Sistema di Autenticazione e Sicurezza

Il progetto implementa un sistema completo di autenticazione e sicurezza con le seguenti caratteristiche:

### Funzionalità implementate

- **Autenticazione JWT** con refresh token
- **Protezione CSRF** per operazioni POST/PUT/DELETE
- **Gestione ruoli** (admin, manager, staff)
- **Validazione avanzata password** con requisiti di sicurezza
- **Protezione contro attacchi** (XSS, CSRF, Rate Limiting)
- **Gestione automatica scadenza token**
- **Logout automatico per inattività**
- **Sanitizzazione input** per prevenzione XSS
- **Recupero password** tramite email

### Componenti di autenticazione

- **Login** (`/auth/login`) - Accesso al sistema
- **Registrazione** (`/auth/register`) - Creazione nuovo account
- **Cambio password** (`/auth/change-password`) - Modifica password utente
- **Recupero password** (`/auth/forgot-password`) - Richiesta di reset password via email

### Implementazione tecnica

- **AuthService**: Gestione token JWT, refresh token e profilo utente
- **AuthGuard**: Protezione rotte in base a stato autenticazione e ruoli
- **Interceptor HTTP**: Gestione automatica token, CSRF e refresh
- **Rate Limiting**: Gestione errori 429 con backoff esponenziale
- **Validatori**: Regole complesse per password e corrispondenza
- **Recupero password**: Sistema sicuro di reset password tramite email verificata

### Best Practices applicate

- Memorizzazione sicura dei token
- Validazione input lato client
- Uso corretto di HttpOnly e Secure cookies
- Gestione centralizzata errori di autenticazione
- Protezione contro attacchi di forza bruta
- Flusso di recupero password sicuro con verifica dell'identità

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
