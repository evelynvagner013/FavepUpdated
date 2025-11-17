import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
// Adicionado FormBuilder, FormGroup, ReactiveFormsModule
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'; 
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
    ReactiveFormsModule, // Adicionado
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

  // Variáveis de feedback
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // ADICIONADO: Propriedades para o modal de alterar senha
  senhaModalAberto = false;
  senhaForm: FormGroup;
  senhaIsLoading = false;
  senhaSuccessMessage: string | null = null;
  senhaErrorMessage: string | null = null;
  senhaAtualVisible = false;
  novaSenhaVisible = false;
  confirmarSenhaVisible = false;

  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private fb: FormBuilder // Adicionado FormBuilder
  ) {
    // Inicializa o formulário reativo para a senha
    this.senhaForm = this.fb.group({
      senhaAtual: ['', [Validators.required]],
      novaSenha: ['', [Validators.required, Validators.minLength(8)]], // Você pode adicionar mais validadores aqui
      confirmarSenha: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator // Validador customizado
    });
  }

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

  // Validador customizado para garantir que as senhas coincidem
  passwordMatchValidator(form: FormGroup) {
    const novaSenha = form.get('novaSenha')?.value;
    const confirmarSenha = form.get('confirmarSenha')?.value;
    return novaSenha === confirmarSenha ? null : { mismatch: true };
  }

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

  /**
   * MODIFICADO: Salva as alterações com feedback visual (sem alerts).
   */
  salvarAlteracoesPerfil(): void {
    if (!this.usuario) {
        console.error('Usuário não está logado para atualização.');
        return;
    }
    
    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const payload = {
      nome: this.usuarioEditavel.nome,
      email: this.usuarioEditavel.email,
      telefone: this.usuarioEditavel.telefone,
      fotoperfil: this.usuarioEditavel.fotoperfil
    };

    this.usuarioService.atualizarPerfilUsuario(payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.authService.setUser(response.user);
        this.successMessage = 'Perfil atualizado com sucesso!';

        // Fecha o modal após 3 segundos
        setTimeout(() => {
          this.fecharModalEdicao();
        }, 3000);
      },
      error: (err: any) => {
        this.isLoading = false;
        const errorMessage = err.error?.error || 'Erro ao atualizar perfil. Tente novamente.';
        this.errorMessage = errorMessage;
        
        // Limpa a mensagem de erro após 10 segundos
        setTimeout(() => {
          this.errorMessage = null;
        }, 10000);
      }
    });
  }

  abrirModalEdicao(): void {
    if (this.usuario) {
      this.usuarioEditavel = { ...this.usuario };
      this.editModalAberto = true;
    }
  }

  /**
   * MODIFICADO: Limpa as mensagens ao fechar o modal.
   */
  fecharModalEdicao(): void {
    this.editModalAberto = false;
    this.successMessage = null;
    this.errorMessage = null;
    this.isLoading = false;
  }

  // ### ADICIONADO: Funções para o modal de senha ###

  abrirModalSenha(): void {
    this.senhaModalAberto = true;
    this.senhaForm.reset();
    this.senhaSuccessMessage = null;
    this.senhaErrorMessage = null;
  }

  fecharModalSenha(): void {
    this.senhaModalAberto = false;
    this.senhaIsLoading = false;
  }

  salvarNovaSenha(): void {
    if (this.senhaForm.invalid) {
      this.senhaErrorMessage = 'Por favor, preencha todos os campos corretamente.';
      setTimeout(() => { this.senhaErrorMessage = null; }, 10000);
      return;
    }

    this.senhaIsLoading = true;
    this.senhaSuccessMessage = null;
    this.senhaErrorMessage = null;

    const payload = {
      senhaAtual: this.senhaForm.value.senhaAtual,
      novaSenha: this.senhaForm.value.novaSenha,
      confirmarSenha: this.senhaForm.value.confirmarSenha
    };

    this.authService.changePassword(payload).subscribe({
      next: (response) => {
        this.senhaIsLoading = false;
        this.senhaSuccessMessage = response.message || 'Senha alterada com sucesso!';
        this.senhaForm.reset();
        
        setTimeout(() => {
          this.fecharModalSenha();
        }, 3000);
      },
      error: (err) => {
        this.senhaIsLoading = false;
        this.senhaErrorMessage = err.error?.error || 'Erro ao alterar a senha.';
        
        setTimeout(() => {
          this.senhaErrorMessage = null;
        }, 10000);
      }
    });
  }

  // Toggles de visibilidade para os campos de senha
  toggleVisibility(field: 'senhaAtual' | 'novaSenha' | 'confirmarSenha') {
    if (field === 'senhaAtual') this.senhaAtualVisible = !this.senhaAtualVisible;
    if (field === 'novaSenha') this.novaSenhaVisible = !this.novaSenhaVisible;
    if (field === 'confirmarSenha') this.confirmarSenhaVisible = !this.confirmarSenhaVisible;
  }

  navegarParaContato(): void {
    this.router.navigate(['/contato']);
  }
}