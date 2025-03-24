import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./core/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'tenant',
    loadChildren: () => import('./pages/tenant/tenant.module').then(m => m.TenantModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'apartment',
    loadChildren: () => import('./pages/apartment/apartment.module').then(m => m.ApartmentModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'billing',
    loadChildren: () => import('./pages/billing/billing.module').then(m => m.BillingModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'utility',
    loadChildren: () => import('./pages/utility/utility.module').then(m => m.UtilityModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'lease',
    loadChildren: () => import('./pages/lease/lease.module').then(m => m.LeaseModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
