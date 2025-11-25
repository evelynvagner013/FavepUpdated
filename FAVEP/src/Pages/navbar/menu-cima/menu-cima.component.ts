import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
// ADICIONADO: AuthResponse na importação
import { Usuario, AuthResponse } from '../../../models/api.models';
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

  // Variável para controlar o Menu Hambúrguer
  menuAberto = false;

  isBrowser: boolean;

  mostrarLoginModal = false;
  mostrarRegisterModal = false;
  mostrarPerfilModal = false;
  mostrarVerifyEmailModal = false;

  // Variáveis para o fluxo de Completar Perfil (Sub-usuário)
  isCompleteProfileModalOpen = false;
  subUserStep: 'code' | 'details' = 'code';
  subUserTempData = {
    email: '',
    code: '',
    nome: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  };
  subUserError: string | null = null;
  subUserSuccess: string | null = null;
  isLoading = false;

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
  private forgotResetToken: string | null = null;

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.currentUserValue = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUserValue = user;
    });

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

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }

  abrirLoginModal(): void {
    this.fecharModals();
    this.loginErrorMessage = null;
    this.loginPassword = '';
    this.mostrarLoginModal = true;

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

  abrirForgotPasswordModal(): void {
    this.fecharModals();
    this.mostrarForgotPasswordModal = true;
    this.forgotFlowStep = 'email';
    this.forgotEmail = this.loginEmail;
    this.forgotCode = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotSuccessMessage = null;
    this.forgotErrorMessage = null;
    this.forgotResetToken = null;
  }

  abrirCompleteProfileModal(email: string): void {
    this.fecharModals();
    this.isCompleteProfileModalOpen = true;
    this.subUserStep = 'code';
    this.subUserError = null;
    this.subUserSuccess = null;
    this.subUserTempData = {
      email: email,
      code: '',
      nome: '',
      telefone: '',
      senha: '',
      confirmarSenha: ''
    };
  }

  fecharModals(): void {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = false;
    this.mostrarVerifyEmailModal = false;
    this.mostrarForgotPasswordModal = false;
    this.isCompleteProfileModalOpen = false;
  }

  onLoginSubmit(): void {
    this.loginErrorMessage = null;

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
        if (err.status === 401 && err.error.action === 'COMPLETE_PROFILE') {
            this.abrirCompleteProfileModal(this.loginEmail);
            return;
        }
        this.loginErrorMessage = 'Senha ou usuário incorreto.';
        setTimeout(() => { this.loginErrorMessage = null; }, 10000);
      }
    });
  }

  onRegisterSubmit(): void {
    this.registerErrorMessage = null;
    this.registerSuccessMessage = null;

    if (this.registerUser.senha !== this.registerUser.confirmarSenha) {
      this.registerErrorMessage = 'As senhas não coincidem.';
      setTimeout(() => { this.registerErrorMessage = null; }, 10000);
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

        setTimeout(() => {
          this.fecharModals();
          this.verifyErrorMessage = null;
          this.verifySuccessMessage = null;
          this.verificationCode = '';
          this.mostrarVerifyEmailModal = true;
        }, 10000);
      },
      error: (err) => {
        this.registerErrorMessage = err.error?.error || 'Erro ao registrar.';
        setTimeout(() => { this.registerErrorMessage = null; }, 10000);
      }
    });
  }

  onVerifyCodeSubmit(): void {
    this.verifyErrorMessage = null;
    this.verifySuccessMessage = null;

    if (!this.emailParaVerificar || !this.verificationCode) {
      this.verifyErrorMessage = 'Erro: E-mail ou código faltando.';
      setTimeout(() => { this.verifyErrorMessage = null; }, 10000);
      return;
    }

    this.authService.verifyEmailCode(this.emailParaVerificar, this.verificationCode).subscribe({
      next: (response) => {
        this.verifySuccessMessage = response.message || "E-mail verificado com sucesso!";
        setTimeout(() => {
          this.fecharModals();
          this.abrirLoginModal();
        }, 10000);
      },
      error: (err) => {
        this.verifyErrorMessage = err.error?.error || 'Falha na verificação.';
        setTimeout(() => { this.verifyErrorMessage = null; }, 10000);
      }
    });
  }

  onSubUserCodeSubmit(): void {
    if (!this.subUserTempData.code || this.subUserTempData.code.length !== 6) {
        this.subUserError = 'O código deve ter 6 dígitos.';
        setTimeout(() => { this.subUserError = null; }, 5000);
        return;
    }
    this.subUserStep = 'details';
    this.subUserError = null;
  }

  onSubUserFinalizeSubmit(): void {
    if (this.subUserTempData.senha !== this.subUserTempData.confirmarSenha) {
        this.subUserError = 'As senhas não coincidem.';
        setTimeout(() => { this.subUserError = null; }, 5000);
        return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!strongPassword.test(this.subUserTempData.senha)) {
        this.subUserError = 'A senha deve ter no mínimo 8 caracteres, com letras maiúsculas, minúsculas, números e caracteres especiais.';
        setTimeout(() => { this.subUserError = null; }, 10000);
        return;
    }

    this.isLoading = true;
    this.authService.completeSubUserProfile(this.subUserTempData).subscribe({
        next: (res) => {
            this.subUserSuccess = 'Cadastro concluído! Redirecionando...';
            this.authService.login(this.subUserTempData.email, this.subUserTempData.senha).subscribe({
                next: () => {
                    this.isLoading = false;
                    setTimeout(() => {
                        this.fecharModals();
                        this.router.navigate(['/gerenciamento']);
                    }, 2000);
                },
                error: (loginErr) => {
                    this.isLoading = false;
                    this.subUserError = 'Cadastro ok, mas erro no login automático. Por favor, faça login manualmente.';
                    setTimeout(() => {
                        this.fecharModals();
                        this.abrirLoginModal();
                    }, 3000);
                }
            });
        },
        error: (err) => {
            this.isLoading = false;
            this.subUserError = err.error?.error || 'Erro ao concluir cadastro.';
            if (this.subUserError?.toLowerCase().includes('código')) {
                this.subUserStep = 'code';
            }
            setTimeout(() => { this.subUserError = null; }, 10000);
        }
    });
  }

  onForgotPasswordSubmit(): void {
    this.forgotSuccessMessage = null;
    this.forgotErrorMessage = null;

    if (this.forgotFlowStep === 'email') {
      this.authService.forgotPassword(this.forgotEmail).subscribe({
        next: (res) => {
          this.forgotSuccessMessage = res.message || 'Código enviado para o e-mail.';
          this.forgotFlowStep = 'code';
          setTimeout(() => { this.forgotSuccessMessage = null; }, 10000);
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Erro ao enviar e-mail.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
        }
      });
    }
    else if (this.forgotFlowStep === 'code') {
      this.authService.verifyEmailCode(this.forgotEmail, this.forgotCode).subscribe({
        next: (res) => {
          this.forgotResetToken = res.token;
          if (!this.forgotResetToken) {
            this.forgotErrorMessage = 'Token de redefinição não recebido da API.';
            setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
            return;
          }
          this.forgotSuccessMessage = 'Código validado! Defina sua nova senha.';
          this.forgotFlowStep = 'password';
          setTimeout(() => { this.forgotSuccessMessage = null; }, 10000);
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Código inválido ou expirado.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
        }
      });
    }
    else if (this.forgotFlowStep === 'password') {
      if (this.forgotNewPassword !== this.forgotConfirmPassword) {
        this.forgotErrorMessage = 'As senhas não coincidem.';
        setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
        return;
      }
      if (!this.forgotResetToken) {
        this.forgotErrorMessage = 'Sessão de redefinição inválida. Por favor, reinicie.';
        this.forgotFlowStep = 'email';
        setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
        return;
      }

      // CORREÇÃO: Adicionado '!' para garantir que não é nulo
      this.authService.resetPassword(this.forgotResetToken!, this.forgotNewPassword, this.forgotConfirmPassword).subscribe({
        next: (res) => {
          this.forgotSuccessMessage = res.message || 'Senha alterada com sucesso!';
          setTimeout(() => {
            this.fecharModals();
            this.abrirLoginModal();
          }, 10000);
        },
        error: (err) => {
          this.forgotErrorMessage = err.error?.error || 'Erro ao redefinir a senha.';
          setTimeout(() => { this.forgotErrorMessage = null; }, 10000);
        }
      });
    }
  }

  toggleLoginPasswordVisibility(): void {
    this.loginPasswordVisible = !this.loginPasswordVisible;
  }

  toggleForgotPasswordVisibility(): void {
    this.forgotPasswordVisible = !this.forgotPasswordVisible;
  }

  toggleForgotConfirmPasswordVisibility(): void {
    this.forgotConfirmPasswordVisible = !this.forgotConfirmPasswordVisible;
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarDropdown = !this.mostrarDropdown;
  }

  logout(): void {
    this.authService.logout();
    this.mostrarDropdown = false;
    this.router.navigate(['/home']);
  }

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
      next: (response: AuthResponse) => {
        if (response.user) {
            this.authService.setUser(response.user);
            this.currentUserValue = response.user;
        }
        this.fecharModalPerfil();
      },
      error: (err: any) => {
        console.error('Erro ao salvar perfil:', err);
      }
    });
  }
}
