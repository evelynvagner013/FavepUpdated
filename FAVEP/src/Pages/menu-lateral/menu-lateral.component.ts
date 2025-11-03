import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';
import { Subscription } from 'rxjs';

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

  private userSubscription: Subscription | undefined;
    

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

  usuarioNome: string = '';
      usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      private usuarioLogado: Usuario | null = null;
  
      ngOnInit(): void {
        this.userSubscription = this.authService.currentUser.subscribe(user => {
          if (user) {
            this.usuarioLogado = user;
            this.usuarioNome = user.nome;
            this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
          }
        });
      }
}