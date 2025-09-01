import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-menu-cima',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgxMaskDirective],
  templateUrl: './menu-cima.component.html',
  styleUrls: ['./menu-cima.component.css']
})
export class MenuCimaComponent implements OnInit, OnDestroy {
  // Propriedades para controle dos modais
  mostrarLoginModal = false;
  mostrarRegisterModal = false;
  mostrarForgotPasswordModal = false;

  // Propriedades para o formulário de Login
  loginEmail: string = '';
  loginPassword: string = '';
  loginRememberMe: boolean = false;
  loginErrorMessage: string = '';
  loginPasswordVisible: boolean = false; 

  // --- CORREÇÃO APLICADA AQUI ---
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

  constructor(
    public apiService: AuthService,
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
    // --- CORREÇÃO APLICADA AQUI ---
    // Resetando o objeto sem os campos de senha
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
    // --- CORREÇÃO APLICADA AQUI ---
    // 1. Validação de campos obrigatórios (sem senha)
    if (!this.registerUser.username || !this.registerUser.email || !this.registerUser.telefone) {
      this.registerErrorMessage = 'Nome, e-mail e telefone são obrigatórios.';
      return;
    }

    // Limpa a mensagem de erro se a validação passar
    this.registerErrorMessage = '';

    // 2. Mapeia os campos para o formato que o back-end espera (sem senha)
    const payload = {
      nome: this.registerUser.username,
      email: this.registerUser.email,
      telefone: this.registerUser.telefone
    };

    this.apiService.register(payload).subscribe({
      next: (response) => {
        // --- ATUALIZAÇÃO ---
        // Exibe a mensagem de sucesso que vem do backend
        this.registerSuccessMessage = response.message || 'Cadastro realizado! Verifique seu e-mail para continuar.';
        // Fecha o modal de registro após um tempo para o usuário ler a mensagem
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
}