import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GenericApiService } from '../../shared/services/generic-api.service';
import { Tenant } from '../../shared/models';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.scss']
})
export class TenantDetailComponent implements OnInit {
  tenant: Tenant | null = null;
  activeLeases: any[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: GenericApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadTenantData(id);
    } else {
      this.errorMessage = 'ID inquilino non valido.';
      this.isLoading = false;
    }
  }

  loadTenantData(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.apiService.getById<Tenant>('tenants', id).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.loadTenantLeases(id);
      },
      error: (error) => {
        console.error('Errore durante il caricamento dell\'inquilino', error);
        this.errorMessage = 'Si è verificato un errore durante il caricamento dei dati dell\'inquilino.';
        this.isLoading = false;
      }
    });
  }

  loadTenantLeases(tenantId: number): void {
    this.apiService.getRelatedRecords<any>('tenants', tenantId, 'active-leases').subscribe({
      next: (leases) => {
        this.activeLeases = leases;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore durante il caricamento dei contratti', error);
        this.isLoading = false;
      }
    });
  }

  deleteTenant(): void {
    if (!this.tenant) return;

    if (confirm('Sei sicuro di voler eliminare questo inquilino? Questa azione non può essere annullata.')) {
      this.apiService.delete('tenants', this.tenant.id).subscribe({
        next: () => {
          this.snackBar.open('Inquilino eliminato con successo', 'Chiudi', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
          this.router.navigate(['/tenant/list']);
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
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/D';
    return new Date(date).toLocaleDateString('it-IT');
  }
}