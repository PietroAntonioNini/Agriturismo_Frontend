import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, retry, delay, tap, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  // Cache delle immagini come Base64
  private imageCache = new Map<string, BehaviorSubject<string>>();
  // Cache di fallback per immagini che non possono essere caricate
  private fallbackCache = new Map<string, string>();
  // Traccia le richieste in corso per evitare duplicazioni
  private pendingRequests = new Set<string>();

  constructor(private http: HttpClient) {}

  /**
   * Ottiene un'immagine come Base64 da un URL
   */
  getImage(url: string, retryCount: number = 3, retryDelay: number = 300): Observable<string> {
    // Verifica se l'immagine è già in cache
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!.asObservable();
    }

    // Verifica se è disponibile nella cache di fallback
    if (this.fallbackCache.has(url)) {
      return of(this.fallbackCache.get(url)!);
    }

    // Crea un nuovo BehaviorSubject per questa immagine
    const subject = new BehaviorSubject<string>('');
    this.imageCache.set(url, subject);

    // Carica l'immagine con tentativi multipli
    this.loadImage(url).pipe(
      retry(retryCount),
      delay(retryDelay),
      catchError(error => {
        console.error(`Errore nel caricamento dell'immagine: ${url}`, error);
        // In caso di errore, prova a caricare un'immagine con un timestamp più recente
        const newUrl = this.appendTimestamp(url);
        return this.loadImage(newUrl);
      })
    ).subscribe({
      next: (dataUrl) => {
        subject.next(dataUrl);
        // Memorizza nella cache di fallback per accesso rapido
        this.fallbackCache.set(url, dataUrl);
      },
      error: () => {
        console.error(`Impossibile caricare l'immagine dopo tutti i tentativi: ${url}`);
        // Rimuovi dalla cache principale e usa un'immagine placeholder
        this.imageCache.delete(url);
        const placeholder = 'assets/images/no-image.png';
        subject.next(placeholder);
        this.fallbackCache.set(url, placeholder);
      }
    });

    return subject.asObservable();
  }

  /**
   * Precarica un'immagine e la converte in base64 - metodo ottimizzato per i documenti
   * Versione ottimizzata specifica per i documenti dei tenant
   */
  preloadImage(relativePath: string): Observable<string> {
    if (!relativePath) {
      return of('');
    }
    
    // Ottieni l'URL completo con timestamp per anti-caching
    const fullUrl = this.getFullImageUrlWithTimestamp(relativePath);
    
    // Verifica se è già nella cache
    if (this.fallbackCache.has(fullUrl)) {
      return of(this.fallbackCache.get(fullUrl)!);
    }
    
    // Verifica se è già in caricamento
    if (this.pendingRequests.has(fullUrl)) {
      if (this.imageCache.has(fullUrl)) {
        return this.imageCache.get(fullUrl)!.asObservable();
      }
    }
    
    // Segna questa richiesta come in elaborazione
    this.pendingRequests.add(fullUrl);
    
    // Crea subject per la risposta
    const subject = new BehaviorSubject<string>('');
    this.imageCache.set(fullUrl, subject);
    
    // Usa HTTP per caricare l'immagine con header anti-cache
    this.http.get(fullUrl, { 
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      retry({ count: 3, delay: 300 }),
      switchMap(blob => this.blobToBase64(blob)),
      catchError(error => {
        console.error(`Errore nel caricamento dell'immagine: ${fullUrl}`, error);
        // Aggiungi un nuovo timestamp e riprova ancora
        const newUrl = this.appendTimestamp(fullUrl);
        return this.http.get(newUrl, { responseType: 'blob' }).pipe(
          switchMap(blob => this.blobToBase64(blob)),
          catchError(() => of('assets/images/no-image.png'))
        );
      }),
      finalize(() => {
        // Rimuovi dalla lista pendenti quando completato/fallito
        this.pendingRequests.delete(fullUrl);
      })
    ).subscribe({
      next: (dataUrl) => {
        // Aggiorna il subject e la cache
        subject.next(dataUrl);
        this.fallbackCache.set(fullUrl, dataUrl);
        
        // Anche il percorso originale dovrebbe puntare allo stesso risultato
        if (fullUrl !== relativePath) {
          this.fallbackCache.set(relativePath, dataUrl);
        }
      },
      error: () => {
        console.error(`Impossibile caricare l'immagine dopo tutti i tentativi: ${fullUrl}`);
        const placeholder = 'assets/images/no-image.png';
        subject.next(placeholder);
        this.fallbackCache.set(fullUrl, placeholder);
        if (fullUrl !== relativePath) {
          this.fallbackCache.set(relativePath, placeholder);
        }
        this.imageCache.delete(fullUrl);
      }
    });
    
    return subject.asObservable();
  }

  /**
   * Pulisce la cache per un URL specifico o per tutti
   */
  clearCache(url?: string): void {
    if (url) {
      this.imageCache.delete(url);
      this.fallbackCache.delete(url);
    } else {
      this.imageCache.clear();
      this.fallbackCache.clear();
    }
  }

  /**
   * Carica un'immagine e la converte in Base64
   */
  private loadImage(url: string): Observable<string> {
    return this.http.get(url, { 
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      switchMap(blob => this.blobToBase64(blob))
    );
  }

  /**
   * Converte un blob in una stringa Base64
   */
  private blobToBase64(blob: Blob): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      reader.onloadend = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = () => {
        observer.error('Errore durante la lettura dell\'immagine');
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Aggiungi un timestamp all'URL per forzare un reload
   */
  private appendTimestamp(url: string): string {
    const timestamp = new Date().getTime();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  }

  /**
   * Converte un percorso relativo in URL completo
   */
  getFullImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    
    if (relativePath.startsWith('http')) {
      return relativePath;
    } else {
      if (!relativePath.startsWith('/static/') && relativePath.startsWith('/')) {
        relativePath = '/static' + relativePath;
      }
      return `${environment.apiUrl}${relativePath}`;
    }
  }

  /**
   * Converte un percorso relativo in URL completo con timestamp
   */
  getFullImageUrlWithTimestamp(relativePath: string): string {
    const url = this.getFullImageUrl(relativePath);
    return this.appendTimestamp(url);
  }
}