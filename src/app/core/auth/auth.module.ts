import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// I componenti sono definiti come standalone, 
// quindi non è necessario importarli e dichiararli
// in questo modulo

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('../../pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'change-password',
    loadComponent: () => import('../../pages/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('../../pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('../../pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AuthModule { }
