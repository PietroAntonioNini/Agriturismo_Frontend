import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

import { Apartment, MonthlyUtilityData, ApartmentUtilityData, UtilityStatistics } from '../../../shared/models';
import { ReadingFormComponent } from '../reading-form/reading-form.component';
import { ReadingHistoryComponent } from '../reading-history/reading-history.component';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { GenericApiService } from '../../../shared/services/generic-api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-utility-dashboard',
  templateUrl: './utility-dashboard.component.html',
  styleUrls: ['./utility-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule
  ]
})
export class UtilityDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('comparisonChartCanvas') comparisonChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  apartments: Apartment[] = [];
  selectedApartmentId: number | null = null;
  selectedYear: number = new Date().getFullYear();
  selectedView: 'consumption' | 'costs' | 'comparison' = 'consumption';
  isLoading = true;
  errorMessage: string | null = null;
  chart: Chart | null = null;
  comparisonChart: Chart | null = null;
  
  // Dati per i grafici
  allApartmentsData: MonthlyUtilityData[] = [];
  apartmentSpecificData: ApartmentUtilityData[] = [];
  apartmentUtilityData: ApartmentUtilityData[] = [];
  utilityStatistics: UtilityStatistics | null = null;
  
  // Alert appartamenti senza letture
  apartmentsWithoutReadings: Apartment[] = [];
  utilityAlerts = 0;
  
  // Anni disponibili
  availableYears: number[] = [];
  
  // Mesi dell'anno
  months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  // Colori per i grafici
  chartColors = {
    electricity: 'rgba(255, 206, 86, 0.6)',  // Giallo per Elettricità
    water: 'rgba(54, 162, 235, 0.6)',        // Blu per Acqua
    gas: 'rgba(255, 99, 132, 0.6)'           // Rosa/Rosso per Gas
  };

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { 
    // Genera anni disponibili (ultimi 5 anni + anno corrente + prossimo anno)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 3; year <= currentYear + 1; year++) {
      this.availableYears.push(year);
    }
    
    // Inizializza utilityStatistics con valori predefiniti
    this.initializeUtilityStatistics();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  ngAfterViewInit(): void {
    // Assicurati che il canvas sia pronto dopo la vista, poi inizializza il grafico se ci sono dati
    setTimeout(() => {
      if (!this.isLoading && this.chartCanvas) {
        this.initializeChart();
      }
    }, 100);
  }
  
  private initializeUtilityStatistics(): void {
    this.utilityStatistics = {
      totalApartments: 0,
      totalConsumption: {
        electricity: 0,
        water: 0,
        gas: 0
      },
      totalCosts: {
        electricity: 0,
        water: 0,
        gas: 0,
        total: 0
      },
      averageConsumption: {
        electricity: 0,
        water: 0,
        gas: 0
      },
      monthlyTrend: []
    };
  }
  
  loadDashboardData(forceRefresh: boolean = false): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    // Aggiunge timestamp per evitare cache quando forza il refresh
    const apartmentParams = forceRefresh ? { _t: new Date().getTime() } : undefined;
    
    // Carica gli appartamenti e i dati delle utenze
    forkJoin({
      apartments: this.apiService.getAll<Apartment>('apartments', apartmentParams),
      utilityData: this.apiService.getMonthlyUtilityData(this.selectedYear, forceRefresh)
    }).subscribe({
      next: (result) => {
        this.apartments = result.apartments || [];
        
        // Sposta l'elaborazione pesante fuori dal thread principale per migliorare la reattività
        setTimeout(() => {
          this.processUtilityData(result.utilityData || []);
          this.isLoading = false;
          
          // Inizializza il grafico dopo che i dati sono stati processati
          setTimeout(() => this.initializeChart(), 50);
        }, 50);

      },
      error: (error) => {
        console.error('Errore durante il caricamento dei dati', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati.';
        this.isLoading = false;
      }
    });
  }
  
  processUtilityData(data: MonthlyUtilityData[]): void {
    // Elabora i dati per il grafico
    this.allApartmentsData = data || [];
    
    // Assicurati che gli appartamenti siano definiti
    if (!this.apartments || this.apartments.length === 0) {
      this.apartmentSpecificData = [];
      this.apartmentUtilityData = [];
      this.calculateStatistics();
      return;
    }
    
    // Organizza i dati per appartamento
    this.apartmentSpecificData = this.apartments.map(apartment => {
      const apartmentData = this.allApartmentsData.filter(item => item.apartmentId === apartment.id);
      
      const monthlyData = this.months.map((_, index) => {
        const monthData = apartmentData.find(item => item.month === index + 1) || {
          month: index + 1,
          year: this.selectedYear,
          apartmentId: apartment.id!,
          apartmentName: apartment.name,
          electricity: 0,
          water: 0,
          gas: 0,
          electricityCost: 0,
          waterCost: 0,
          gasCost: 0,
          totalCost: 0
        };
        
        return {
          month: index + 1,
          monthName: this.months[index],
          electricity: monthData.electricity || 0,
          water: monthData.water || 0,
          gas: monthData.gas || 0,
          electricityCost: monthData.electricityCost || 0,
          waterCost: monthData.waterCost || 0,
          gasCost: monthData.gasCost || 0,
          totalCost: monthData.totalCost || 0
        };
      });

      // Calcola i totali annuali
      const yearlyTotals = monthlyData.reduce((totals, month) => ({
        electricity: totals.electricity + month.electricity,
        water: totals.water + month.water,
        gas: totals.gas + month.gas,
        totalCost: totals.totalCost + month.totalCost
      }), { electricity: 0, water: 0, gas: 0, totalCost: 0 });
      
      return {
        apartmentId: apartment.id!,
        apartmentName: apartment.name || 'N/A',
        monthlyData,
        yearlyTotals
      };
    });

    // Assegna anche a apartmentUtilityData per compatibilità con il template
    this.apartmentUtilityData = this.apartmentSpecificData;

    // Calcola le statistiche generali
    this.calculateStatistics();
  }
  
  initializeChart(): void {
    // Distruggi i grafici esistenti
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.comparisonChart) {
      this.comparisonChart.destroy();
      this.comparisonChart = null;
    }
    
    // Inizializza il grafico principale
    if (this.chartCanvas && this.chartCanvas.nativeElement) {
      const canvas = this.chartCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Verifica che il canvas abbia dimensioni valide
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
          console.warn('Canvas non ha dimensioni valide, retry in 100ms');
          setTimeout(() => {
            this.initializeChart();
          }, 100);
          return;
        }
        
        if (this.selectedApartmentId === null) {
          // Visualizza il grafico per tutti gli appartamenti
          this.createAllApartmentsChart(ctx);
        } else {
          // Visualizza il grafico per un appartamento specifico
          this.createSingleApartmentChart(ctx);
        }
      }
    }
    
    // Inizializza il grafico di confronto se necessario
    if (this.selectedView === 'comparison' && this.selectedApartmentId === null) {
      setTimeout(() => {
        this.createComparisonChart();
      }, 100);
    }
  }
  
  createAllApartmentsChart(ctx: CanvasRenderingContext2D): void {
    if (!this.apartments || this.apartments.length === 0) {
      console.log('Nessun appartamento disponibile per il grafico');
      return;
    }
    // Ordina alfabeticamente gli appartamenti per nome
    const sortedApartments = [...this.apartments].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const labels = sortedApartments.map(apt => apt.name || 'N/A');
    let datasets: any[] = [];
    let chartTitle = '';
    let yAxisTitle = '';
    
    if (this.selectedView === 'consumption') {
      // Grafico dei consumi
      const electricityData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.electricity || 0), 0) : 0;
      });
      
      const waterData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.water || 0), 0) : 0;
      });
      
      const gasData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.gas || 0), 0) : 0;
      });
      
      datasets = [
        {
          label: 'Elettricità (kWh)',
          data: electricityData,
          backgroundColor: this.chartColors.electricity,
          borderColor: 'rgba(255, 206, 86, 1)',  // Giallo per Elettricità
          borderWidth: 1
        },
        {
          label: 'Acqua (m³)',
          data: waterData,
          backgroundColor: this.chartColors.water,
          borderColor: 'rgba(54, 162, 235, 1)',  // Blu per Acqua
          borderWidth: 1
        },
        {
          label: 'Gas (m³)',
          data: gasData,
          backgroundColor: this.chartColors.gas,
          borderColor: 'rgba(255, 99, 132, 1)',  // Rosa/Rosso per Gas
          borderWidth: 1
        }
      ];
      
      chartTitle = `Consumi Utenze per Appartamento - ${this.selectedYear}`;
      yAxisTitle = 'Consumo';
      
    } else if (this.selectedView === 'costs') {
      // Grafico dei costi
      const electricityCostData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.electricityCost || 0), 0) : 0;
      });
      
      const waterCostData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.waterCost || 0), 0) : 0;
      });
      
      const gasCostData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.monthlyData.reduce((sum, month) => sum + (month.gasCost || 0), 0) : 0;
      });
      
      datasets = [
        {
          label: 'Elettricità (€)',
          data: electricityCostData,
          backgroundColor: this.chartColors.electricity,
          borderColor: 'rgba(255, 206, 86, 1)',  // Giallo per Elettricità
          borderWidth: 1
        },
        {
          label: 'Acqua (€)',
          data: waterCostData,
          backgroundColor: this.chartColors.water,
          borderColor: 'rgba(54, 162, 235, 1)',  // Blu per Acqua
          borderWidth: 1
        },
        {
          label: 'Gas (€)',
          data: gasCostData,
          backgroundColor: this.chartColors.gas,
          borderColor: 'rgba(255, 99, 132, 1)',  // Rosa/Rosso per Gas
          borderWidth: 1
        }
      ];
      
      chartTitle = `Costi Utenze per Appartamento - ${this.selectedYear}`;
      yAxisTitle = 'Costo (€)';
      
    } else if (this.selectedView === 'comparison') {
      // Grafico di confronto totale
      const totalCostData = sortedApartments.map(apt => {
        const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
        return aptData ? aptData.yearlyTotals.totalCost : 0;
      });
      
      datasets = [
        {
          label: 'Costo Totale (€)',
          data: totalCostData,
          backgroundColor: 'rgba(156, 39, 176, 0.7)',
          borderColor: 'rgba(156, 39, 176, 1)',
          borderWidth: 1
        }
      ];
      
      chartTitle = `Confronto Costi Totali - ${this.selectedYear}`;
      yAxisTitle = 'Costo Totale (€)';
    }
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: yAxisTitle
            }
          },
          x: {
            title: {
              display: true,
              text: 'Appartamenti'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: chartTitle
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  }
  
  createSingleApartmentChart(ctx: CanvasRenderingContext2D): void {
    const apartmentData = this.apartmentSpecificData.find(data => 
      data.apartmentId === this.selectedApartmentId
    );
    
    if (!apartmentData || !apartmentData.monthlyData) {
      console.log('Nessun dato disponibile per l\'appartamento selezionato');
      return;
    }
    
    const labels = this.months;
    let datasets: any[] = [];
    let chartTitle = '';
    let yAxisTitle = '';
    
    if (this.selectedView === 'consumption') {
      // Grafico dei consumi mensili
      const electricityData = apartmentData.monthlyData.map(month => month.electricity || 0);
      const waterData = apartmentData.monthlyData.map(month => month.water || 0);
      const gasData = apartmentData.monthlyData.map(month => month.gas || 0);
      
      datasets = [
        {
          label: 'Elettricità (kWh)',
          data: electricityData,
          backgroundColor: this.chartColors.electricity,
          borderColor: 'rgba(255, 206, 86, 1)',  // Giallo per Elettricità
          borderWidth: 1
        },
        {
          label: 'Acqua (m³)',
          data: waterData,
          backgroundColor: this.chartColors.water,
          borderColor: 'rgba(54, 162, 235, 1)',  // Blu per Acqua
          borderWidth: 1
        },
        {
          label: 'Gas (m³)',
          data: gasData,
          backgroundColor: this.chartColors.gas,
          borderColor: 'rgba(255, 99, 132, 1)',  // Rosa/Rosso per Gas
          borderWidth: 1
        }
      ];
      
      chartTitle = `Consumi Mensili - ${apartmentData.apartmentName} (${this.selectedYear})`;
      yAxisTitle = 'Consumo';
      
    } else if (this.selectedView === 'costs') {
      // Grafico dei costi mensili
      const electricityCostData = apartmentData.monthlyData.map(month => month.electricityCost || 0);
      const waterCostData = apartmentData.monthlyData.map(month => month.waterCost || 0);
      const gasCostData = apartmentData.monthlyData.map(month => month.gasCost || 0);
      
      datasets = [
        {
          label: 'Elettricità (€)',
          data: electricityCostData,
          backgroundColor: this.chartColors.electricity,
          borderColor: 'rgba(255, 206, 86, 1)',  // Giallo per Elettricità
          borderWidth: 1
        },
        {
          label: 'Acqua (€)',
          data: waterCostData,
          backgroundColor: this.chartColors.water,
          borderColor: 'rgba(54, 162, 235, 1)',  // Blu per Acqua
          borderWidth: 1
        },
        {
          label: 'Gas (€)',
          data: gasCostData,
          backgroundColor: this.chartColors.gas,
          borderColor: 'rgba(255, 99, 132, 1)',  // Rosa/Rosso per Gas
          borderWidth: 1
        }
      ];
      
      chartTitle = `Costi Mensili - ${apartmentData.apartmentName} (${this.selectedYear})`;
      yAxisTitle = 'Costo (€)';
      
    } else if (this.selectedView === 'comparison') {
      // Grafico di confronto totale mensile
      const totalCostData = apartmentData.monthlyData.map(month => month.totalCost || 0);
      
      datasets = [
        {
          label: 'Costo Totale (€)',
          data: totalCostData,
          backgroundColor: 'rgba(156, 39, 176, 0.7)',
          borderColor: 'rgba(156, 39, 176, 1)',
          borderWidth: 1
        }
      ];
      
      chartTitle = `Andamento Costi Totali - ${apartmentData.apartmentName} (${this.selectedYear})`;
      yAxisTitle = 'Costo Totale (€)';
    }
    
    console.log('Dati per il grafico appartamento:', {
      apartmentData: apartmentData.apartmentName,
      datasets,
      selectedView: this.selectedView
    });
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        indexAxis: 'y', // Barre orizzontali
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: yAxisTitle
            }
          },
          y: {
            title: {
              display: true,
              text: 'Mesi'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: chartTitle
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
    
    console.log('Grafico appartamento creato:', this.chart);
  }
  
  onYearChange(year: number): void {
    this.selectedYear = year;
    this.loadDashboardData(true); // Forza il refresh quando cambia anno
  }
  
  onApartmentTabChange(apartmentId: number | null): void {
    this.selectedApartmentId = apartmentId;
    this.initializeChart();
  }
  
  openReadingForm(): void {
    const dialogRef = this.dialog.open(ReadingFormComponent, {
      width: '600px',
      data: {
        apartments: this.apartments,
        selectedApartmentId: this.selectedApartmentId
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Lettura salvata con successo', 'Chiudi', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        // Utilizza il metodo di refresh intelligente
        this.refreshDataAfterSave();
      }
    });
  }
  
  openReadingHistory(): void {
    const dialogRef = this.dialog.open(ReadingHistoryComponent, {
      panelClass: 'reading-history-modal',
      data: {
        apartments: this.apartments,
        selectedApartmentId: null
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Utilizza il metodo di refresh intelligente
        this.refreshDataAfterSave();
      }
    });
  }
  
  exportData(): void {
    // Implementazione per esportare i dati in CSV o Excel
    this.snackBar.open('Esportazione dati non ancora implementata', 'Chiudi', {
      duration: 3000
    });
  }
  
  printReport(): void {
    // Implementazione per stampare un report
    window.print();
  }
  
  handleTabChange(event: any): void {
      const index = event.index;
      if (index === 0) {
        this.onApartmentTabChange(null);
      } else if (index > 0 && index <= this.apartments.length) {
        const apartment = this.apartments[index - 1];
        if (apartment && apartment.id !== undefined) {
          this.onApartmentTabChange(apartment.id);
        } else {
          this.onApartmentTabChange(null);
        }
      }
    }

  // Metodi mancanti richiesti dal template
  getSelectedApartmentName(): string {
    if (this.selectedApartmentId === null) {
      return 'Tutti gli appartamenti';
    }
    if (!this.apartments || this.apartments.length === 0) {
      return 'Nessun appartamento';
    }
    const apartment = this.apartments.find(apt => apt.id === this.selectedApartmentId);
    return apartment?.name || 'Appartamento non trovato';
  }

  onApartmentChange(apartmentId: number | null): void {
    this.selectedApartmentId = apartmentId;
    setTimeout(() => {
      this.initializeChart();
    }, 50);
  }

  getElectricityCostForApartment(aptData: ApartmentUtilityData): number {
    if (!aptData || !aptData.monthlyData) {
      return 0;
    }
    return aptData.monthlyData.reduce((sum, month) => sum + (month.electricityCost || 0), 0);
  }

  getWaterCostForApartment(aptData: ApartmentUtilityData): number {
    if (!aptData || !aptData.monthlyData) {
      return 0;
    }
    return aptData.monthlyData.reduce((sum, month) => sum + (month.waterCost || 0), 0);
  }

  getGasCostForApartment(aptData: ApartmentUtilityData): number {
    if (!aptData || !aptData.monthlyData) {
      return 0;
    }
    return aptData.monthlyData.reduce((sum, month) => sum + (month.gasCost || 0), 0);
  }

  // ===== METODI PER LETTURE SPECIALI =====

  /**
   * Verifica se l'appartamento è l'appartamento 8
   */
  isApartment8(apartmentId: number): boolean {
    return apartmentId === 8;
  }

  /**
   * Ottiene il costo dell'elettricità della lavanderia per l'appartamento 8
   * TODO: Implementare quando il backend supporterà le letture speciali
   */
  getLaundryElectricityCostForApartment(aptData: ApartmentUtilityData): number {
    if (!aptData || !aptData.monthlyData || !this.isApartment8(aptData.apartmentId)) {
      return 0;
    }
    // Per ora restituisce 0, sarà implementato quando il backend supporterà le letture speciali
    return 0;
  }

  /**
   * Verifica se dovrebbe mostrare la sezione lavanderia per l'appartamento
   */
  shouldShowLaundrySection(apartmentId: number): boolean {
    return this.isApartment8(apartmentId);
  }

  getSelectedApartmentData(): ApartmentUtilityData | undefined {
    if (this.selectedApartmentId === null || this.apartmentUtilityData.length === 0) {
      return undefined;
    }
    return this.apartmentUtilityData.find(data => data.apartmentId === this.selectedApartmentId);
  }

  get sortedApartmentUtilityData(): ApartmentUtilityData[] {
    if (!this.apartmentUtilityData) return [];
    // Ordina alfabeticamente per nome appartamento
    return [...this.apartmentUtilityData].sort((a, b) => (a.apartmentName || '').localeCompare(b.apartmentName || ''));
  }

  onViewChange(view: 'consumption' | 'costs' | 'comparison'): void {
    this.selectedView = view;
    setTimeout(() => {
      this.initializeChart();
    }, 50);
  }

  calculateStatistics(): void {
    if (this.apartmentUtilityData.length === 0) {
      this.initializeUtilityStatistics();
      return;
    }
    
    const totalConsumption = this.apartmentUtilityData.reduce((totals, apt) => ({
      electricity: totals.electricity + apt.yearlyTotals.electricity,
      water: totals.water + apt.yearlyTotals.water,
      gas: totals.gas + apt.yearlyTotals.gas
    }), { electricity: 0, water: 0, gas: 0 });
    
    const totalCosts = this.apartmentUtilityData.reduce((costs, apt) => {
      const aptElectricityCost = apt.monthlyData.reduce((sum, month) => sum + month.electricityCost, 0);
      const aptWaterCost = apt.monthlyData.reduce((sum, month) => sum + month.waterCost, 0);
      const aptGasCost = apt.monthlyData.reduce((sum, month) => sum + month.gasCost, 0);
      
      return {
        electricity: costs.electricity + aptElectricityCost,
        water: costs.water + aptWaterCost,
        gas: costs.gas + aptGasCost,
        total: costs.total + apt.yearlyTotals.totalCost
      };
    }, { electricity: 0, water: 0, gas: 0, total: 0 });
    
    // Calcola le medie per appartamento
    const totalApartments = this.apartments.length;
    const averageConsumption = {
      electricity: totalApartments > 0 ? totalConsumption.electricity / totalApartments : 0,
      water: totalApartments > 0 ? totalConsumption.water / totalApartments : 0,
      gas: totalApartments > 0 ? totalConsumption.gas / totalApartments : 0
    };
    
    // Calcola il trend mensile
    const monthlyTrend = this.months.map((monthName, index) => {
      const monthData = this.apartmentUtilityData.reduce((monthTotals, apt) => {
        const monthInfo = apt.monthlyData.find(m => m.month === index + 1);
        if (monthInfo) {
          monthTotals.totalConsumption += monthInfo.electricity + monthInfo.water + monthInfo.gas;
          monthTotals.totalCost += monthInfo.totalCost;
        }
        return monthTotals;
      }, { totalConsumption: 0, totalCost: 0 });
      
      return {
        month: index + 1,
        monthName,
        totalConsumption: monthData.totalConsumption,
        totalCost: monthData.totalCost
      };
    });
    
    this.utilityStatistics = {
      totalApartments,
      totalConsumption,
      totalCosts,
      averageConsumption,
      monthlyTrend
    };

    // Calcola appartamenti senza letture
    this.calculateApartmentsWithoutReadings();
  }

  /**
   * Refresh intelligente dei dati dopo il salvataggio
   * Un solo refresh con delay ottimizzato per prestazioni migliori
   */
  private refreshDataAfterSave(): void {
    // Un singolo refresh con delay sufficiente per il backend
    setTimeout(() => {
      this.loadDashboardData(true);
    }, 800); // Delay ottimizzato: abbastanza per il backend, non troppo per l'utente
  }

  /**
   * Calcola gli appartamenti senza letture per il mese corrente
   */
  private calculateApartmentsWithoutReadings(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filtra gli appartamenti che non hanno letture per il mese corrente
    this.apartmentsWithoutReadings = this.apartments.filter(apartment => {
      const hasCurrentMonthReading = this.allApartmentsData.some(reading => {
        const readingDate = new Date(reading.year, reading.month - 1);
        return reading.apartmentId === apartment.id &&
               readingDate.getMonth() === currentMonth &&
               readingDate.getFullYear() === currentYear &&
               (reading.electricity > 0 || reading.water > 0 || reading.gas > 0);
      });
      return !hasCurrentMonthReading;
    });
    
    this.utilityAlerts = this.apartmentsWithoutReadings.length;
  }

  /**
   * Ottiene i nomi degli appartamenti senza letture
   */
  getApartmentsWithoutReadingsNames(maxCount?: number): string {
    const apartments = maxCount 
      ? this.apartmentsWithoutReadings.slice(0, maxCount)
      : this.apartmentsWithoutReadings;
    
    return apartments.map(apt => apt.name).join(', ');
  }

  /**
   * Crea il grafico di confronto mensile per tutti gli appartamenti
   */
  private createComparisonChart(): void {
    if (!this.comparisonChartCanvas || !this.comparisonChartCanvas.nativeElement) {
      console.warn('Canvas di confronto non disponibile');
      return;
    }

    const canvas = this.comparisonChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Context 2D non disponibile per il grafico di confronto');
      return;
    }

    // Verifica che il canvas abbia dimensioni valide
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      console.warn('Canvas di confronto non ha dimensioni valide, retry in 100ms');
      setTimeout(() => {
        this.createComparisonChart();
      }, 100);
      return;
    }

    // Calcola i costi totali mensili per tutti gli appartamenti
    const monthlyTotalCosts = this.months.map((monthName, index) => {
      const month = index + 1;
      const totalCost = this.apartmentUtilityData.reduce((sum, apt) => {
        const monthData = apt.monthlyData.find(m => m.month === month);
        return sum + (monthData?.totalCost || 0);
      }, 0);
      
      return {
        month,
        monthName,
        totalCost
      };
    });

    const labels = monthlyTotalCosts.map(item => item.monthName);
    const data = monthlyTotalCosts.map(item => item.totalCost);

    this.comparisonChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Costi Totali Mensili (€)',
          data: data,
          backgroundColor: 'rgba(156, 39, 176, 0.2)',
          borderColor: 'rgba(156, 39, 176, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(156, 39, 176, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Costo Totale (€)'
            },
            ticks: {
              callback: (value) => {
                return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Mesi'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Andamento Mensile Costi Totali - ${this.selectedYear}`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Costo Totale: €${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });

    console.log('Grafico di confronto creato:', this.comparisonChart);
  }
}