import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Observable, Subject, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

import { Invoice } from '../../../shared/models';
import { InvoiceService } from '../../../shared/services/invoice.service';

@Component({
  selector: 'app-invoice-print',
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class InvoicePrintComponent implements OnInit, OnDestroy {
  @ViewChild('printArea') printArea!: ElementRef;

  // Data
  invoice$: Observable<Invoice | null> = of(null);

  // Loading states
  isLoading = false;
  isGeneratingPdf = false;

  // Print options
  showPrintOptions = true;
  includeLogo = true;
  includeQRCode = true;
  includePaymentInstructions = true;

  private destroy$ = new Subject<void>();

  // Cache per nomi di inquilini e appartamenti
  private tenantNames: { [id: number]: string } = {};
  private apartmentNames: { [id: number]: string } = {};

  constructor(
    private invoiceService: InvoiceService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadInvoiceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica i dati della fattura
   */
  private loadInvoiceData(): void {
    this.isLoading = true;

    this.invoice$ = this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const invoiceId = +params['id'];
        return this.invoiceService.getInvoiceById(invoiceId).pipe(
          catchError(error => {
            console.error('Errore caricamento fattura:', error);
            this.showError('Errore nel caricamento della fattura');
            return of(null);
          })
        );
      })
    );

    this.invoice$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Stampa la fattura
   */
  printInvoice(): void {
    if (!this.printArea) return;

    const printContent = this.printArea.nativeElement.innerHTML;
    const originalContent = document.body.innerHTML;

    // Sostituisce il contenuto della pagina con quello da stampare
    document.body.innerHTML = `
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .invoice-print-container { 
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-header { 
            border-bottom: 2px solid #2D7D46 !important;
            margin-bottom: 30px !important;
          }
          .invoice-content { 
            font-size: 12px !important;
          }
          .invoice-footer { 
            margin-top: 40px !important;
            border-top: 1px solid #ccc !important;
            padding-top: 20px !important;
          }
        }
      </style>
      ${printContent}
    `;

    window.print();

    // Ripristina il contenuto originale
    document.body.innerHTML = originalContent;
    
    // Ricarica il componente
    this.loadInvoiceData();
  }

  /**
   * Genera PDF per SendPulse
   */
  generatePdfForSendPulse(): void {
    this.isGeneratingPdf = true;

    this.invoice$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(invoice => {
      if (invoice) {
        this.invoiceService.generateInvoicePdf(invoice.id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (blob) => {
            this.isGeneratingPdf = false;
            
            // Crea un link per il download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `fattura-${invoice.invoiceNumber}-sendpulse.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('PDF generato con successo per SendPulse');
          },
          error: (error) => {
            this.isGeneratingPdf = false;
            this.showError('Errore nella generazione del PDF');
            console.error('Errore generazione PDF:', error);
          }
        });
      }
    });
  }

  /**
   * Copia il contenuto per WhatsApp
   */
  copyForWhatsApp(): void {
    this.invoice$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(invoice => {
      if (invoice) {
        const whatsappText = this.generateWhatsAppText(invoice);
        
        navigator.clipboard.writeText(whatsappText).then(() => {
          this.showSuccess('Testo copiato negli appunti per WhatsApp');
        }).catch(() => {
          this.showError('Errore nella copia del testo');
        });
      }
    });
  }

  /**
   * Genera il testo per WhatsApp
   */
  generateWhatsAppText(invoice: Invoice): string {
    const tenantName = this.getTenantName(invoice.tenantId);
    const apartmentName = this.getApartmentName(invoice.apartmentId);
    const period = this.getPeriodLabel(invoice);
    const total = this.formatCurrency(invoice.total);
    const dueDate = this.formatDate(invoice.dueDate);
    
    let text = `🏠 *FATTURA ${invoice.invoiceNumber}*\n\n`;
    text += `📅 *Periodo:* ${period}\n`;
    text += `👤 *Inquilino:* ${tenantName}\n`;
    text += `🏢 *Appartamento:* ${apartmentName}\n\n`;
    
    text += `💰 *Dettaglio Spese:*\n`;
    invoice.items.forEach(item => {
      const itemType = this.getItemTypeLabel(item.type);
      const amount = this.formatCurrency(item.amount);
      text += `• ${itemType}: ${amount}\n`;
    });
    
    text += `\n💶 *Totale da Pagare:* ${total}\n`;
    text += `📅 *Scadenza:* ${dueDate}\n\n`;
    
    if (this.includePaymentInstructions) {
      text += `💳 *Modalità di Pagamento:*\n`;
      text += `• Bonifico Bancario\n`;
      text += `• IBAN: IT60 X054 2811 1010 0000 0123 456\n`;
      text += `• Causale: ${invoice.invoiceNumber}\n\n`;
    }
    
    text += `📞 Per informazioni: +39 123 456 7890\n`;
    text += `📧 Email: info@agriturismo.it\n\n`;
    
    text += `Grazie per la fiducia! 🙏`;
    
    return text;
  }

  /**
   * Torna al dettaglio
   */
  backToDetail(): void {
    this.invoice$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(invoice => {
      if (invoice) {
        this.router.navigate(['/billing/detail', invoice.id]);
      } else {
        this.router.navigate(['/billing/list']);
      }
    });
  }

  /**
   * Utility methods
   */
  getTenantName(tenantId: number): string {
    // Cache locale per i nomi dei tenant
    if (!this.tenantNames[tenantId]) {
      this.invoiceService.getTenantName(tenantId).subscribe(name => {
        this.tenantNames[tenantId] = name;
      });
      return `Inquilino ${tenantId}`;
    }
    return this.tenantNames[tenantId];
  }

  getApartmentName(apartmentId: number): string {
    // Cache locale per i nomi degli appartamenti
    if (!this.apartmentNames[apartmentId]) {
      this.invoiceService.getApartmentName(apartmentId).subscribe(name => {
        this.apartmentNames[apartmentId] = name;
      });
      return `Appartamento ${apartmentId}`;
    }
    return this.apartmentNames[apartmentId];
  }

  getItemTypeLabel(type: string): string {
    const types = {
      'rent': 'Affitto',
      'electricity': 'Elettricità',
      'water': 'Acqua',
      'gas': 'Gas',
      'maintenance': 'Manutenzione',
      'other': 'Altro'
    };
    return types[type as keyof typeof types] || type;
  }

  getItemTypeIcon(type: string): string {
    const icons = {
      'rent': '🏠',
      'electricity': '⚡',
      'water': '💧',
      'gas': '🔥',
      'maintenance': '🔧',
      'other': '📋'
    };
    return icons[type as keyof typeof icons] || '📋';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('it-IT');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  getPeriodLabel(invoice: Invoice): string {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[invoice.month - 1]} ${invoice.year}`;
  }

  getDaysUntilDue(invoice: Invoice): number {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(invoice: Invoice): boolean {
    return !invoice.isPaid && new Date(invoice.dueDate) < new Date();
  }

  isDueSoon(invoice: Invoice): boolean {
    if (invoice.isPaid) return false;
    const daysUntilDue = this.getDaysUntilDue(invoice);
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  }

  /**
   * Notifiche
   */
  private showSuccess(message: string): void {
    // TODO: Implementare NotificationService
    this.snackBar.open(message, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    // TODO: Implementare NotificationService
    this.snackBar.open(message, 'Chiudi', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
} 