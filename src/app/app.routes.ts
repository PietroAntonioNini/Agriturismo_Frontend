import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';
import { DashboardComponent } from './core/components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { 
    path: 'tenant',
    loadChildren: () => import('./tenant/tenant.module').then(m => m.TenantModule)
  },
  {
    path: 'apartment',
    loadChildren: () => import('./apartment/apartment.module').then(m => m.ApartmentModule)
  },
  { path: '**', component: PageNotFoundComponent }
];
