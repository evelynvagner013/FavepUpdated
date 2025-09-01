import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Importe seu serviço de autenticação

@Component({
  selector: 'app-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordComponent implements OnInit {
  senha = '';
  confirmarSenha = '';
  mensagemErro = '';
  mensagemSucesso = '';
  token: string | null = null;
  
  // Determina se a ação é de verificação de e-mail ou redefinição de senha
  isVerificationFlow: boolean = false;

  // NOVAS PROPRIEDADES: Controle de visibilidade da senha
  senhaVisivel: boolean = false;
  confirmarSenhaVisivel: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Captura o token da URL
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token');
    });

    // Verifica a URL para determinar o fluxo
    this.isVerificationFlow = this.router.url.includes('verify-email');
  }

    // NOVOS MÉTODOS: Para alternar a visibilidade das senhas
      toggleSenhaVisibilidade(): void {
        this.senhaVisivel = !this.senhaVisivel;
      }

      toggleConfirmarSenhaVisibilidade(): void {
        this.confirmarSenhaVisivel = !this.confirmarSenhaVisivel;
      }
    

  onSubmit(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    if (!this.token) {
      this.mensagemErro = 'Token inválido ou ausente. Por favor, use o link enviado para o seu e-mail.';
      return;
    }

    if (!this.senha || !this.confirmarSenha) {
      this.mensagemErro = 'Por favor, preencha ambos os campos de senha.';
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.mensagemErro = 'As senhas não coincidem. Tente novamente.';
      return;
    }
    // Escolhe qual método do serviço chamar com base no fluxo
    const apiCall = this.isVerificationFlow
      ? this.authService.verifyAndSetPassword(this.token, this.senha, this.confirmarSenha)
      : this.authService.resetPassword(this.token, this.senha, this.confirmarSenha);

    apiCall.subscribe({
      next: (response) => {
        this.mensagemSucesso = `${response.message} Você será redirecionado para o login.`;
        setTimeout(() => {
          this.router.navigate(['/home'], { queryParams: { openLogin: 'true' } });
        }, 3000); // Redireciona após 3 segundos
      },
      error: (err) => {
        this.mensagemErro = err.error?.error || 'Ocorreu um erro. Verifique seu token e tente novamente.';
      }
    });
  }
}