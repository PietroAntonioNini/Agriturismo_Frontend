import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { 
    path: 'tenant',
    loadChildren: () => import('./tenant/tenant.module').then(m => m.TenantModule)
  },
  { path: '**', component: PageNotFoundComponent }
];
