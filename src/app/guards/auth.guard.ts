import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    try {
      // Vérifie si le token est valide et non expiré
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const isExpired = tokenData.exp * 1000 < Date.now();

      if (isExpired) {
        this.authService.logout();
        this.router.navigate(['/login']);
        return false;
      }

      // Vérifie si l'utilisateur est un admin
      const role = tokenData.role;
      if (role !== 'admin') {
        this.router.navigate(['/login']);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur de validation du token:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}