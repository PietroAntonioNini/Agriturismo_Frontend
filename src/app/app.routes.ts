import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'tenant',
    loadChildren: () => import('./tenant/tenant.module').then(m => m.TenantModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'apartment',
    loadChildren: () => import('./apartment/apartment.module').then(m => m.ApartmentModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'billing',
    loadChildren: () => import('./billing/billing.module').then(m => m.BillingModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'utility',
    loadChildren: () => import('./utility/utility.module').then(m => m.UtilityModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
