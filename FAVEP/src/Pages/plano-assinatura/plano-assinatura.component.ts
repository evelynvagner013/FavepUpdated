import { Component, HostListener, OnInit, OnDestroy } from '@angular/core'; // Adicionado OnDestroy
import { Router, RouterLink } from '@angular/router'; // Adicionado RouterLink
import { CommonModule } from '@angular/common'; // Adicionado CommonModule
import { Subscription } from 'rxjs'; // Adicionado Subscription
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';

@Component({
  selector: 'app-plano-assinatura',
  standalone: true,
  // Adicionado CommonModule e RouterLink para diretivas como *ngIf e routerLink
  imports: [CommonModule, RouterLink], 
  templateUrl: './plano-assinatura.component.html',
  styleUrls: ['./plano-assinatura.component.css']
})
export class PlanoAssinaturaComponent implements OnInit, OnDestroy {

  menuAberto = false;
  mostrarDropdown = false;
  submenuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
  
  private userSubscription: Subscription | undefined; // Variável para guardar a inscrição

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Guarda a inscrição para poder cancelá-la depois
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });
  }

  ngOnDestroy(): void {
    // Cancela a inscrição ao destruir o componente para evitar vazamento de memória
    this.userSubscription?.unsubscribe();
  }

  // --- Métodos do menu e header ---
  alternarMenu(): void { 
    this.menuAberto = !this.menuAberto; 
  }

  toggleSubmenu(): void { 
    this.submenuAberto = !this.submenuAberto; 
  }

  // Lógica de menu ativo melhorada
  isConfigActive(): boolean { 
    const configRoutes = ['/usuario', '/plano-assinatura', '/adicionar-usuario'];
    return configRoutes.some(route => this.router.isActive(route, false));
  }

  // --- MÉTODOS DO DROPDOWN ATUALIZADOS ---
  abrirModalPerfil(event: MouseEvent): void { 
    event.stopPropagation();
    this.mostrarDropdown = false;
    this.router.navigate(['/usuario']); 
  }

  logout(event: MouseEvent): void { 
    event.stopPropagation();
    this.mostrarDropdown = false;
    this.authService.logout(); 
  }
  // -----------------------------------------

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent): void {
    const alvo = event.target as HTMLElement;
    if (this.menuAberto && !alvo.closest('.menu-toggle') && !alvo.closest('.main-menu')) { 
      this.menuAberto = false; 
    }
    if (this.mostrarDropdown && !alvo.closest('.user-info')) { 
      this.mostrarDropdown = false; 
    }
    // A lógica do submenu já é tratada pelo toggle, esta linha pode ser removida para evitar conflitos
    // if (this.submenuAberto && !alvo.closest('.menu-item-dropdown')) { this.submenuAberto = false; }
  }
}