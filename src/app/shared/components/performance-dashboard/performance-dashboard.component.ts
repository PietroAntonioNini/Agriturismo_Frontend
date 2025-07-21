import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { PerformanceMonitorService, ApiPerformance } from '../../services/performance-monitor.service';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="performance-dashboard">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>speed</mat-icon>
            Dashboard Performance
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Statistiche generali -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ averageResponseTime | number:'1.0-0' }}ms</div>
              <div class="stat-label">Tempo medio risposta API</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">{{ totalApiCalls }}</div>
              <div class="stat-label">Chiamate API totali</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">{{ successRate | number:'1.0-1' }}%</div>
              <div class="stat-label">Tasso di successo</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">{{ slowestApi?.duration | number:'1.0-0' }}ms</div>
              <div class="stat-label">API più lenta</div>
            </div>
          </div>

          <!-- API più lente -->
          <div class="section">
            <h3>API più lente</h3>
            <table mat-table [dataSource]="slowestApis" class="api-table">
              <ng-container matColumnDef="method">
                <th mat-header-cell *matHeaderCellDef>Metodo</th>
                <td mat-cell *matCellDef="let api">
                  <span class="method-badge" [class]="'method-' + api.method.toLowerCase()">
                    {{ api.method }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="url">
                <th mat-header-cell *matHeaderCellDef>URL</th>
                <td mat-cell *matCellDef="let api">
                  <span class="url-text" [matTooltip]="api.url">{{ getShortUrl(api.url) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Tempo</th>
                <td mat-cell *matCellDef="let api">
                  <div class="duration-container">
                    <span class="duration-value">{{ api.duration | number:'1.0-0' }}ms</span>
                    <mat-progress-bar 
                      [value]="getDurationPercentage(api.duration)" 
                      [color]="getDurationColor(api.duration)">
                    </mat-progress-bar>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let api">
                  <span class="status-badge" [class]="'status-' + getStatusClass(api.status)">
                    {{ api.status }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <!-- Azioni -->
          <div class="actions">
            <button mat-raised-button color="primary" (click)="exportData()">
              <mat-icon>download</mat-icon>
              Esporta Dati
            </button>
            
            <button mat-raised-button color="warn" (click)="clearData()">
              <mat-icon>clear</mat-icon>
              Pulisci Dati
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .performance-dashboard {
      padding: 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #1976d2;
    }

    .stat-label {
      color: #666;
      margin-top: 5px;
    }

    .section {
      margin-bottom: 30px;
    }

    .section h3 {
      margin-bottom: 15px;
      color: #333;
    }

    .api-table {
      width: 100%;
    }

    .method-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .method-get { background: #e3f2fd; color: #1976d2; }
    .method-post { background: #e8f5e8; color: #388e3c; }
    .method-put { background: #fff3e0; color: #f57c00; }
    .method-delete { background: #ffebee; color: #d32f2f; }

    .url-text {
      font-family: monospace;
      font-size: 12px;
      max-width: 200px;
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .duration-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .duration-value {
      min-width: 60px;
      font-weight: bold;
    }

    .status-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
    }

    .status-success { background: #e8f5e8; color: #388e3c; }
    .status-error { background: #ffebee; color: #d32f2f; }
    .status-warning { background: #fff3e0; color: #f57c00; }

    .actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    mat-progress-bar {
      flex: 1;
      max-width: 100px;
    }
  `]
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  averageResponseTime = 0;
  totalApiCalls = 0;
  successRate = 0;
  slowestApi: ApiPerformance | null = null;
  slowestApis: ApiPerformance[] = [];
  
  displayedColumns = ['method', 'url', 'duration', 'status'];
  
  private subscription: Subscription = new Subscription();

  constructor(private performanceMonitor: PerformanceMonitorService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.performanceMonitor.getPerformanceStats().subscribe(stats => {
        this.averageResponseTime = stats.averageApiResponseTime;
        this.totalApiCalls = stats.apiMetrics.length;
        this.slowestApis = stats.slowestApis;
        this.slowestApi = stats.slowestApis[0] || null;
        
        // Calcola il tasso di successo
        const successfulCalls = stats.apiMetrics.filter(api => api.success).length;
        this.successRate = this.totalApiCalls > 0 ? (successfulCalls / this.totalApiCalls) * 100 : 0;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getShortUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  }

  getDurationPercentage(duration: number): number {
    const maxDuration = Math.max(...this.slowestApis.map(api => api.duration));
    return maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
  }

  getDurationColor(duration: number): string {
    if (duration < 500) return 'primary';
    if (duration < 1000) return 'accent';
    return 'warn';
  }

  getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    return 'error';
  }

  exportData(): void {
    const data = this.performanceMonitor.exportPerformanceData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  clearData(): void {
    if (confirm('Sei sicuro di voler cancellare tutti i dati di performance?')) {
      this.performanceMonitor.clearAllData();
    }
  }
} 