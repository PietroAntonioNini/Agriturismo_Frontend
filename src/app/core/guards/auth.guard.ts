import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isLoggedIn()) {
      // Se non abbiamo ancora popolato currentUser da localStorage, prova a farlo rapidamente
      if (!this.authService.getCurrentUser()) {
        try {
          const userStr = localStorage.getItem('currentUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            (this.authService as any).setCurrentUser?.(user);
          }
        } catch {}
      }
      // Verifica ruolo se richiesto
      const requiredRole = route.data['role'];
      if (requiredRole && !this.authService.hasRole(requiredRole)) {
        // Reindirizza se non ha il ruolo richiesto
        this.router.navigate(['/unauthorized']);
        return false;
      }
      
      return true;
    }
    
    // Reindirizza alla pagina di login
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
} 