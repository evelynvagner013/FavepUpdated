import { Component, HostListener, OnInit, OnDestroy } from '@angular/core'; // Adicionado OnDestroy
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router'; // Adicionado RouterLink
import { Usuario } from '../../models/api.models';
import { Subscription } from 'rxjs'; // Adicionado Subscription
import { CommonModule } from '@angular/common'; // Adicionado CommonModule
import { FormsModule } from '@angular/forms'; // Adicionado FormsModule

@Component({
  selector: 'app-adicionar-usuario',
  standalone: true,
  // Adicionado CommonModule, RouterLink e FormsModule para as diretivas do template
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './adicionar-usuario.component.html',
  styleUrls: ['./adicionar-usuario.component.css']
})
export class AdicionarUsuarioComponent implements OnInit, OnDestroy {
  // --- Propriedades do menu e header ---
  menuAberto = false;
  mostrarDropdown = false;
  submenuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
  
  private userSubscription: Subscription | undefined; // Variável para a inscrição

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
    // Cancela a inscrição ao destruir o componente
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
    this.router.navigate(['/home']);
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
  }
}