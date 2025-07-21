# Guida Completa: Deploy Gratuito di Applicazione Full-Stack nel 2025

Una guida tecnica dettagliata per mettere in produzione un'applicazione Angular + FastAPI + PostgreSQL completamente gratuita, con autenticazione JWT e storage per immagini.

## Deploy Frontend Angular su Netlify

La prima fase prevede l'ottimizzazione e deploy del frontend Angular su Netlify, configurando build di produzione, domini personalizzati e ottimizzazioni delle prestazioni.

### Configurazione Build di Produzione

**Ottimizzazione angular.json per produzione:**
```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ],
              "optimization": true,
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "aot": true,
              "extractLicenses": true,
              "buildOptimizer": true,
              "subresourceIntegrity": true
            }
          }
        }
      }
    }
  }
}
```

**Comando build ottimizzato:**
```bash
# Build standard
ng build --configuration production

# Build con analisi delle performance
ng build --configuration production --stats-json

# Build con allocazione memoria maggiore (se necessario)
node --max_old_space_size=8192 ./node_modules/@angular/cli/bin/ng build --configuration production
```

### Configurazione Netlify

**File netlify.toml nella root del progetto:**
```toml
[build]
  command = "ng build --configuration production"
  publish = "dist/your-app-name"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Gestione Variabili d'Ambiente

**Script set-env.js per injection dinamica:**
```javascript
const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${process.env.API_URL || 'https://api.production.com'}',
  appName: '${process.env.APP_NAME || 'Production App'}',
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseAnonKey: '${process.env.SUPABASE_ANON_KEY}'
};`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`Environment config generated at ${targetPath}`);
```

**Aggiornamento package.json:**
```json
{
  "scripts": {
    "prebuild": "node set-env.js",
    "build": "ng build --configuration production"
  }
}
```

### Configurazione Domini Gratuiti is-a.dev

**Processo di registrazione domini .is-a.dev:**

1. **Fork del repository di registrazione:**
```bash
git clone https://github.com/is-a-dev/register.git
cd register
```

2. **Creazione file dominio (domains/yoursubdomain.json):**
```json
{
  "description": "Personal portfolio website",
  "repo": "https://github.com/yourusername/your-repo",
  "owner": {
    "username": "yourgithubusername",
    "email": "your@email.com"
  },
  "record": {
    "CNAME": "yoursitename.netlify.app"
  }
}
```

3. **Configurazione in Netlify:**
- Dashboard → Domain Management
- Add Custom Domain: `yoursubdomain.is-a.dev`
- Netlify configura automaticamente SSL e CDN

## Deploy Backend FastAPI su Piattaforme Gratuite

Analisi comparativa delle migliori piattaforme gratuite per hosting FastAPI nel 2025, con configurazioni specifiche per ogni servizio.

### Confronto Piattaforme Gratuite

| Piattaforma | Tier Gratuito | RAM | Auto-Sleep | Cold Start | Database |
|-------------|---------------|-----|------------|------------|----------|
| **Koyeb** | 0.1 vCPU, 256MB | 256MB | No sleep | ~150ms | PostgreSQL incluso |
| **Fly.io** | 3x 256MB machines | 256MB | Scale-to-zero | ~1.5s | PostgreSQL gratuito |
| **Railway** | $5 trial credit | 300MB | Solo quando esauriti crediti | Veloce | Multi-database |
| **Render** | 750 ore/mese | 512MB | 15 min inattività | 1-3 min | PostgreSQL 30gg |

### Configurazione Koyeb (Raccomandato)

**Dockerfile ottimizzato:**
```dockerfile
FROM python:3.11-alpine AS builder
WORKDIR /app
RUN python3 -m venv venv
ENV VIRTUAL_ENV=/app/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY requirements.txt .
RUN pip install -r requirements.txt

FROM python:3.11-alpine AS runner
WORKDIR /app
COPY --from=builder /app/venv venv
COPY main.py main.py
ENV VIRTUAL_ENV=/app/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "--host", "0.0.0.0", "main:app"]
```

**requirements.txt essenziali:**
```txt
fastapi[standard]==0.108.0
uvicorn[standard]==0.25.0
asyncpg==0.29.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

### Configurazione Railway

**railway.json:**
```json
{
  "build": {
    "builder": "PYTHON"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

**File .python-version:**
```txt
3.11
```

### Configurazione Fly.io

**fly.toml (generato automaticamente):**
```toml
[build]
  builder = "dockerfile"

[[services]]
  http_checks = []
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

## Migrazione Database PostgreSQL da Docker a Supabase

Guida completa per migrare da PostgreSQL locale a Supabase, mantenendo l'integrità dei dati e configurando l'autenticazione.

### Setup Supabase

**Limiti tier gratuito:**
- Database: 500 MB (modalità read-only se superata)
- Progetti: 2 progetti attivi
- Connessioni: ~60 connessioni dirette
- Pausa automatica: dopo 1 settimana di inattività

### Migrazione Dati

**Metodo 1 - pg_dump/pg_restore:**
```bash
# Export da Docker PostgreSQL
docker exec your_postgres_container pg_dump -U username -h localhost -p 5432 \
  --verbose --clean --no-acl --no-owner \
  -f /tmp/database_dump.sql database_name

# Copy dump dal container
docker cp your_postgres_container:/tmp/database_dump.sql ./database_dump.sql

# Import su Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f database_dump.sql
```

**Metodo 2 - Tool automatico Colab:**
```python
# Usa il notebook Colab di Supabase per migrazione automatica
# https://colab.research.google.com/github/mansueli/Supa-Migrate/blob/main/Migrate_Postgres_Supabase.ipynb

# Variabili d'ambiente nel notebook:
PGSQL_COMMAND = "PGPASSWORD=your_password psql -h your_docker_host -U username dbname"
SUPABASE_HOST = "db.your_project_ref.supabase.co"
SUPABASE_PASSWORD = "your_supabase_password"
```

### Configurazione Connection Pooling

**FastAPI con AsyncPG ottimizzato:**
```python
import asyncpg
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - connection pool
    app.pool = await asyncpg.create_pool(
        "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres",
        min_size=10,
        max_size=20,
        max_queries=50000,
        max_inactive_connection_lifetime=300,
        command_timeout=60,
        server_settings={
            'jit': 'off'  # Disabilita JIT per connection pool
        }
    )
    yield
    # Shutdown
    await app.pool.close()

app = FastAPI(lifespan=lifespan)

# Dependency per connessioni database
async def get_db_connection(request: Request):
    async with request.app.pool.acquire() as connection:
        yield connection
```

## Gestione Autenticazione JWT con Supabase

Configurazione avanzata per mantenere il sistema JWT esistente o migrare a Supabase Auth, con Row Level Security.

### Mantenimento Sistema JWT Custom

**Integrazione JWT personalizzato con Supabase:**
```python
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

def generate_supabase_compatible_jwt(user_id: str, custom_claims: dict = {}):
    payload = {
        "sub": user_id,  # User ID
        "role": "authenticated",  # Richiesto per RLS
        "aud": "authenticated",
        "iss": f"https://[PROJECT_REF].supabase.co/auth/v1",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24),
        **custom_claims
    }
    
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")

async def verify_jwt_token(token = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

### Row Level Security (RLS) Policies

**Policies essenziali per la sicurezza:**
```sql
-- Abilitazione RLS su tabelle
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy per accesso ai propri dati
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy avanzata con ruoli personalizzati
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role text)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role_name = required_role
  );
END;
$$;

CREATE POLICY "Admin access policy"
ON sensitive_data FOR ALL 
TO authenticated 
USING (auth.user_has_role('admin'));
```

### Configurazione Environment Variables

**Variabili d'ambiente per produzione:**
```bash
# Backend FastAPI
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_ANON_KEY=your_anon_key

# Frontend Angular (Netlify)
NG_APP_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NG_APP_SUPABASE_ANON_KEY=your_anon_key
NG_APP_API_URL=https://your-backend.railway.app/api/v1
```

## Configurazione Storage Supabase per Immagini

Setup completo per gestione immagini con bucket pubblici/privati, ottimizzazioni e integrazione frontend/backend.

### Configurazione Bucket e Policies

**Creazione bucket tramite JavaScript:**
```javascript
// Bucket pubblico per immagini profilo
const { data, error } = await supabase.storage.createBucket('avatars', {
  public: true,
  allowedMimeTypes: ['image/*'],
  fileSizeLimit: '5MB'
});

// Bucket privato per documenti utente
const { data, error } = await supabase.storage.createBucket('private-docs', {
  public: false,
  fileSizeLimit: '10MB'
});
```

**Row Level Security per Storage:**
```sql
-- Policy per upload (solo nelle proprie cartelle)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Policy per accesso (solo ai propri file)
CREATE POLICY "Allow users to view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (SELECT auth.uid()) = owner_id::uuid
);
```

### Integrazione Angular

**Service per gestione upload:**
```typescript
// storage.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  async uploadImage(file: File, bucket: string = 'avatars'): Promise<string> {
    // Validazione file
    this.validateImageFile(file);
    
    // Compressione immagine
    const compressedFile = await this.compressImage(file);
    
    // Generazione nome file sicuro
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${await this.getUserId()}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        contentType: compressedFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Ottieni URL pubblico
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  private validateImageFile(file: File) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo file non supportato. Usa JPG, PNG o WebP.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File troppo grande. Massimo 5MB consentiti.');
    }
  }

  private async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name, { type: 'image/webp' }));
        }, 'image/webp', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}
```

### Integrazione FastAPI Backend

**Endpoint per gestione upload sicura:**
```python
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPBearer
import hashlib
import magic
from supabase import create_client, Client

app = FastAPI()
security = HTTPBearer()

def get_supabase_client() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )

def validate_image(file: UploadFile):
    # Verifica dimensione
    if file.size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(400, "File troppo grande")
    
    # Verifica tipo MIME
    allowed_types = ['image/jpeg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Tipo file non valido")
    
    # Verifica contenuto reale del file
    file_content = file.file.read()
    mime = magic.from_buffer(file_content, mime=True)
    file.file.seek(0)  # Reset pointer
    
    if mime not in allowed_types:
        raise HTTPException(400, "Il contenuto del file non corrisponde all'estensione")

@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    token = Depends(security)
):
    # Validazione JWT
    user_id = await verify_jwt_token(token.credentials)
    
    # Validazione file
    validate_image(file)
    
    # Nome file sicuro
    file_hash = hashlib.sha256(file.filename.encode()).hexdigest()[:10]
    file_ext = file.filename.split('.')[-1]
    secure_filename = f"{user_id}/{file_hash}.{file_ext}"
    
    # Upload su Supabase
    supabase = get_supabase_client()
    try:
        file_content = await file.read()
        response = supabase.storage.from_("avatars").upload(
            secure_filename, 
            file_content,
            {
                "content-type": file.content_type,
                "cache-control": "3600"
            }
        )
        
        if response.error:
            raise HTTPException(500, f"Upload fallito: {response.error}")
            
        public_url = supabase.storage.from_("avatars").get_public_url(secure_filename)
        
        return {"url": public_url.data.public_url, "path": secure_filename}
        
    except Exception as e:
        raise HTTPException(500, f"Upload fallito: {str(e)}")
```

## Setup CI/CD con GitHub Actions

Configurazione completa per automazione deployment con testing, build e deploy automatici.

### Pipeline CI/CD Completa

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline Completa

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20.x'
  PYTHON_VERSION: '3.11'

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      
      - name: Run linting
        run: npm run lint
        working-directory: ./frontend
      
      - name: Run tests
        run: npm run test:ci
        working-directory: ./frontend
      
      - name: Build Angular
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          API_URL: ${{ secrets.API_URL }}
        run: |
          node set-env.js
          npm run build -- --configuration production
        working-directory: ./frontend
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-dist
          path: frontend/dist/

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx
        working-directory: ./backend
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/testdb
          SUPABASE_JWT_SECRET: test-secret-key
        run: pytest -v
        working-directory: ./backend

  deploy-frontend:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: frontend-dist
          path: frontend/dist/
      
      - name: Deploy to Netlify
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        run: |
          npm install -g netlify-cli
          netlify deploy --prod --dir frontend/dist --site $NETLIFY_SITE_ID --auth $NETLIFY_AUTH_TOKEN

  deploy-backend:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway login --token $RAILWAY_TOKEN
          railway up --service backend

  health-check:
    needs: [deploy-frontend, deploy-backend]
    runs-on: ubuntu-latest
    steps:
      - name: Check Frontend
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://your-app.is-a.dev)
          if [ $response -ne 200 ]; then
            echo "Frontend health check failed: $response"
            exit 1
          fi
          echo "Frontend OK"
      
      - name: Check Backend API
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://your-api.railway.app/health)
          if [ $response -ne 200 ]; then
            echo "Backend health check failed: $response"
            exit 1
          fi
          echo "Backend OK"
```

## Risoluzione Problemi Comuni

### Configurazione CORS

**FastAPI CORS ottimizzato:**
```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration per production
origins = [
    "https://your-app.is-a.dev",  # Frontend produzione
    "http://localhost:4200",     # Angular dev server
    "http://localhost:3000",     # Alternative dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # MAI usare ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["*"],
    max_age=600,
)

# Handler manuale OPTIONS per scenari complessi
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    return Response(
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
    )
```

### SSL e Sicurezza

**Headers di sicurezza FastAPI:**
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # HTTPS Security
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://your-api.railway.app"
    )
    response.headers["Content-Security-Policy"] = csp
    
    # Additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response
```

### Troubleshooting Database

**Script di diagnostica connessioni:**
```python
# connection_diagnostics.py
import asyncpg
import asyncio

async def diagnose_connection():
    try:
        # Test connessione diretta
        conn = await asyncpg.connect(DATABASE_URL)
        version = await conn.fetchval('SELECT version()')
        print(f"✓ Connessione diretta OK: {version}")
        await conn.close()
        
        # Test connection pool
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3)
        async with pool.acquire() as conn:
            result = await conn.fetchval('SELECT COUNT(*) FROM pg_stat_activity')
            print(f"✓ Connection pool OK. Connessioni attive: {result}")
        await pool.close()
        
    except Exception as e:
        print(f"✗ Errore connessione: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose_connection())
```

### Ottimizzazione Prestazioni

**Monitoring risorse middleware:**
```python
import psutil
import time

@app.middleware("http")
async def monitor_performance(request: Request, call_next):
    start_time = time.time()
    memory_before = psutil.virtual_memory().percent
    
    # Controllo memoria critica
    if memory_before > 90:
        return Response(
            status_code=503,
            content="Servizio temporaneamente non disponibile - alta memoria"
        )
    
    response = await call_next(request)
    
    # Logging performance
    process_time = time.time() - start_time
    memory_after = psutil.virtual_memory().percent
    
    if process_time > 5.0 or memory_after > 85:
        logger.warning(
            f"Performance issue - Time: {process_time:.2f}s, "
            f"Memory: {memory_after:.1f}%",
            extra={
                "path": request.url.path,
                "method": request.method,
                "process_time": process_time,
                "memory_usage": memory_after
            }
        )
    
    return response
```

## Script di Deployment Automatico

### Script di Deploy Completo

**deploy.sh - Script bash per deploy completo:**
```bash
#!/bin/bash

set -e  # Exit on error

echo "🚀 Inizio processo di deployment..."

# Variabili
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
ENV_FILE=".env.production"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisiti
check_prerequisites() {
    print_status "Controllo prerequisiti..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js non trovato"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 non trovato"
        exit 1
    fi
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI non trovato, installazione..."
        npm install -g netlify-cli
    fi
}

# Build e test frontend
build_frontend() {
    print_status "Build frontend Angular..."
    cd $FRONTEND_DIR
    
    # Install dependencies
    npm ci
    
    # Run tests
    print_status "Esecuzione test frontend..."
    npm run test:ci
    
    # Lint
    npm run lint
    
    # Build production
    print_status "Build produzione..."
    node set-env.js
    npm run build -- --configuration production
    
    cd ..
    print_status "Frontend build completato"
}

# Test backend
test_backend() {
    print_status "Test backend FastAPI..."
    cd $BACKEND_DIR
    
    # Virtual environment
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    pip install pytest pytest-asyncio httpx
    
    # Run tests
    pytest -v
    
    deactivate
    cd ..
    print_status "Backend test completati"
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploy frontend su Netlify..."
    
    if [ -z "$NETLIFY_SITE_ID" ] || [ -z "$NETLIFY_AUTH_TOKEN" ]; then
        print_error "Variabili Netlify mancanti"
        exit 1
    fi
    
    netlify deploy --prod \
        --dir $FRONTEND_DIR/dist \
        --site $NETLIFY_SITE_ID \
        --auth $NETLIFY_AUTH_TOKEN
    
    print_status "Frontend deployato su Netlify"
}

# Deploy backend
deploy_backend() {
    print_status "Deploy backend su Railway..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        print_error "RAILWAY_TOKEN mancante"
        exit 1
    fi
    
    # Install Railway CLI if needed
    if ! command -v railway &> /dev/null; then
        npm install -g @railway/cli
    fi
    
    railway login --token $RAILWAY_TOKEN
    railway up --service backend
    
    print_status "Backend deployato su Railway"
}

# Health checks
health_checks() {
    print_status "Verifica health checks..."
    
    # Wait for deployment
    sleep 30
    
    # Check frontend
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-app.is-a.dev)
    if [ $FRONTEND_STATUS -eq 200 ]; then
        print_status "Frontend health check OK"
    else
        print_error "Frontend health check failed: $FRONTEND_STATUS"
        exit 1
    fi
    
    # Check backend
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-api.railway.app/health)
    if [ $BACKEND_STATUS -eq 200 ]; then
        print_status "Backend health check OK"
    else
        print_error "Backend health check failed: $BACKEND_STATUS"
        exit 1
    fi
}

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(cat $ENV_FILE | xargs)
fi

# Esecuzione pipeline
main() {
    check_prerequisites
    
    # Esegui in parallelo dove possibile
    build_frontend &
    FRONTEND_PID=$!
    
    test_backend &
    BACKEND_PID=$!
    
    # Wait for completion
    wait $FRONTEND_PID
    wait $BACKEND_PID
    
    # Deploy
    deploy_frontend &
    deploy_backend &
    
    # Wait for deployments
    wait
    
    # Final checks
    health_checks
    
    print_status "🎉 Deployment completato con successo!"
    echo -e "Frontend: ${GREEN}https://your-app.is-a.dev${NC}"
    echo -e "Backend: ${GREEN}https://your-api.railway.app${NC}"
}

# Esegui con gestione errori
if main; then
    exit 0
else
    print_error "Deployment fallito"
    exit 1
fi
```

### Makefile per Comandi Rapidi

```makefile
# Makefile per gestione progetto
.PHONY: help install dev test build deploy clean

# Variabili
FRONTEND_DIR := frontend
BACKEND_DIR := backend
PYTHON := python3
NODE := node

help: ## Mostra questo help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Installa dipendenze
	@echo "📦 Installazione dipendenze..."
	cd $(FRONTEND_DIR) && npm install
	cd $(BACKEND_DIR) && $(PYTHON) -m venv venv && source venv/bin/activate && pip install -r requirements.txt

dev: ## Avvia ambiente sviluppo
	@echo "🚀 Avvio ambiente sviluppo..."
	cd $(FRONTEND_DIR) && npm start &
	cd $(BACKEND_DIR) && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000 &

test: ## Esegui tutti i test
	@echo "🧪 Esecuzione test..."
	cd $(FRONTEND_DIR) && npm run test:ci
	cd $(BACKEND_DIR) && source venv/bin/activate && pytest -v

build: ## Build per produzione
	@echo "🏗️ Build produzione..."
	cd $(FRONTEND_DIR) && node set-env.js && npm run build -- --configuration production

deploy: ## Deploy completo
	@echo "🚀 Deploy produzione..."
	./deploy.sh

clean: ## Pulizia cache e build
	@echo "🧹 Pulizia..."
	cd $(FRONTEND_DIR) && rm -rf node_modules dist .angular
	cd $(BACKEND_DIR) && rm -rf venv __pycache__ .pytest_cache

lint: ## Linting codice
	@echo "🔍 Linting..."
	cd $(FRONTEND_DIR) && npm run lint
	cd $(BACKEND_DIR) && source venv/bin/activate && flake8 . --max-line-length=88 --extend-ignore=E203

backup: ## Backup database
	@echo "💾 Backup database..."
	@if [ -z "$(DATABASE_URL)" ]; then echo "DATABASE_URL non impostata"; exit 1; fi
	pg_dump $(DATABASE_URL) > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup completato"

monitor: ## Monitora servizi
	@echo "📊 Monitoraggio servizi..."
	@echo "Frontend: $$(curl -s -o /dev/null -w '%{http_code}' https://your-app.is-a.dev)"
	@echo "Backend: $$(curl -s -o /dev/null -w '%{http_code}' https://your-api.railway.app/health)"
	@echo "Database: $$(psql $(DATABASE_URL) -c 'SELECT version();' | head -1 || echo 'Error')"
```

## Comandi Quick Start

```bash
# Setup iniziale progetto
git clone https://github.com/yourusername/your-project.git
cd your-project

# Installa dipendenze
make install

# Configurazione environment
cp .env.example .env.local
# Modifica .env.local con le tue chiavi

# Sviluppo locale
make dev

# Test completo
make test

# Deploy produzione
make deploy

# Monitoraggio
make monitor
```

## Checklist Pre-Deploy

### ✅ Frontend
- [ ] Build produzione funzionante senza errori
- [ ] Variabili d'ambiente configurate
- [ ] Routing SPA configurato (_redirects)
- [ ] Performance ottimizzate (lazy loading, compression)
- [ ] Security headers configurati

### ✅ Backend  
- [ ] Test API tutti passanti
- [ ] Connection pooling configurato
- [ ] JWT authentication funzionante
- [ ] CORS configurato correttamente
- [ ] Health endpoint disponibile

### ✅ Database
- [ ] Migrazione dati completata
- [ ] RLS policies configurate
- [ ] Backup strategy implementata
- [ ] Connessioni ottimizzate

### ✅ Storage
- [ ] Bucket Supabase configurati
- [ ] Upload/download funzionanti
- [ ] Policies di sicurezza attive
- [ ] Ottimizzazione immagini implementata

### ✅ DevOps
- [ ] CI/CD pipeline attiva
- [ ] Domini configurati con SSL
- [ ] Monitoring e logging attivi
- [ ] Deploy scripts testati

Questa guida fornisce una base solida per deployare un'applicazione completa completamente gratuita nel 2025, con tutte le best practices per sicurezza, performance e manutenibilità.