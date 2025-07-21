import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

export interface ApiPerformance {
  url: string;
  method: string;
  duration: number;
  timestamp: number;
  status: number;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metrics = new Map<string, PerformanceMetric>();
  private apiMetrics: ApiPerformance[] = [];
  private performanceSubject = new BehaviorSubject<{
    metrics: PerformanceMetric[];
    apiMetrics: ApiPerformance[];
    averageApiResponseTime: number;
    slowestApis: ApiPerformance[];
  }>({
    metrics: [],
    apiMetrics: [],
    averageApiResponseTime: 0,
    slowestApis: []
  });

  constructor() {
    // Pulisci i dati vecchi ogni 10 minuti
    setInterval(() => this.cleanupOldData(), 10 * 60 * 1000);
  }

  /**
   * Inizia il monitoraggio di una metrica
   */
  startMetric(name: string, metadata?: any): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.set(id, {
      name,
      startTime: performance.now(),
      metadata
    });
    return id;
  }

  /**
   * Termina il monitoraggio di una metrica
   */
  endMetric(id: string): PerformanceMetric | null {
    const metric = this.metrics.get(id);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Aggiorna le statistiche
    this.updatePerformanceStats();

    return metric;
  }

  /**
   * Registra una metrica API
   */
  recordApiCall(url: string, method: string, duration: number, status: number, success: boolean): void {
    const apiMetric: ApiPerformance = {
      url,
      method,
      duration,
      timestamp: Date.now(),
      status,
      success
    };

    this.apiMetrics.push(apiMetric);

    // Mantieni solo le ultime 100 metriche API
    if (this.apiMetrics.length > 100) {
      this.apiMetrics = this.apiMetrics.slice(-100);
    }

    this.updatePerformanceStats();
  }

  /**
   * Ottiene le statistiche di performance
   */
  getPerformanceStats(): Observable<{
    metrics: PerformanceMetric[];
    apiMetrics: ApiPerformance[];
    averageApiResponseTime: number;
    slowestApis: ApiPerformance[];
  }> {
    return this.performanceSubject.asObservable();
  }

  /**
   * Ottiene le API più lente
   */
  getSlowestApis(limit: number = 5): ApiPerformance[] {
    return this.apiMetrics
      .filter(api => api.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Ottiene il tempo medio di risposta delle API
   */
  getAverageApiResponseTime(): number {
    const successfulApis = this.apiMetrics.filter(api => api.success);
    if (successfulApis.length === 0) return 0;

    const totalDuration = successfulApis.reduce((sum, api) => sum + api.duration, 0);
    return totalDuration / successfulApis.length;
  }

  /**
   * Ottiene le metriche per un nome specifico
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(metric => metric.name === name);
  }

  /**
   * Pulisce i dati vecchi
   */
  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Pulisci metriche API vecchie
    this.apiMetrics = this.apiMetrics.filter(api => api.timestamp > oneHourAgo);
    
    // Pulisci metriche generali vecchie
    for (const [id, metric] of this.metrics.entries()) {
      if (metric.endTime && metric.endTime < oneHourAgo) {
        this.metrics.delete(id);
      }
    }

    this.updatePerformanceStats();
  }

  /**
   * Aggiorna le statistiche di performance
   */
  private updatePerformanceStats(): void {
    const averageApiResponseTime = this.getAverageApiResponseTime();
    const slowestApis = this.getSlowestApis(5);

    this.performanceSubject.next({
      metrics: Array.from(this.metrics.values()),
      apiMetrics: [...this.apiMetrics],
      averageApiResponseTime,
      slowestApis
    });
  }

  /**
   * Esporta i dati di performance per debug
   */
  exportPerformanceData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Array.from(this.metrics.values()),
      apiMetrics: this.apiMetrics,
      averageApiResponseTime: this.getAverageApiResponseTime(),
      slowestApis: this.getSlowestApis(10)
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Pulisce tutti i dati di performance
   */
  clearAllData(): void {
    this.metrics.clear();
    this.apiMetrics = [];
    this.updatePerformanceStats();
  }
} 