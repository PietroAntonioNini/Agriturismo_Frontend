import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhatsAppMessage {
  to: string;
  message: string;
  invoiceId?: number;
  invoiceUrl?: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  constructor() {}

  /**
   * Invia un messaggio WhatsApp tramite SendGrid
   */
  sendMessage(message: WhatsAppMessage): Observable<WhatsAppResponse> {
    // TODO: Implementare l'integrazione reale con SendPulse
    // Simula l'invio del messaggio
    
    console.log('Simulazione invio WhatsApp:', {
      to: message.to,
      message: message.message,
      invoiceId: message.invoiceId
    });

    // Simula una risposta di successo
    return of({
      success: true,
      messageId: `msg_${Date.now()}`
    });
  }

  /**
   * Invia una fattura via WhatsApp
   */
  sendInvoice(phoneNumber: string, invoiceId: number, invoiceUrl?: string): Observable<WhatsAppResponse> {
    const message = `🔔 Nuova fattura disponibile!
    
📄 Fattura #${invoiceId}
📅 Generata automaticamente dal sistema

${invoiceUrl ? `📎 Scarica qui: ${invoiceUrl}` : '📎 La fattura è disponibile nel sistema'}

💰 Controlla i dettagli e procedi con il pagamento.

Per assistenza, contatta il proprietario.`;

    return this.sendMessage({
      to: phoneNumber,
      message,
      invoiceId,
      invoiceUrl
    });
  }

  /**
   * Invia un promemoria di pagamento
   */
  sendPaymentReminder(phoneNumber: string, invoiceId: number, amount: number, dueDate: string): Observable<WhatsAppResponse> {
    const message = `⏰ Promemoria Pagamento Fattura
    
📄 Fattura #${invoiceId}
💰 Importo: €${amount.toFixed(2)}
📅 Scadenza: ${dueDate}

⚠️ La fattura è in scadenza. Procedi con il pagamento per evitare ritardi.

Grazie per la collaborazione!`;

    return this.sendMessage({
      to: phoneNumber,
      message,
      invoiceId
    });
  }

  /**
   * Invia notifica di pagamento ricevuto
   */
  sendPaymentConfirmation(phoneNumber: string, invoiceId: number, amount: number): Observable<WhatsAppResponse> {
    const message = `✅ Pagamento Ricevuto
    
📄 Fattura #${invoiceId}
💰 Importo: €${amount.toFixed(2)}
📅 Data: ${new Date().toLocaleDateString('it-IT')}

Grazie per il pagamento! La fattura è stata contabilizzata.`;

    return this.sendMessage({
      to: phoneNumber,
      message,
      invoiceId
    });
  }

  /**
   * Verifica se un numero di telefono è valido per WhatsApp
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Rimuovi spazi, trattini e parentesi
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Verifica formato italiano (+39 seguito da 10 cifre)
    const italianFormat = /^\+39\d{10}$/;
    
    // Verifica formato internazionale (da 7 a 15 cifre)
    const internationalFormat = /^\+[1-9]\d{6,14}$/;
    
    return italianFormat.test(cleanNumber) || internationalFormat.test(cleanNumber);
  }

  /**
   * Formatta un numero di telefono per WhatsApp
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Rimuovi spazi, trattini e parentesi
    let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Se inizia con 0, sostituisci con +39
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '+39' + cleanNumber.substring(1);
    }
    
    // Se non inizia con +, aggiungi +39
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+39' + cleanNumber;
    }
    
    return cleanNumber;
  }
}
