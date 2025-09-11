import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-menu-cima',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgxMaskDirective, NgxMaskPipe],
  providers: [DatePipe],
  templateUrl: './menu-cima.component.html',
  styleUrls: ['./menu-cima.component.css']
})
export class MenuCimaComponent implements OnInit, OnDestroy {
  // Propriedades para controle dos modais
  mostrarLoginModal = false;
  mostrarRegisterModal = false;
  mostrarForgotPasswordModal = false;
  mostrarPerfilModal = false;

  // Propriedades para o formulário de Login
  loginEmail: string = '';
  loginPassword: string = '';
  loginRememberMe: boolean = false;
  loginErrorMessage: string = '';
  loginPasswordVisible: boolean = false;

  // Removido 'password' e 'confirmarSenha' do objeto inicial
  registerUser: any = { username: '', email: '', telefone: '' };
  registerSuccessMessage: string = '';
  registerErrorMessage: string = '';

  // Propriedades para o formulário de Esqueci a Senha
  forgotPasswordEmail: string = '';
  forgotPasswordSuccessMessage: string = '';
  forgotPasswordErrorMessage: string = '';

  // Propriedade para o usuário logado
  currentUserValue: Usuario | null = null;
  private userSubscription!: Subscription;

  // Propriedade para controlar o dropdown
  mostrarDropdown = false;

  // Propriedades para o modal de perfil
  usuarioEditavel: Partial<Usuario> = {};

  constructor(
    public apiService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router,
    private eRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) { }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      if (this.mostrarDropdown) {
        this.mostrarDropdown = false;
        this.cdr.detectChanges();
      }
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.mostrarDropdown = !this.mostrarDropdown;
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.userSubscription = this.apiService.currentUser.subscribe(user => {
      this.currentUserValue = user;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/home']);
  }

  // --- Métodos para Controle dos Modais ---

  abrirLoginModal() {
    this.fecharModals();
    this.mostrarLoginModal = true;
    this.loginEmail = '';
    this.loginPassword = '';
    this.loginErrorMessage = '';
    this.loginRememberMe = false;
  }

  toggleLoginPasswordVisibility(): void {
    this.loginPasswordVisible = !this.loginPasswordVisible;
    this.cdr.detectChanges();
  }

  abrirRegisterModal() {
    this.fecharModals();
    this.mostrarRegisterModal = true;
    this.registerUser = { username: '', email: '', telefone: '' };
    this.registerSuccessMessage = '';
    this.registerErrorMessage = '';
  }

  abrirForgotPasswordModal() {
    this.fecharModals();
    this.mostrarForgotPasswordModal = true;
    this.forgotPasswordEmail = '';
    this.forgotPasswordSuccessMessage = '';
    this.forgotPasswordErrorMessage = '';
  }

  fecharModals() {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = false;
    this.mostrarForgotPasswordModal = false;
    this.mostrarPerfilModal = false;
  }

  // --- Métodos de Submissão dos Formulários ---

  onLoginSubmit() {
    if (!this.loginEmail || !this.loginPassword) {
      this.loginErrorMessage = "Email e senha são obrigatórios.";
      return;
    }

    this.apiService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.fecharModals();
        this.router.navigate(['/gerenciamento']);
      },
      error: (error) => {
        console.error('Erro no login', error);
        this.loginErrorMessage = error.error?.error || 'Email ou senha inválidos';
      }
    });
  }

  onRegisterSubmit() {
    if (!this.registerUser.username || !this.registerUser.email || !this.registerUser.telefone) {
      this.registerErrorMessage = 'Nome, e-mail e telefone são obrigatórios.';
      return;
    }

    this.registerErrorMessage = '';

    const payload = {
      nome: this.registerUser.username,
      email: this.registerUser.email,
      telefone: this.registerUser.telefone
    };

    this.apiService.register(payload).subscribe({
      next: (response) => {
        this.registerSuccessMessage = response.message || 'Cadastro realizado! Verifique seu e-mail para continuar.';
        setTimeout(() => {
            this.fecharModals();
        }, 3000);
      },
      error: (error) => {
        console.error('Erro no cadastro', error);
        this.registerErrorMessage = error.error?.error || 'Erro ao cadastrar. Verifique os dados.';
      }
    });
  }

  onForgotPasswordSubmit() {
    if (!this.forgotPasswordEmail) {
      this.forgotPasswordErrorMessage = "O campo de e-mail é obrigatório.";
      return;
    }
    this.forgotPasswordErrorMessage = '';
    this.forgotPasswordSuccessMessage = '';

    this.apiService.forgotPassword(this.forgotPasswordEmail).subscribe({
      next: (response: any) => {
        this.forgotPasswordSuccessMessage = 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.';
      },
      error: (error: any) => {
        console.error('Erro ao enviar link de recuperação', error);
        this.forgotPasswordSuccessMessage = 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.';
      }
    });
  }

  // --- Métodos para o Modal de Perfil ---
  abrirModalPerfil(): void {
    if (this.currentUserValue) {
      this.usuarioEditavel = { ...this.currentUserValue };
      this.mostrarPerfilModal = true;
    }
  }

  fecharModalPerfil(): void {
    this.mostrarPerfilModal = false;
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

  salvarAlteracoesPerfil(): void {
    if (!this.currentUserValue) {
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
        this.apiService.setUser(response.user);
        this.fecharModalPerfil();
        alert('Perfil atualizado com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao salvar alterações no perfil:', err);
        const errorMessage = err.error?.error || 'Erro ao atualizar perfil. Tente novamente.';
        alert(errorMessage);
      }
    });
  }
}