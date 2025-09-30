import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.css'
})
export class MenuLateralComponent {
  menuAberto = false;
  submenuAberto = false; 

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  alternarMenu() {
    this.menuAberto = !this.menuAberto;
  }
  
  toggleSubmenu(): void {
    this.submenuAberto = !this.submenuAberto;
  }

  isConfigActive(): boolean {
    const configRoutes = ['/usuario', '/plano-assinatura', '/adicionar-usuario'];
    return configRoutes.some(route => this.router.isActive(route, { paths: 'subset', queryParams: 'subset', fragment: 'ignored', matrixParams: 'ignored' }));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}