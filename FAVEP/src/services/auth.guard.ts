import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; 

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    
    if (this.authService.isLoggedIn()) {
      return true;
    } else {
      
      this.router.navigate(['/home'], { queryParams: { openLogin: 'true', reason: 'unauthorized' } });
      return false;
    }
  }
}