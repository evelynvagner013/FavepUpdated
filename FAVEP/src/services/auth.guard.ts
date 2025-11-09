import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, TipoPlano } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {


  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/home'], { queryParams: { openLogin: 'true', reason: 'unauthorized' } });
      return false;
    }

    const planoRequerido = next.data['planoRequerido'] as TipoPlano | undefined;

    if (!planoRequerido) {
      return true;
    }

    if (this.authService.temPlanoSuficiente(planoRequerido)) {
      return true;
    }

    this.router.navigate(['/assinatura'], { queryParams: { reason: 'plano-insuficiente' } });
    return false;

  }
}
