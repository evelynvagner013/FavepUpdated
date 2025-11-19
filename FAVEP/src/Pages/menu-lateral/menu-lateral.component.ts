import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // Adicionado para garantir funcionamento do *ngIf
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu-lateral',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './menu-lateral.component.html',
  styleUrl: './menu-lateral.component.css'
})
export class MenuLateralComponent implements OnInit, OnDestroy {
  menuAberto = false;
  submenuAberto = false; 

  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
  // Alterado de private para public ou acessível via getters
  public usuarioLogado: Usuario | null = null;
  
  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioLogado = user;
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      } else {
        this.usuarioLogado = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
  
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

  get isAdmin(): boolean {
    return this.usuarioLogado?.cargo === 'ADMINISTRADOR';
  }

  // Verifica se possui Plano Gold
  get isGold(): boolean {
    return this.authService.getPlanoAtivo() === 'gold';
  }

  get podeAdicionarMembros(): boolean {
    return this.isAdmin && this.isGold;
  }

  get podeGerenciarPagamentos(): boolean {
    return this.isAdmin;
  }
}