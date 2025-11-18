// Conteúdo completo do arquivo: src/Pages/navbar/menu-cima/menu-cima.component.ts

import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router'; 
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
  
  // ADICIONADO: Propriedade para checar o ambiente
  isBrowser: boolean; 

  mostrarLoginModal = false;
  mostrarRegisterModal = false;
  mostrarPerfilModal = false;
  mostrarVerifyEmailModal = false;
  
  // Variáveis para o fluxo de "Esqueci a Senha"
  mostrarForgotPasswordModal = false;
  forgotFlowStep: 'email' | 'code' | 'password' = 'email';
  forgotEmail: string = '';
  forgotCode: string = '';
  forgotNewPassword: string = '';
  forgotConfirmPassword: string = '';
  forgotSuccessMessage: string | null = null;
  forgotErrorMessage: string | null = null;
  forgotPasswordVisible: boolean = false;
  forgotConfirmPasswordVisible: boolean = false;
  private forgotResetToken: string | null = null; // Token salvo internamente

  usuarioEditavel: Partial<Usuario> = {};

  loginEmail = '';
  loginPassword = '';
  loginPasswordVisible = false;
  loginErrorMessage: string | null = null;
  lembreMe = false;

  registerUser = { nome: '', email: '', telefone: '', senha: '', confirmarSenha: '' };
  registerSuccessMessage: string | null = null;
  registerErrorMessage: string | null = null;

  verificationCode = '';
  emailParaVerificar = '';
  verifySuccessMessage: string | null = null;
  verifyErrorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object // INJEÇÃO: Detecta o ambiente
  ) {
    // INICIALIZAÇÃO: Define se estamos no navegador
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.currentUserValue = this.authService.currentUserValue;
  }

  ngOnInit(): void {
   
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUserValue = user;
    });

    // Lógica para abrir modal via query param (vinda do password.component)
    this.route.queryParamMap.subscribe(params => {
      if (params.get('openLogin') === 'true') {
        this.abrirLoginModal();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openLogin: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // --- Funções de Controle de Modal ---

  abrirLoginModal(): void {
    this.fecharModals();
    this.loginErrorMessage = null;
    this.loginPassword = '';
    this.mostrarLoginModal = true;
    
    // CORREÇÃO SSR: Acessa localStorage APENAS se estiver no navegador
    if (this.isBrowser) {
        const savedEmail = localStorage.getItem('lembreMeEmail');
        if (savedEmail) {
          this.loginEmail = savedEmail;
          this.lembreMe = true;
        } else {
          this.loginEmail = '';
          this.lembreMe = false;
        }
    }
  }

  abrirRegisterModal(): void {
    this.fecharModals();
    this.registerErrorMessage = null;
    this.registerSuccessMessage = null;
    this.registerUser = { nome: '', email: '', telefone: '', senha: '', confirmarSenha: '' };
    this.mostrarRegisterModal = true;
  }

  /**
   * Abre o modal de "Esqueci a Senha" e reseta seu estado.
   */
  abrirForgotPasswordModal(): void {
    this.fecharModals();
    this.mostrarForgotPasswordModal = true;
    this.forgotFlowStep = 'email';
    // Pega o email do campo de login, se estiver preenchido
    this.forgotEmail = this.loginEmail; 
    this.forgotCode = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotSuccessMessage = null;
    this.forgotErrorMessage = null;
    this.forgotResetToken = null;
  }

  fecharModals(): void {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = false;
    this.mostrarVerifyEmailModal = false;
    this.mostrarForgotPasswordModal = false; 
  }

  // --- Lógica de Autenticação ---

  onLoginSubmit(): void {
    this.loginErrorMessage = null;

    // CORREÇÃO SSR: Acessa localStorage APENAS se estiver no navegador
    if (this.isBrowser) {
        if (this.lembreMe) {
          localStorage.setItem('lembreMeEmail', this.loginEmail);
        } else {
          localStorage.removeItem('lembreMeEmail');
        }
    }

    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.fecharModals();
        this.router.navigate(['/gerenciamento']);
      },
      error: (err) => {
        this.loginErrorMessage = 'Senha ou usuário incorreto.';
        setTimeout(() => { this.loginErrorMessage = null; }, 10000); // Limpa após 10s
      }
    });
  }

  onRegisterSubmit(): void {
    this.registerErrorMessage = null;
    this.registerSuccessMessage = null;

    if (this.registerUser.senha !== this.registerUser.confirmarSenha) {
      this.registerErrorMessage = 'As senhas não coincidem.';
      setTimeout(() => { this.registerErrorMessage = null; }, 10000); // Limpa após 10s
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
        
        // Adiciona delay de 10s antes de mudar de modal
        setTimeout(() => {
          this.fecharModals();
          this.verifyErrorMessage = null;
          this.verifySuccessMessage = null; // Mensagem será mostrada no próximo modal
          this.verificationCode = '';
          this.mostrarVerifyEmailModal = true;
        }, 10000); // 10 segundos de espera
      },
      error: (err) => {
        this.registerErrorMessage = err.error?.error || 'Erro ao registrar.';
        setTimeout(() => { this.registerErrorMessage = null; }, 10000); // Limpa após 10s
      }
    });
  }

  onVerifyCodeSubmit(): void {
    this.verifyErrorMessage = null;
    this.verifySuccessMessage = null;

    if (!this.emailParaVerificar || !this.verificationCode) {
      this.verifyErrorMessage = 'Erro: E-mail ou código faltando.';
      setTimeout(() => { this.verifyErrorMessage = null; }, 10000); // Limpa após 10s
      return;
    }

    this.authService.verifyEmailCode(this.emailParaVerificar, this.verificationCode).subscribe({
      next: (response) => {
        this.verifySuccessMessage = response.message || "E-mail verificado com sucesso!";
        
        // Adiciona delay de 10s antes de mudar de modal
        setTimeout(() => {
          this.fecharModals();
          this.abrirLoginModal();
        }, 10000); // 10 segundos de espera
      },
      error: (err) => {
        this.verifyErrorMessage = err.error?.error || 'Falha na verificação.';
        setTimeout(() => { this.verifyErrorMessage = null; }, 10000); // Limpa após 10s
      }
    });
  }

  /**
   * Lida com o envio do formulário de "Esqueci a Senha" em 3 etapas.
   */
  onForgotPasswordSubmit(): void {
    this.forgotSuccessMessage = null;
    this.forgotErrorMessage = null;
    
    // Etapa 1: Enviar o e-mail
    if (this.forgotFlowStep === 'email') {
      this.authService.forgotPassword(this.forgotEmail).subscribe({
        next: (res) => {
          this.forgotSuccessMessage = res.message || 'Código enviado para o e-mail.';
          this.forgotFlowStep = 'code'; // Avança para a etapa do código
          setTimeout(() => { this.forgotSuccessMessage = null; }, 10000); // Limpa após 10s
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Erro ao enviar e-mail.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
        }
      });
    } 
    
    // Etapa 2: Validar o código
    else if (this.forgotFlowStep === 'code') {
      this.authService.verifyEmailCode(this.forgotEmail, this.forgotCode).subscribe({
        next: (res) => {
          this.forgotResetToken = res.token; // Salva o token retornado pela API
          if (!this.forgotResetToken) {
            this.forgotErrorMessage = 'Token de redefinição não recebido da API.';
            setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
            return;
          }
          this.forgotSuccessMessage = 'Código validado! Defina sua nova senha.';
          this.forgotFlowStep = 'password'; // Avança para a etapa da senha
          setTimeout(() => { this.forgotSuccessMessage = null; }, 10000); // Limpa após 10s
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Código inválido ou expirado.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
        }
      });
    } 
    
    // Etapa 3: Redefinir a senha
    else if (this.forgotFlowStep === 'password') {
      if (this.forgotNewPassword !== this.forgotConfirmPassword) {
        this.forgotErrorMessage = 'As senhas não coincidem.';
        setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
        return;
      }
      if (!this.forgotResetToken) {
        this.forgotErrorMessage = 'Sessão de redefinição inválida. Por favor, reinicie.';
        this.forgotFlowStep = 'email'; // Reinicia o fluxo
        setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
        return;
      }
      
      this.authService.resetPassword(this.forgotResetToken, this.forgotNewPassword, this.forgotConfirmPassword).subscribe({
        next: (res) => {
          this.forgotSuccessMessage = res.message || 'Senha alterada com sucesso!';
          // Altera o delay para 10 segundos
          setTimeout(() => {
            this.fecharModals();
            this.abrirLoginModal();
          }, 10000); // 10 segundos de espera
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Erro ao redefinir a senha.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000); // Limpa após 10s
        }
      });
    }
  }

  toggleLoginPasswordVisibility(): void {
    this.loginPasswordVisible = !this.loginPasswordVisible;
  }
  
  // Toggles de visibilidade para o novo formulário
  toggleForgotPasswordVisibility(): void {
    this.forgotPasswordVisible = !this.forgotPasswordVisible;
  }

  toggleForgotConfirmPasswordVisibility(): void {
    this.forgotConfirmPasswordVisible = !this.forgotConfirmPasswordVisible;
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