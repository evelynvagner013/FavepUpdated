import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

// Imports dos seus serviços e modelos
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgxMaskPipe, 
  ],
  providers: [DatePipe],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, OnDestroy {
  // Propriedades para o template
  menuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';

  // Propriedades para o estado do componente
  usuario: Usuario | null = null;
  usuarioEditavel: Partial<Usuario> = {};
  editModalAberto = false;

  // Variável para guardar a inscrição e limpá-la depois
  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuario = { ...user, senha: '' };
        this.atualizarHeaderInfo();
      } else {
        this.usuario = null;
        this.atualizarHeaderInfo();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private atualizarHeaderInfo(): void {
    if (this.usuario) {
      this.usuarioNome = this.usuario.nome;
      this.usuarioFoto = this.usuario.fotoPerfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
    } else {
      this.usuarioNome = '';
      this.usuarioFoto = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
    }
  }

  salvarAlteracoesPerfil(): void {
    if (!this.usuario) {
        console.error('Usuário não está logado para atualização.');
        return;
    }
  
    const { id, ...payload } = this.usuarioEditavel;
  
    // A variável 'response' aqui será do tipo 'any' para evitar o erro de tipagem
    this.usuarioService.atualizarPerfilUsuario(payload).subscribe({
      next: (response: any) => { // <-- Adicione ': any' aqui
        console.log('Perfil atualizado com sucesso:', response);
  
        // --- CORREÇÃO APLICADA AQUI ---
        // Voltamos a usar 'response.user' para pegar o objeto de usuário correto
        this.authService.setUser(response.user);
  
        this.fecharModalEdicao();
        alert('Perfil atualizado com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao salvar alterações no perfil:', err);
        const errorMessage = err.error?.error || 'Erro ao atualizar perfil. Tente novamente.';
        alert(errorMessage);
      }
    });
  }

  abrirModalEdicao(): void {
    if (this.usuario) {
      this.usuarioEditavel = { ...this.usuario };
      this.editModalAberto = true;
    }
  }

  fecharModalEdicao(): void {
    this.editModalAberto = false;
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  navegarParaContato(): void {
    this.router.navigate(['/contato']);
  }
}