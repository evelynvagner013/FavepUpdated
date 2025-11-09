// Conteúdo completo do arquivo: src/Pages/navbar/menu-cima/menu-cima.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-menu-cima',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    NgxMaskDirective,
    NgxMaskPipe
  ],
  templateUrl: './menu-cima.component.html',
  styleUrls: ['./menu-cima.component.css']
})
export class MenuCimaComponent implements OnInit, OnDestroy {

  currentUserValue: Usuario | null = null;
  private authSubscription: Subscription = new Subscription();
  mostrarDropdown = false;

  mostrarLoginModal = false;
  mostrarRegisterModal = false;
  mostrarForgotPasswordModal = false;
  mostrarPerfilModal = false;

  mostrarVerifyEmailModal = false;

  usuarioEditavel: Partial<Usuario> = {};

  loginEmail = '';
  loginPassword = '';
  loginPasswordVisible = false;
  loginErrorMessage: string | null = null;

  registerUser = { nome: '', email: '', telefone: '', senha: '', confirmarSenha: '' };
  registerSuccessMessage: string | null = null;
  registerErrorMessage: string | null = null;

  verificationCode = '';
  emailParaVerificar = '';
  verifySuccessMessage: string | null = null;
  verifyErrorMessage: string | null = null;

  forgotPasswordEmail = '';
  forgotPasswordSuccessMessage: string | null = null;
  forgotPasswordErrorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {
    // --- ESTA É A CORREÇÃO ---
    // O AuthService, ao ser construído, lê o localStorage e define
    // o valor inicial do seu BehaviorSubject.
    // Aqui, pegamos esse valor inicial de forma síncrona.
    // Isso garante que o currentUserValue NUNCA seja nulo se o
    // usuário já estiver logado (ex: deu F5 na página).
    this.currentUserValue = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    // Esta subscrição agora serve para "ouvir" MUDANÇAS futuras
    // (como um login, logout, ou a atualização do plano)
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUserValue = user;
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // --- Funções de Controle de Modal (MODIFICADAS) ---

  abrirLoginModal(): void {
    this.fecharModals();
    this.loginErrorMessage = null;
    this.loginEmail = '';
    this.loginPassword = '';
    this.mostrarLoginModal = true;
  }

  abrirRegisterModal(): void {
    this.fecharModals();
    this.registerErrorMessage = null;
    this.registerSuccessMessage = null;
    this.registerUser = { nome: '', email: '', telefone: '', senha: '', confirmarSenha: '' };
    this.mostrarRegisterModal = true;
  }

  abrirForgotPasswordModal(): void {
    this.fecharModals();
    this.forgotPasswordErrorMessage = null;
    this.forgotPasswordSuccessMessage = null;
    this.forgotPasswordEmail = '';
    this.mostrarForgotPasswordModal = true;
  }

  fecharModals(): void {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = false;
    this.mostrarForgotPasswordModal = false;
    this.mostrarVerifyEmailModal = false;
  }

  // --- Lógica de Autenticação (MODIFICADA) ---

  onLoginSubmit(): void {
    this.loginErrorMessage = null;
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.fecharModals();
        this.router.navigate(['/gerenciamento']);
      },
      error: (err) => {
        this.loginErrorMessage = err.error?.error || 'Falha no login.';
      }
    });
  }

  onRegisterSubmit(): void {
    this.registerErrorMessage = null;
    this.registerSuccessMessage = null;

    if (this.registerUser.senha !== this.registerUser.confirmarSenha) {
      this.registerErrorMessage = 'As senhas não coincidem.';
      return;
    }

    const payload = {
      nome: this.registerUser.nome,
      email: this.registerUser.email,
      telefone: this.registerUser.telefone,
      senha: this.registerUser.senha
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.registerSuccessMessage = response.message;
        this.emailParaVerificar = this.registerUser.email;
        this.fecharModals();
        this.verifyErrorMessage = null;
        this.verifySuccessMessage = null;
        this.verificationCode = '';
        this.mostrarVerifyEmailModal = true;
      },
      error: (err) => {
        this.registerErrorMessage = err.error?.error || 'Erro ao registrar.';
      }
    });
  }

  onVerifyCodeSubmit(): void {
    this.verifyErrorMessage = null;
    this.verifySuccessMessage = null;

    if (!this.emailParaVerificar || !this.verificationCode) {
      this.verifyErrorMessage = 'Erro: E-mail ou código faltando.';
      return;
    }

    this.authService.verifyEmailCode(this.emailParaVerificar, this.verificationCode).subscribe({
      next: (response) => {
        this.verifySuccessMessage = response.message;
        this.fecharModals();
        this.abrirLoginModal();
      },
      error: (err) => {
        this.verifyErrorMessage = err.error?.error || 'Falha na verificação.';
      }
    });
  }

  onForgotPasswordSubmit(): void {
    this.forgotPasswordErrorMessage = null;
    this.forgotPasswordSuccessMessage = null;
    this.authService.forgotPassword(this.forgotPasswordEmail).subscribe({
      next: (response) => {
        this.forgotPasswordSuccessMessage = response.message;
      },
      error: (err) => {
        this.forgotPasswordErrorMessage = err.error?.error || 'Erro ao enviar e-mail.';
      }
    });
  }

  toggleLoginPasswordVisibility(): void {
    this.loginPasswordVisible = !this.loginPasswordVisible;
  }

  // --- Lógica do Dropdown e Logout (Sem MUDANÇAS) ---
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarDropdown = !this.mostrarDropdown;
  }

  logout(): void {
    this.authService.logout();
    this.mostrarDropdown = false;
    this.router.navigate(['/home']);
  }

  // --- Lógica do Modal de Perfil (Sem MUDANÇAS) ---
  abrirModalPerfil(): void {
    if (this.currentUserValue) {
      this.usuarioEditavel = { ...this.currentUserValue };
      this.mostrarPerfilModal = true;
      this.mostrarDropdown = false;
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
    if (!this.currentUserValue) return;
    const payload = {
      nome: this.usuarioEditavel.nome,
      email: this.usuarioEditavel.email,
      telefone: this.usuarioEditavel.telefone,
      fotoperfil: this.usuarioEditavel.fotoperfil
    };

    this.usuarioService.atualizarPerfilUsuario(payload).subscribe({
      next: (response: any) => {
        this.authService.setUser(response.user);
        this.currentUserValue = response.user;
        this.fecharModalPerfil();
      },
      error: (err: any) => {
        console.error('Erro ao salvar perfil:', err);
      }
    });
  }
}
