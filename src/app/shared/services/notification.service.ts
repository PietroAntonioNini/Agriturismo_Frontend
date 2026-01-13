import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GenericApiService } from './generic-api.service';
import { Apartment } from '../models/apartment.model';
import { Lease } from '../models/lease.model';
import { UtilityReading } from '../models/utility-reading.model';

export interface ActivityNotification {
  id: string;
  type: 'apartment' | 'tenant' | 'lease' | 'utility';
  action: 'created' | 'updated' | 'deleted';
  title: string;
  subtitle: string;
  timestamp: Date;
  icon: string;
  color: string;
  entityId?: number;
  entityName?: string;
  isRead?: boolean;
  category?: 'activity' | 'reading';
  metadata?: {
    apartmentIds?: number[];
    apartmentNames?: string[];
    missingTypes?: ('electricity' | 'water' | 'gas')[];
    [key: string]: any;
  };
}

export interface ReadingNotificationData {
  apartmentsWithoutReadings: Array<{ id: number; name: string }>;
  apartmentsWithIncompleteReadings: Array<{
    id: number;
    name: string;
    missingTypes: ('electricity' | 'water' | 'gas')[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly MAX_NOTIFICATIONS = 50;
  private notificationsSubject = new BehaviorSubject<ActivityNotification[]>([]);
  private readingNotificationsCache: ReadingNotificationData | null = null;
  private lastReadingCheck: Date | null = null;
  private readonly READING_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minuti
  
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private apiService: GenericApiService) {
    // Carica le notifiche dal localStorage se disponibili
    this.loadNotifications();
  }

  /**
   * Aggiunge una nuova notifica
   */
  addNotification(notification: Omit<ActivityNotification, 'id' | 'timestamp'>): void {
    const newNotification: ActivityNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      isRead: notification.isRead ?? false,
      category: notification.category ?? 'activity'
    };

    const currentNotifications = this.notificationsSubject.value;
    // Rimuovi notifiche duplicate basate su title e category
    const filteredNotifications = currentNotifications.filter(n => 
      !(n.title === newNotification.title && 
        n.category === newNotification.category &&
        n.category === 'reading')
    );
    const updatedNotifications = [newNotification, ...filteredNotifications].slice(0, this.MAX_NOTIFICATIONS);
    
    this.notificationsSubject.next(updatedNotifications);
    this.saveNotifications(updatedNotifications);
  }

  /**
   * Notifica per appartamenti
   */
  notifyApartment(action: 'created' | 'updated' | 'deleted', apartmentName: string, apartmentId?: number): void {
    const actionText = {
      created: 'Appartamento creato',
      updated: 'Appartamento modificato',
      deleted: 'Appartamento eliminato'
    };

    this.addNotification({
      type: 'apartment',
      action,
      title: actionText[action],
      subtitle: apartmentName,
      icon: 'home',
      color: '#f55b56', // Rosso per appartamenti
      entityId: apartmentId,
      entityName: apartmentName
    });
  }

  /**
   * Notifica per inquilini
   */
  notifyTenant(action: 'created' | 'updated' | 'deleted', tenantName: string, tenantId?: number): void {
    const actionText = {
      created: 'Inquilino aggiunto',
      updated: 'Inquilino modificato',
      deleted: 'Inquilino rimosso'
    };

    this.addNotification({
      type: 'tenant',
      action,
      title: actionText[action],
      subtitle: tenantName,
      icon: 'person',
      color: '#3b82f6', // Blu per inquilini
      entityId: tenantId,
      entityName: tenantName
    });
  }

  /**
   * Notifica per contratti
   */
  notifyLease(action: 'created' | 'updated' | 'deleted', apartmentName: string, tenantName: string, leaseId?: number): void {
    const actionText = {
      created: 'Contratto creato',
      updated: 'Contratto modificato',
      deleted: 'Contratto terminato'
    };

    this.addNotification({
      type: 'lease',
      action,
      title: actionText[action],
      subtitle: `${apartmentName} - ${tenantName}`,
      icon: 'description',
      color: '#2D7D46', // Verde per contratti
      entityId: leaseId,
      entityName: `${apartmentName} - ${tenantName}`
    });
  }

  /**
   * Notifica per letture utenze
   */
  notifyUtilityReading(action: 'created' | 'updated' | 'deleted', apartmentName: string, utilityType: 'electricity' | 'water' | 'gas', readingId?: number): void {
    const actionText = {
      created: 'Lettura registrata',
      updated: 'Lettura modificata',
      deleted: 'Lettura eliminata'
    };

    const utilityIcons = {
      electricity: 'bolt',
      water: 'water_drop',
      gas: 'local_fire_department'
    };

    const utilityColors = {
      electricity: '#f59e0b', // Arancione per elettricità
      water: '#3b82f6',      // Blu per acqua
      gas: '#ef4444'         // Rosso per gas
    };

    this.addNotification({
      type: 'utility',
      action,
      title: actionText[action],
      subtitle: `${apartmentName} - ${this.getUtilityTypeName(utilityType)}`,
      icon: utilityIcons[utilityType],
      color: utilityColors[utilityType],
      entityId: readingId,
      entityName: `${apartmentName} - ${this.getUtilityTypeName(utilityType)}`
    });
  }

  /**
   * Rimuove una notifica specifica
   */
  removeNotification(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);
    
    this.notificationsSubject.next(updatedNotifications);
    this.saveNotifications(updatedNotifications);
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    
    this.notificationsSubject.next(updatedNotifications);
    this.saveNotifications(updatedNotifications);
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(n => ({ ...n, isRead: true }));
    
    this.notificationsSubject.next(updatedNotifications);
    this.saveNotifications(updatedNotifications);
  }

  /**
   * Ottiene il numero di notifiche non lette
   */
  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.isRead).length;
  }

  /**
   * Ottiene le notifiche sulle letture
   */
  getReadingNotifications(): ActivityNotification[] {
    return this.notificationsSubject.value.filter(n => n.category === 'reading');
  }

  /**
   * Verifica le letture mancanti o incomplete per gli appartamenti occupati
   */
  checkMissingReadings(forceRefresh: boolean = false): Observable<ReadingNotificationData> {
    const now = Date.now();
    
    // Usa cache se disponibile e non è scaduta
    if (!forceRefresh && 
        this.readingNotificationsCache && 
        this.lastReadingCheck && 
        (now - this.lastReadingCheck.getTime()) < this.READING_CHECK_INTERVAL) {
      return of(this.readingNotificationsCache);
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Recupera appartamenti occupati e letture in parallelo
    return forkJoin({
      apartments: this.apiService.getAll<Apartment>('apartments').pipe(
        catchError(() => of([]))
      ),
      leases: this.apiService.getAll<Lease>('leases', { status: 'active' }).pipe(
        catchError(() => of([]))
      ),
      readings: this.apiService.getAll<UtilityReading>('utilities').pipe(
        catchError(() => of([]))
      )
    }).pipe(
      map(({ apartments, leases, readings }) => {
        // Estrai ID appartamenti occupati
        const occupiedApartmentIds = new Set(
          leases.map(lease => lease.apartmentId)
        );

        // Filtra solo appartamenti occupati
        const occupiedApartments = apartments.filter(apt => 
          occupiedApartmentIds.has(apt.id)
        );

        // Filtra letture del mese corrente
        const currentMonthReadings = readings.filter(reading => {
          const readingDate = new Date(reading.readingDate);
          return readingDate.getMonth() === currentMonth && 
                 readingDate.getFullYear() === currentYear;
        });

        // Raggruppa letture per appartamento e tipo
        const readingsByApartment = new Map<number, Set<'electricity' | 'water' | 'gas'>>();
        
        currentMonthReadings.forEach(reading => {
          if (!readingsByApartment.has(reading.apartmentId)) {
            readingsByApartment.set(reading.apartmentId, new Set());
          }
          readingsByApartment.get(reading.apartmentId)!.add(reading.type);
        });

        // Identifica appartamenti senza letture
        const apartmentsWithoutReadings: Array<{ id: number; name: string }> = [];
        const apartmentsWithIncompleteReadings: Array<{
          id: number;
          name: string;
          missingTypes: ('electricity' | 'water' | 'gas')[];
        }> = [];

        // Tipi di utenze standard
        const standardTypes: ('electricity' | 'water' | 'gas')[] = ['electricity', 'water', 'gas'];

        occupiedApartments.forEach(apartment => {
          const apartmentReadings = readingsByApartment.get(apartment.id) || new Set();
          
          if (apartmentReadings.size === 0) {
            // Nessuna lettura per questo appartamento
            apartmentsWithoutReadings.push({
              id: apartment.id,
              name: apartment.name
            });
          } else if (apartmentReadings.size < standardTypes.length) {
            // Letture incomplete
            const missingTypes = standardTypes.filter(type => !apartmentReadings.has(type));
            apartmentsWithIncompleteReadings.push({
              id: apartment.id,
              name: apartment.name,
              missingTypes
            });
          }
        });

        const result: ReadingNotificationData = {
          apartmentsWithoutReadings,
          apartmentsWithIncompleteReadings
        };

        // Aggiorna cache
        this.readingNotificationsCache = result;
        this.lastReadingCheck = new Date();

        // Genera notifiche
        this.generateReadingNotifications(result);

        return result;
      })
    );
  }

  /**
   * Genera notifiche basate sui dati delle letture mancanti
   */
  private generateReadingNotifications(data: ReadingNotificationData): void {
    const currentNotifications = this.notificationsSubject.value;
    
    // Rimuovi vecchie notifiche sulle letture
    const filteredNotifications = currentNotifications.filter(n => n.category !== 'reading');

    // Notifica per appartamenti senza letture
    if (data.apartmentsWithoutReadings.length > 0) {
      const apartmentNames = data.apartmentsWithoutReadings
        .slice(0, 3)
        .map(a => a.name)
        .join(', ');
      const remaining = data.apartmentsWithoutReadings.length - 3;
      const subtitle = remaining > 0 
        ? `${apartmentNames}${remaining > 0 ? ` e altri ${remaining}` : ''}`
        : apartmentNames;

      this.addNotification({
        type: 'utility',
        action: 'created',
        title: data.apartmentsWithoutReadings.length === 1
          ? '1 appartamento senza letture mensili'
          : `${data.apartmentsWithoutReadings.length} appartamenti senza letture mensili`,
        subtitle,
        icon: 'warning',
        color: '#f59e0b', // Arancione per warning
        category: 'reading',
        isRead: false,
        metadata: {
          apartmentIds: data.apartmentsWithoutReadings.map(a => a.id),
          apartmentNames: data.apartmentsWithoutReadings.map(a => a.name)
        }
      });
    }

    // Notifica per appartamenti con letture incomplete
    if (data.apartmentsWithIncompleteReadings.length > 0) {
      const apartmentNames = data.apartmentsWithIncompleteReadings
        .slice(0, 3)
        .map(a => a.name)
        .join(', ');
      const remaining = data.apartmentsWithIncompleteReadings.length - 3;
      const subtitle = remaining > 0 
        ? `${apartmentNames}${remaining > 0 ? ` e altri ${remaining}` : ''}`
        : apartmentNames;

      // Determina tipi mancanti più comuni
      const missingTypesCount = new Map<string, number>();
      data.apartmentsWithIncompleteReadings.forEach(apt => {
        apt.missingTypes.forEach(type => {
          missingTypesCount.set(type, (missingTypesCount.get(type) || 0) + 1);
        });
      });

      const mostCommonMissing = Array.from(missingTypesCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      const missingTypeName = mostCommonMissing 
        ? this.getUtilityTypeName(mostCommonMissing)
        : 'utilities';

      this.addNotification({
        type: 'utility',
        action: 'created',
        title: data.apartmentsWithIncompleteReadings.length === 1
          ? `1 appartamento con letture incomplete (manca ${missingTypeName})`
          : `${data.apartmentsWithIncompleteReadings.length} appartamenti con letture incomplete`,
        subtitle,
        icon: 'info',
        color: '#3b82f6', // Blu per info
        category: 'reading',
        isRead: false,
        metadata: {
          apartmentIds: data.apartmentsWithIncompleteReadings.map(a => a.id),
          apartmentNames: data.apartmentsWithIncompleteReadings.map(a => a.name),
          missingTypes: data.apartmentsWithIncompleteReadings.flatMap(a => a.missingTypes)
        }
      });
    }
  }

  /**
   * Invalida la cache delle letture (da chiamare quando vengono aggiunte nuove letture)
   */
  invalidateReadingCache(): void {
    this.readingNotificationsCache = null;
    this.lastReadingCheck = null;
  }

  /**
   * Pulisce tutte le notifiche
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
    this.saveNotifications([]);
  }

  /**
   * Ottiene le notifiche correnti
   */
  getNotifications(): ActivityNotification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Genera un ID univoco per la notifica
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Converte il tipo di utenza in nome leggibile
   */
  private getUtilityTypeName(type: string): string {
    const names = {
      electricity: 'Elettricità',
      water: 'Acqua',
      gas: 'Gas'
    };
    return names[type as keyof typeof names] || type;
  }

  /**
   * Salva le notifiche nel localStorage
   */
  private saveNotifications(notifications: ActivityNotification[]): void {
    try {
      const notificationsToSave = notifications.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
        isRead: n.isRead ?? false,
        category: n.category ?? 'activity'
      }));
      localStorage.setItem('dashboard_notifications', JSON.stringify(notificationsToSave));
    } catch (error) {
      console.warn('Impossibile salvare le notifiche nel localStorage:', error);
    }
  }

  /**
   * Carica le notifiche dal localStorage
   */
  private loadNotifications(): void {
    try {
      const saved = localStorage.getItem('dashboard_notifications');
      if (saved) {
        const notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          isRead: n.isRead ?? false,
          category: n.category ?? 'activity'
        }));
        this.notificationsSubject.next(notifications);
      }
    } catch (error) {
      console.warn('Impossibile caricare le notifiche dal localStorage:', error);
    }
  }

  /**
   * Mostra una notifica di successo
   */
  showSuccess(message: string): void {
    this.addNotification({
      type: 'utility',
      action: 'created',
      title: 'Successo',
      subtitle: message,
      icon: 'check_circle',
      color: '#10b981'
    });
  }

  /**
   * Mostra una notifica di errore
   */
  showError(message: string): void {
    this.addNotification({
      type: 'utility',
      action: 'deleted',
      title: 'Errore',
      subtitle: message,
      icon: 'error',
      color: '#ef4444'
    });
  }
} 