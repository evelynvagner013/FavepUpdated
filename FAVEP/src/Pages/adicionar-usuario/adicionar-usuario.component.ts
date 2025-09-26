import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms'; // Adicionado NgForm e FormsModule
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { Usuario } from '../../models/api.models';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adicionar-usuario',
  standalone: true,
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
  
  private userSubscription: Subscription | undefined;

  // --- Propriedades do formulário de usuário ---
  newUser = {
    email: '',
    password: '',
    accessLevel: ''
  };
  statusMessage: string = '';

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
    this.router.navigate(['/home']);
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

  // --- Novo método para adicionar usuário ---
  addUser(form: NgForm): void {
    if (form.valid) {
      // Simulação de chamada de serviço para criar o usuário
      // Na vida real, você chamaria um serviço como: this.authService.createUser(this.newUser).subscribe(...)
      console.log('Dados do novo usuário:', this.newUser);

      this.statusMessage = 'Usuário adicionado com sucesso!';
      form.resetForm(); // Limpa o formulário após o sucesso
    } else {
      this.statusMessage = 'Erro: Por favor, preencha todos os campos corretamente.';
    }
  }
}