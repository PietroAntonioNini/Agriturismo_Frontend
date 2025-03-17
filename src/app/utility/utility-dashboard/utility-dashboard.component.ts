import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

import { Apartment, MonthlyUtilityData, ApartmentUtilityData } from '../../shared/models';
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
import { GenericApiService } from '../../shared/services/generic-api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-utility-dashboard',
  templateUrl: './utility-dashboard.component.html',
  styleUrls: ['./utility-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ]
})
export class UtilityDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  apartments: Apartment[] = [];
  selectedApartmentId: number | null = null;
  selectedYear: number = new Date().getFullYear();
  isLoading = true;
  errorMessage: string | null = null;
  chart: Chart | null = null;
  
  // Dati per i grafici
  allApartmentsData: MonthlyUtilityData[] = [];
  apartmentSpecificData: ApartmentUtilityData[] = [];
  
  // Mesi dell'anno
  months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  // Colori per i grafici
  chartColors = {
    electricity: 'rgba(255, 99, 132, 0.7)',
    water: 'rgba(54, 162, 235, 0.7)',
    gas: 'rgba(255, 206, 86, 0.7)'
  };

  constructor(
    private apiService: GenericApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadData();
  }
  
  ngAfterViewInit(): void {
    // Il grafico verrà inizializzato dopo il caricamento dei dati
  }
  
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    // Carica gli appartamenti e i dati delle utenze
    forkJoin({
      apartments: this.apiService.getAll<Apartment>('apartments'),
      utilityData: this.apiService.getUtilityDataByYear<MonthlyUtilityData>(this.selectedYear)
    }).subscribe({
      next: (result) => {
        this.apartments = result.apartments;
        this.processUtilityData(result.utilityData);
        this.isLoading = false;
        this.initializeChart();
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
    this.allApartmentsData = data;
    
    // Organizza i dati per appartamento
    this.apartmentSpecificData = this.apartments.map(apartment => {
      const apartmentData = data.filter(item => item.apartmentId === apartment.id);
      
      return {
        apartmentId: apartment.id!,
        apartmentName: apartment.name,
        monthlyData: this.months.map((_, index) => {
          const monthData = apartmentData.find(item => item.month === index + 1) || {
            month: index + 1,
            electricity: 0,
            water: 0,
            gas: 0
          };
          
          return {
            month: index + 1,
            electricity: monthData.electricity || 0,
            water: monthData.water || 0,
            gas: monthData.gas || 0
          };
        })
      };
    });
  }
  
  initializeChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.selectedApartmentId === null) {
      // Visualizza il grafico per tutti gli appartamenti
      this.createAllApartmentsChart(ctx);
    } else {
      // Visualizza il grafico per un appartamento specifico
      this.createSingleApartmentChart(ctx);
    }
  }
  
  createAllApartmentsChart(ctx: CanvasRenderingContext2D): void {
    const labels = this.apartments.map(apt => apt.name);
    
    // Calcola i consumi totali per ogni appartamento
    const electricityData = this.apartments.map(apt => {
      const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
      return aptData ? aptData.monthlyData.reduce((sum, month) => sum + month.electricity, 0) : 0;
    });
    
    const waterData = this.apartments.map(apt => {
      const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
      return aptData ? aptData.monthlyData.reduce((sum, month) => sum + month.water, 0) : 0;
    });
    
    const gasData = this.apartments.map(apt => {
      const aptData = this.apartmentSpecificData.find(data => data.apartmentId === apt.id);
      return aptData ? aptData.monthlyData.reduce((sum, month) => sum + month.gas, 0) : 0;
    });
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Elettricità',
            data: electricityData,
            backgroundColor: this.chartColors.electricity,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'Acqua',
            data: waterData,
            backgroundColor: this.chartColors.water,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Gas',
            data: gasData,
            backgroundColor: this.chartColors.gas,
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Consumo Totale'
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
            text: `Consumi Utenze per Appartamento - ${this.selectedYear}`
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
    
    if (!apartmentData) return;
    
    const labels = this.months;
    const electricityData = apartmentData.monthlyData.map(month => month.electricity);
    const waterData = apartmentData.monthlyData.map(month => month.water);
    const gasData = apartmentData.monthlyData.map(month => month.gas);
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Elettricità',
            data: electricityData,
            backgroundColor: this.chartColors.electricity,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'Acqua',
            data: waterData,
            backgroundColor: this.chartColors.water,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Gas',
            data: gasData,
            backgroundColor: this.chartColors.gas,
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
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
              text: 'Consumo'
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
            text: `Consumi Mensili - ${apartmentData.apartmentName} (${this.selectedYear})`
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  }
  
  onYearChange(year: number): void {
    this.selectedYear = year;
    this.loadData();
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
        this.loadData(); // Ricarica i dati per aggiornare il grafico
      }
    });
  }
  
  openReadingHistory(): void {
    const dialogRef = this.dialog.open(ReadingHistoryComponent, {
      width: '900px',
      data: {
        apartments: this.apartments,
        selectedApartmentId: this.selectedApartmentId
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData(); // Ricarica i dati se sono state apportate modifiche
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
}