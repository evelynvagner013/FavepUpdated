import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';

@Component({
  selector: 'app-plano-assinatura',
  standalone: true,
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
  
  // Nova propriedade para armazenar o plano atual do usuário
  planoAtual: any;
  
  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });

    // Simulação do carregamento do plano atual
    this.loadCurrentPlan();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  // --- Métodos do menu e header ---
  alternarMenu(): void { 
    this.menuAberto = !this.menuAberto; 
  }

  toggleSubmenu(): void { 
    this.submenuAberto = !this.submenuAberto; 
  }

  isConfigActive(): boolean { 
    const configRoutes = ['/usuario', '/plano-assinatura', '/adicionar-usuario'];
    return configRoutes.some(route => this.router.isActive(route, false));
  }

  abrirModalPerfil(event: MouseEvent): void { 
    event.stopPropagation();
    this.mostrarDropdown = false;
    this.router.navigate(['/usuario']); 
  }

  logout(event: MouseEvent): void { 
    event.stopPropagation();
    this.mostrarDropdown = false;
    this.authService.logout(); 
    this.router.navigate(['/home']); // Adicionado redirecionamento após o logout
  }

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

  // --- Novos métodos para a lógica do plano ---
  loadCurrentPlan(): void {
    // Simulação de uma chamada de API para obter o plano atual
    setTimeout(() => {
      this.planoAtual = {
        nome: 'Plano Básico',
        preco: 'R$ 49,90/mês',
        descricao: 'Acesso a recursos de gerenciamento e relatórios básicos.'
      };
    }, 1000); // Simula um atraso de 1 segundo para o carregamento
  }

  trocarDePlano(): void {
    // Lógica para iniciar o processo de troca de plano.
    // Pode ser um redirecionamento para outra página ou abertura de um modal.
    console.log('Iniciando processo de troca de plano...');
    alert('Processo de troca de plano iniciado!');
  }
}