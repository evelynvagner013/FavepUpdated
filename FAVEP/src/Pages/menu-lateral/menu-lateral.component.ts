import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [RouterModule], // Já que a navegação do menu usa RouterModule, ele deve ser importado aqui.
  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.css'
})
export class MenuLateralComponent {
  menuAberto = false;
  submenuAberto = false; 

  constructor(private router: Router) {}
  
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
}