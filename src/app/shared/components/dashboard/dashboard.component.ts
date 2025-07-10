import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { Chart, registerables } from 'chart.js';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RouterModule } from '@angular/router';

// Models e Services
import { Apartment, Invoice, Lease, Tenant, UtilityReading } from '../../../shared/models';
import { GenericApiService } from '../../../shared/services/generic-api.service';
import { ConfirmationDialogService } from '../../../shared/services/confirmation-dialog.service';

// Dialog Components
import { ApartmentFormComponent } from '../../../pages/apartment/apartment-form/apartment-form-dialog.component';
import { ApartmentDetailDialogComponent } from '../../../pages/apartment/apartment-detail/apartment-detail-dialog.component';
import { TenantFormComponent } from '../../../pages/tenant/tenant-form/tenant-form-dialog.component';
import { TenantDetailDialogComponent } from '../../../pages/tenant/tenant-detail/tenant-detail-dialog.component';
import { LeaseFormComponent } from '../../../pages/lease/lease-form/lease-form.component';

// Registra Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    RouterModule
  ]
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('occupancyChart') occupancyChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('utilityChart') utilityChart!: ElementRef<HTMLCanvasElement>;

  // Dati principali (tutto dinamico)
  apartments: Apartment[] = [];
  tenants: Tenant[] = [];
  leases: Lease[] = [];
  invoices: Invoice[] = [];
  utilityReadings: UtilityReading[] = [];

  // Statistiche calcolate dinamicamente
  totalApartments = 0;
  occupiedApartments = 0;
  availableApartments = 0;
  occupancyRate = 0;
  totalTenants = 0;
  activeLeases = 0;
  expiringLeases = 0;
  totalRevenue = 0;
  monthlyRevenue = 0;
  unpaidInvoices = 0;
  overdueInvoices = 0;
  utilityAlerts = 0;

  // Attività recenti (dinamiche)
  recentActivities: any[] = [];

  // Meteo semplice (per ora statico, futuro API)
  weather = {
    temperature: 22,
    condition: 'Soleggiato',
    humidity: 65,
    windSpeed: 12,
    icon: 'wb_sunny'
  };

  // Grafici
  occupancyChartInstance: Chart | null = null;
  revenueChartInstance: Chart | null = null;
  utilityChartInstance: Chart | null = null;

  // Stati del componente
  isLoading = true;
  hasError = false;
  errorMessage = '';
  lastUpdate = new Date();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: GenericApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Inizializza i grafici dopo il caricamento dei dati
    setTimeout(() => {
      if (!this.isLoading) {
        this.initializeCharts();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  /**
   * Carica tutti i dati dalla API
   */
  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Carica solo i dati che esistono realmente
    forkJoin({
      apartments: this.apiService.getAll<Apartment>('apartments'),
      tenants: this.apiService.getAll<Tenant>('tenants'),
      leases: this.apiService.getAll<Lease>('leases')
      // invoices: this.apiService.getAll<Invoice>('invoices') // TODO: Decommentare quando le invoice saranno implementate
    }).subscribe({
      next: (data) => {
        this.apartments = data.apartments || [];
        this.tenants = data.tenants || [];
        this.leases = data.leases || [];
        // this.invoices = data.invoices || []; // TODO: Decommentare quando le invoice saranno implementate
        this.invoices = []; // Temporaneo: array vuoto finché non ci sono le invoice

        // Prova a caricare le utility readings se disponibili
        this.loadUtilityReadings();
        
        this.calculateAllStats();
        this.generateRecentActivities();
        this.updateWeather();
        
        this.isLoading = false;
        this.lastUpdate = new Date();
        
        // Inizializza i grafici
        setTimeout(() => this.initializeCharts(), 100);
      },
      error: (error) => {
        console.error('Errore nel caricamento dati dashboard:', error);
        this.hasError = true;
        this.errorMessage = 'Errore nel caricamento dei dati. Verifica la connessione al server.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Carica le utility readings (opzionale)
   */
  private loadUtilityReadings(): void {
    // Prova a caricare le utility readings senza bloccare il resto
    this.apiService.getAllUtilityReadings().subscribe({
      next: (readings) => {
        this.utilityReadings = readings || [];
        this.calculateUtilityStats();
        this.updateUtilityChart();
      },
      error: (error) => {
        console.warn('Utility readings non disponibili:', error);
        this.utilityReadings = [];
      }
    });
  }

  /**
   * Calcola tutte le statistiche dinamicamente
   */
  private calculateAllStats(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Statistiche appartamenti
    this.totalApartments = this.apartments.length;
    
    // Calcola appartamenti occupati dai contratti attivi
    this.activeLeases = this.leases.filter(lease => {
      const startDate = new Date(lease.startDate);
      const endDate = new Date(lease.endDate);
      return startDate <= now && endDate >= now;
    }).length;
    
    this.occupiedApartments = this.activeLeases;
    this.availableApartments = this.totalApartments - this.occupiedApartments;
    this.occupancyRate = this.totalApartments > 0 
      ? Math.round((this.occupiedApartments / this.totalApartments) * 100) 
      : 0;

    // Contratti in scadenza (prossimi 30 giorni)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    this.expiringLeases = this.leases.filter(lease => {
      const endDate = new Date(lease.endDate);
      return endDate >= now && endDate <= thirtyDaysFromNow;
    }).length;

    // Statistiche inquilini
    this.totalTenants = this.tenants.length;

    // Statistiche fatture - TODO: Decommentare quando le invoice saranno implementate
    // this.unpaidInvoices = this.invoices.filter(invoice => !invoice.isPaid).length;
    this.unpaidInvoices = 0; // Temporaneo

    // Fatture scadute - TODO: Decommentare quando le invoice saranno implementate  
    // this.overdueInvoices = this.invoices.filter(invoice => {
    //   if (!invoice.isPaid && invoice.dueDate) {
    //     const dueDate = new Date(invoice.dueDate);
    //     return dueDate < now;
    //   }
    //   return false;
    // }).length;
    this.overdueInvoices = 0; // Temporaneo

    // Calcola ricavi - TODO: Decommentare quando le invoice saranno implementate
    // this.totalRevenue = this.invoices
    //   .filter(invoice => invoice.isPaid)
    //   .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    this.totalRevenue = 0; // Temporaneo

    // this.monthlyRevenue = this.invoices
    //   .filter(invoice => {
    //     if (!invoice.isPaid || !invoice.paymentDate) return false;
    //     const paidDate = new Date(invoice.paymentDate);
    //     return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    //   })
    //   .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    this.monthlyRevenue = 0; // Temporaneo
  }

  /**
   * Calcola statistiche utenze
   */
  private calculateUtilityStats(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Appartamenti senza letture per il mese corrente
    this.utilityAlerts = this.apartments.filter(apartment => {
      const hasCurrentMonthReading = this.utilityReadings.some(reading => {
        const readingDate = new Date(reading.readingDate);
        return reading.apartmentId === apartment.id &&
               readingDate.getMonth() === currentMonth &&
               readingDate.getFullYear() === currentYear;
      });
      return !hasCurrentMonthReading;
    }).length;
  }

  /**
   * Genera attività recenti dinamicamente
   */
  private generateRecentActivities(): void {
    this.recentActivities = [];
    
    // Contratti recenti
    this.leases
      .sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime())
      .slice(0, 3)
      .forEach(lease => {
        const apartment = this.apartments.find(apt => apt.id === lease.apartmentId);
        const tenant = this.tenants.find(t => t.id === lease.tenantId);
        const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Inquilino';
        
        this.recentActivities.push({
          id: `lease-${lease.id}`,
          type: 'lease',
          title: 'Nuovo contratto',
          subtitle: `${apartment?.name || 'Appartamento'} - ${tenantName}`,
          timestamp: new Date(lease.createdAt || lease.startDate),
          icon: 'description',
          color: '#2D7D46'
        });
      });

    // Pagamenti recenti - TODO: Decommentare quando le invoice saranno implementate
    // this.invoices
    //   .filter(invoice => invoice.isPaid && invoice.paymentDate)
    //   .sort((a, b) => new Date(b.paymentDate!).getTime() - new Date(a.paymentDate!).getTime())
    //   .slice(0, 3)
    //   .forEach(invoice => {
    //     const description = invoice.items && invoice.items.length > 0 
    //       ? invoice.items[0].description 
    //       : 'Fattura';
    //     
    //     this.recentActivities.push({
    //       id: `payment-${invoice.id}`,
    //       type: 'payment',
    //       title: 'Pagamento ricevuto',
    //       subtitle: `€${invoice.total?.toFixed(2)} - ${description}`,
    //       timestamp: new Date(invoice.paymentDate!),
    //       icon: 'payment',
    //       color: '#10b981'
    //     });
    //   });

    // Nuovi inquilini
    this.tenants
      .filter(tenant => tenant.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 2)
      .forEach(tenant => {
        this.recentActivities.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          title: 'Nuovo inquilino',
          subtitle: `${tenant.firstName} ${tenant.lastName}`,
          timestamp: new Date(tenant.createdAt!),
          icon: 'person_add',
          color: '#3b82f6'
        });
      });

    // Ordina per data
    this.recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.recentActivities = this.recentActivities.slice(0, 8);
  }

  /**
   * Aggiorna info meteo (per ora semplice)
   */
  private updateWeather(): void {
    // Per ora aggiorna solo la temperatura casualmente
    // In futuro qui ci sarà la chiamata API meteo
    this.weather.temperature = Math.round(Math.random() * 15 + 15); // 15-30°C
    
    // Condizioni casuali per ora
    const conditions = [
      { condition: 'Soleggiato', icon: 'wb_sunny' },
      { condition: 'Nuvoloso', icon: 'wb_cloudy' },
      { condition: 'Piovoso', icon: 'umbrella' }
    ];
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    this.weather.condition = randomCondition.condition;
    this.weather.icon = randomCondition.icon;
  }

  /**
   * Ottieni stato appartamenti dinamicamente
   */
  getApartmentStatuses(): any[] {
    const now = new Date();
    
    return this.apartments.map(apartment => {
      const activeLease = this.leases.find(lease => {
        const startDate = new Date(lease.startDate);
        const endDate = new Date(lease.endDate);
        return lease.apartmentId === apartment.id && startDate <= now && endDate >= now;
      });

      let status = 'available';
      let tenant = undefined;
      let checkIn = undefined;
      let checkOut = undefined;

      if (activeLease) {
        status = 'occupied';
        const tenantData = this.tenants.find(t => t.id === activeLease.tenantId);
        tenant = tenantData ? `${tenantData.firstName} ${tenantData.lastName}` : 'Inquilino';
        checkIn = new Date(activeLease.startDate);
        checkOut = new Date(activeLease.endDate);
      }

      // Calcola ricavi appartamento - TODO: Decommentare quando le invoice saranno implementate
      // const revenue = this.invoices
      //   .filter(invoice => invoice.isPaid && invoice.apartmentId === apartment.id)
      //   .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      const revenue = 0; // Temporaneo

      return {
        id: apartment.id,
        name: apartment.name,
        status,
        tenant,
        checkIn,
        checkOut,
        revenue
      };
    });
  }

  /**
   * Inizializza tutti i grafici
   */
  private initializeCharts(): void {
    // Distruggi prima i grafici esistenti se ci sono
    this.destroyCharts();
    
    setTimeout(() => {
      this.createOccupancyChart();
      this.createRevenueChart();
      this.createUtilityChart();
    }, 100);
  }

  /**
   * Crea grafico occupazione
   */
  private createOccupancyChart(): void {
    if (!this.occupancyChart?.nativeElement) return;

    const ctx = this.occupancyChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.occupancyChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Occupati', 'Disponibili'],
        datasets: [{
          data: [this.occupiedApartments, this.availableApartments],
          backgroundColor: ['#2D7D46', '#e5e7eb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        cutout: '70%'
      }
    });
  }

  /**
   * Crea grafico ricavi
   */
  private createRevenueChart(): void {
    if (!this.revenueChart?.nativeElement) return;

    const ctx = this.revenueChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Genera dati per gli ultimi 6 mesi
    const months: string[] = [];
    const revenues: number[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('it-IT', { month: 'short' }));
      
      // TODO: Decommentare quando le invoice saranno implementate
      // const monthRevenue = this.invoices
      //   .filter(invoice => {
      //     if (!invoice.isPaid || !invoice.paymentDate) return false;
      //     const paidDate = new Date(invoice.paymentDate);
      //     return paidDate.getMonth() === date.getMonth() && 
      //            paidDate.getFullYear() === date.getFullYear();
      //   })
      //   .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      
      // Temporaneo: dati casuali per mostrare il grafico
      const monthRevenue = Math.random() * 5000 + 1000;
      revenues.push(monthRevenue);
    }

    this.revenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Ricavi (€)',
          data: revenues,
          borderColor: '#10b981',
          backgroundColor: '#10b98120',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => '€' + value
            }
          }
        }
      }
    });
  }

  /**
   * Crea grafico utenze
   */
  private createUtilityChart(): void {
    if (!this.utilityChart?.nativeElement) return;

    const ctx = this.utilityChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Calcola consumi per tipo
    const electricityTotal = this.utilityReadings
      .filter(r => r.type === 'electricity')
      .reduce((sum, r) => sum + (r.consumption || 0), 0);
    
    const waterTotal = this.utilityReadings
      .filter(r => r.type === 'water')
      .reduce((sum, r) => sum + (r.consumption || 0), 0);
    
    const gasTotal = this.utilityReadings
      .filter(r => r.type === 'gas')
      .reduce((sum, r) => sum + (r.consumption || 0), 0);

    this.utilityChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Elettricità', 'Acqua', 'Gas'],
        datasets: [{
          label: 'Consumo',
          data: [electricityTotal, waterTotal, gasTotal],
          backgroundColor: ['#f59e0b', '#3b82f6', '#f5a623'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Aggiorna grafico utenze
   */
  private updateUtilityChart(): void {
    if (this.utilityChartInstance) {
      this.createUtilityChart();
    }
  }

  /**
   * Distrugge tutti i grafici
   */
  private destroyCharts(): void {
    if (this.occupancyChartInstance) {
      this.occupancyChartInstance.destroy();
      this.occupancyChartInstance = null;
    }
    if (this.revenueChartInstance) {
      this.revenueChartInstance.destroy();
      this.revenueChartInstance = null;
    }
    if (this.utilityChartInstance) {
      this.utilityChartInstance.destroy();
      this.utilityChartInstance = null;
    }
  }

  /**
   * Navigazione
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Ricarica dati
   */
  refreshData(): void {
    this.loadDashboardData();
  }

  /**
   * Formatta data
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Colori stato appartamento
   */
  getApartmentStatusColor(status: string): string {
    switch (status) {
      case 'occupied': return '#2D7D46';
      case 'available': return '#10b981';
      case 'maintenance': return '#f59e0b';
      case 'cleaning': return '#3b82f6';
      default: return '#2D7D46';
    }
  }

  /**
   * Icone stato appartamento
   */
  getApartmentStatusIcon(status: string): string {
    switch (status) {
      case 'occupied': return 'home';
      case 'available': return 'home_work';
      case 'maintenance': return 'build';
      case 'cleaning': return 'cleaning_services';
      default: return 'home';
    }
  }

  /**
   * Funzioni di tracciamento per ngFor
   */
  trackByActivityId(index: number, activity: any): string {
    return activity.id;
  }

  trackByApartmentId(index: number, apartment: any): number {
    return apartment.id;
  }

  // ===================== AZIONI DIALOG =====================

  /**
   * Apre dialog dettagli appartamento
   */
  openApartmentDetails(apartmentId: number): void {
    const dialogRef = this.dialog.open(ApartmentDetailDialogComponent, {
      data: { apartmentId },
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.deleted) {
          this.loadDashboardData();
        } else if (result.edit) {
          this.openApartmentForm(result.apartmentId);
        }
      }
    });
  }

  /**
   * Apre dialog form appartamento (crea/modifica)
   */
  openApartmentForm(apartmentId?: number): void {
    const dialogRef = this.dialog.open(ApartmentFormComponent, {
      data: { apartmentId },
      width: '900px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadDashboardData();
        
        if (result.apartment && !result.skipDetailView) {
          setTimeout(() => {
            this.openApartmentDetails(result.apartment.id);
          }, 300);
        }
      }
    });
  }

  /**
   * Elimina appartamento
   */
  deleteApartment(apartment: Apartment): void {
    this.confirmationService.confirmDelete('l\'appartamento', apartment.name)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('apartments', apartment.id).subscribe({
            next: () => {
              this.loadDashboardData();
              this.snackBar.open('Appartamento eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione dell\'appartamento', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'appartamento', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            }
          });
        }
      });
  }

  /**
   * Elimina appartamento per ID
   */
  deleteApartmentById(apartmentId: number): void {
    const apartment = this.apartments.find(a => a.id === apartmentId);
    if (apartment) {
      this.deleteApartment(apartment);
    }
  }

  /**
   * Apre dialog dettagli inquilino
   */
  viewTenantDetails(tenantId: number): void {
    setTimeout(() => {
      this.dialog.open(TenantDetailDialogComponent, {
        data: { tenantId },
        panelClass: 'tenant-detail-dialog'
      });
    }, 300);
  }

  /**
   * Apre dialog form inquilino (crea/modifica)
   */
  openTenantForm(tenantId?: number): void {
    const dialogRef = this.dialog.open(TenantFormComponent, {
      data: { tenantId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadDashboardData();
      }
    });
  }

  /**
   * Elimina inquilino
   */
  deleteTenant(tenant: Tenant): void {
    this.confirmationService.confirmDelete('l\'inquilino', `${tenant.firstName} ${tenant.lastName}`)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('tenants', tenant.id).subscribe({
            next: () => {
              this.loadDashboardData();
              this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione dell\'inquilino', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione dell\'inquilino', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            }
          });
        }
      });
  }

  /**
   * Apre dialog form contratto
   */
  openLeaseForm(leaseId?: number): void {
    const dialogRef = this.dialog.open(LeaseFormComponent, {
      data: { leaseId },
      width: '900px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadDashboardData();
      }
    });
  }

  /**
   * Elimina contratto
   */
  deleteLease(lease: Lease): void {
    this.confirmationService.confirmDelete('il contratto', `Contratto #${lease.id}`)
      .subscribe(confirmed => {
        if (confirmed) {
          this.apiService.delete('leases', lease.id).subscribe({
            next: () => {
              this.loadDashboardData();
              this.snackBar.open('Contratto eliminato con successo', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            },
            error: (error) => {
              console.error('Errore durante l\'eliminazione del contratto', error);
              this.snackBar.open('Si è verificato un errore durante l\'eliminazione del contratto', 'Chiudi', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            }
          });
        }
      });
  }

  /**
   * Naviga verso la pagina utility per aggiungere letture
   */
  openUtilityForm(): void {
    this.router.navigate(['/utility/reading-form']);
  }

  /**
   * Naviga verso la pagina utility dashboard
   */
  openUtilityDashboard(): void {
    this.router.navigate(['/utility/dashboard']);
  }
}