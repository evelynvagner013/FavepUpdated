import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask'; // <-- CORREÇÃO 1: Importar a diretiva

@Component({
  selector: 'app-menu-cima',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxMaskDirective], // <-- CORREÇÃO 2: Adicionar a diretiva aos imports
  templateUrl: './menu-cima.component.html',
  styleUrl: './menu-cima.component.css'
})
export class MenuCimaComponent implements OnInit {
  // Propriedades para o estado do usuário e controle dos modais
  user: any = null;
  mostrarLoginModal = false;
  mostrarRegisterModal = false;

  // Propriedades para o formulário de Login
  loginEmail: string = '';
  loginPassword: string = '';
  loginRememberMe: boolean = false;
  loginErrorMessage: string = '';

  // Propriedades para o formulário de Registro
  registerUser: any = { username: '', email: '', password: '', telefone: '', confirmarSenha: '' };
  registerSuccessMessage: string = '';
  registerErrorMessage: string = '';

  currentTheme: string = 'light-theme'; // Tema padrão

  constructor(private apiService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Ao iniciar o componente, verifica se há um usuário logado no serviço
    this.user = this.apiService.getUser();
  }

  logout(): void {
    // Realiza o logout, limpa os dados e recarrega a página
    this.apiService.logout();
    this.router.navigate(['/home']).then(() => window.location.reload());
  }

  // --- Métodos para controle dos Modais ---

  abrirLoginModal() {
    this.mostrarRegisterModal = false;
    this.mostrarLoginModal = true;
    this.loginEmail = '';
    this.loginPassword = '';
    this.loginErrorMessage = '';
    this.loginRememberMe = false;
  }

  abrirRegisterModal() {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = true;
    this.registerUser = { username: '', email: '', password: '', telefone: '', confirmarSenha: '' };
    this.registerSuccessMessage = '';
    this.registerErrorMessage = '';
  }

  fecharModals() {
    this.mostrarLoginModal = false;
    this.mostrarRegisterModal = false;
  }

  // --- Métodos de Submissão dos Formulários ---

  onLoginSubmit() {
    if (!this.loginEmail || !this.loginPassword) {
      this.loginErrorMessage = "Email e senha são obrigatórios.";
      return;
    }

    this.apiService.login(this.loginEmail, this.loginPassword).subscribe({
      next: (response) => {
        console.log('Login realizado com sucesso!', response);
        if (response.token && response.user) {
          localStorage.setItem('token', response.token);
          this.apiService.setUser(response.user);
          this.user = response.user; // Atualiza o usuário no componente
        }
        this.fecharModals();
        // Redireciona para a página de gerenciamento ou recarrega a página atual
        this.router.navigate(['/gerenciamento']);
      },
      error: (error) => {
        console.error('Erro no login', error);
        this.loginErrorMessage = error.error?.error || 'Email ou senha inválidos';
      }
    });
  }

  onRegisterSubmit() {
    // --- LÓGICA DE VALIDAÇÃO CORRIGIDA E INTEGRADA ---

    // 1. Validação de campos obrigatórios
    if (!this.registerUser.username || !this.registerUser.email || !this.registerUser.password || !this.registerUser.telefone || !this.registerUser.confirmarSenha) {
        this.registerErrorMessage = 'Todos os campos são obrigatórios.';
        this.registerSuccessMessage = '';
        return;
    }

    // 2. Validação para garantir que as senhas coincidem
    if (this.registerUser.password !== this.registerUser.confirmarSenha) {
        this.registerErrorMessage = 'As senhas não coincidem.';
        this.registerSuccessMessage = '';
        return;
    }

    // Limpa a mensagem de erro se a validação passar
    this.registerErrorMessage = '';

    // 3. Mapeia os campos do formulário para o formato que o back-end espera (payload)
    const payload = {
      nome: this.registerUser.username,
      email: this.registerUser.email,
      telefone: this.registerUser.telefone,
      senha: this.registerUser.password,
      confirmarSenha: this.registerUser.confirmarSenha
    };

    // --- FIM DA LÓGICA DE VALIDAÇÃO ---

    this.apiService.register(payload).subscribe({
      next: (response) => {
        console.log('Usuário cadastrado com sucesso:', response);
        this.registerSuccessMessage = 'Cadastro realizado com sucesso! Faça o login para continuar.';
        this.registerErrorMessage = '';
        setTimeout(() => {
          this.abrirLoginModal();
        }, 2500);
      },
      error: (error) => {
        console.error('Erro no cadastro', error);
        this.registerErrorMessage = error.error?.error || 'Erro ao cadastrar. Verifique os dados.';
        this.registerSuccessMessage = '';
      }
    });
  }
}