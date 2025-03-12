import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isLoggedIn() && this.authService.hasRole('admin')) {
      return true;
    }
    
    if (this.authService.isLoggedIn()) {
      // L'utente è autenticato ma non ha i permessi di amministratore
      this.snackBar.open('Non hai i permessi necessari per accedere a questa sezione', 'Chiudi', {
        duration: 5000
      });
      this.router.navigate(['/dashboard']);
    } else {
      // L'utente non è autenticato
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
    }
    
    return false;
  }
} 