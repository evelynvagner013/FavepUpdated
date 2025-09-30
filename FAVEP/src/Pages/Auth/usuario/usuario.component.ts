import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { MenuCentralComponent } from '../../menu-central/menu-central.component';
import { MenuLateralComponent } from '../../menu-lateral/menu-lateral.component';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgxMaskPipe,
    NgxMaskDirective,
    MenuCentralComponent,
    MenuLateralComponent
  ],
  providers: [DatePipe],
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css']
})
export class UsuarioComponent implements OnInit, OnDestroy {
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
      } else {
        this.usuario = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Converte a imagem selecionada para Base64 e atualiza a pré-visualização.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        this.usuarioEditavel.fotoperfil = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    }
  }

  salvarAlteracoesPerfil(): void {
    if (!this.usuario) {
        console.error('Usuário não está logado para atualização.');
        return;
    }

    const payload = {
      nome: this.usuarioEditavel.nome,
      email: this.usuarioEditavel.email,
      telefone: this.usuarioEditavel.telefone,
      fotoperfil: this.usuarioEditavel.fotoperfil
    };

    this.usuarioService.atualizarPerfilUsuario(payload).subscribe({
      next: (response: any) => {
        console.log('Perfil atualizado com sucesso:', response);
        this.authService.setUser(response.user);
        this.fecharModalEdicao();
        alert('Perfil atualizado com sucesso!');
      },
      error: (err: any) => {
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

  navegarParaContato(): void {
    this.router.navigate(['/contato']);
  }
}