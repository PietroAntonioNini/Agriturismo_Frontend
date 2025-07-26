import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly MAX_NOTIFICATIONS = 7;
  private notificationsSubject = new BehaviorSubject<ActivityNotification[]>([]);
  
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {
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
      timestamp: new Date()
    };

    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [newNotification, ...currentNotifications].slice(0, this.MAX_NOTIFICATIONS);
    
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
        timestamp: n.timestamp.toISOString()
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
          timestamp: new Date(n.timestamp)
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