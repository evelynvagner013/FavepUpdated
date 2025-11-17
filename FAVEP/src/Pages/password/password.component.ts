// src/Pages/password/password.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';
import { FooterComponent } from '../footer/footer.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MenuCimaComponent,
    FooterComponent
  ],
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordComponent implements OnInit {

  form!: FormGroup;

  mode: 'reset' | 'verify' | 'forgot' = 'forgot';
  forgotFlowStep: 'email' | 'code' | 'password' = 'email';

  resetToken: string | null = null;
  userEmail: string = '';

  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.detectMode();
  }

  // Inicializa o FormGroup com campos que serão usados nos 3 modos
  private initializeForm(): void {
    this.form = this.fb.group(
      {
        email: [''],
        code: [''],
        senha: [''],
        confirmarSenha: ['']
      },
      { validators: PasswordComponent.passwordMatchValidator }
    );
  }

  // Detecta rota para definir o modo (reset / verify / forgot)
  private detectMode(): void {
    const path = this.route.snapshot.url.map(p => p.path).join('/');

    if (path === 'auth/reset-password') {
      this.mode = 'reset';
      this.resetToken = this.route.snapshot.queryParamMap.get('token');
      this.setupResetMode();
      return;
    }

    if (path === 'auth/verify-email') {
      this.mode = 'verify';
      this.setupVerifyMode();
      return;
    }

    // default: forgot-password flow
    this.mode = 'forgot';
    this.forgotFlowStep = 'email';
    this.setupForgotEmailStep();
  }

  // limpa validadores dos controles
  private clearValidators(): void {
    ['email', 'code', 'senha', 'confirmarSenha'].forEach(field => {
      const control = this.form.get(field);
      control?.clearValidators();
      control?.updateValueAndValidity({ emitEvent: false });
    });
  }

  // configurações para cada modo/step (aplica validadores necessários)
  private setupResetMode(): void {
    this.clearValidators();
    this.form.get('senha')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('confirmarSenha')?.setValidators([Validators.required]);
  }

  private setupVerifyMode(): void {
    this.clearValidators();
    this.form.get('email')?.setValidators([Validators.required, Validators.email]);
    this.form.get('code')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
  }

  private setupForgotEmailStep(): void {
    this.clearValidators();
    this.form.get('email')?.setValidators([Validators.required, Validators.email]);
  }

  private setupForgotCodeStep(): void {
    this.clearValidators();
    this.form.get('email')?.setValidators([Validators.required, Validators.email]);
    this.form.get('code')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
  }

  private setupForgotPasswordStep(): void {
    this.setupResetMode();
  }

  // validador que garante que senha e confirmarSenha coincidam
  static passwordMatchValidator(form: FormGroup): { mismatch: true } | null {
    const s1 = form.get('senha')?.value;
    const s2 = form.get('confirmarSenha')?.value;
    return s1 && s2 && s1 !== s2 ? { mismatch: true } : null;
  }

  // Envio do form — direciona para o handler correto conforme modo/step
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    if (this.mode === 'reset') return this.submitReset();
    if (this.mode === 'verify') return this.submitVerify();
    return this.submitForgotFlow();
  }

  // reset via token (link)
  private submitReset(): void {
    if (!this.resetToken) {
      this.errorMessage = 'Token inválido.';
      this.isLoading = false;
      return;
    }

    const req = this.authService.resetPassword(
      this.resetToken,
      this.form.value.senha,
      this.form.value.confirmarSenha
    );

    this.handleRequest(req);
  }

  // verifica código de ativação de e-mail
  private submitVerify(): void {
    const req = this.authService.verifyEmailCode(
      this.form.value.email,
      this.form.value.code
    );

    this.handleRequest(req);
  }

  // fluxo de forgot: email -> code -> password
  private submitForgotFlow(): void {
    if (this.forgotFlowStep === 'email') return this.sendForgotEmail();
    if (this.forgotFlowStep === 'code') return this.validateForgotCode();
    return this.finishForgotPassword();
  }

  private sendForgotEmail(): void {
    const req = this.authService.forgotPassword(this.form.value.email);

    req.subscribe({
      next: res => {
        this.isLoading = false;
        this.userEmail = this.form.value.email;
        this.successMessage = res.message || 'Código enviado para o e-mail.';
        this.forgotFlowStep = 'code';
        this.form.reset();
        this.form.get('email')?.setValue(this.userEmail);
        this.setupForgotCodeStep();
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Erro ao enviar código.';
      }
    });
  }

  private validateForgotCode(): void {
    const req = this.authService.verifyEmailCode(
      this.form.value.email,
      this.form.value.code
    );

    req.subscribe({
      next: res => {
        this.isLoading = false;
        this.resetToken = res.token;

        if (!this.resetToken) {
          this.errorMessage = 'Token não recebido.';
          return;
        }

        this.successMessage = 'Código validado! Agora defina sua nova senha.';
        this.forgotFlowStep = 'password';
        this.form.reset();
        this.setupForgotPasswordStep();
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Código inválido.';
      }
    });
  }

  private finishForgotPassword(): void {
    if (!this.resetToken) {
      this.errorMessage = 'Token não encontrado.';
      this.isLoading = false;
      return;
    }

    const req = this.authService.resetPassword(
      this.resetToken,
      this.form.value.senha,
      this.form.value.confirmarSenha
    );

    this.handleRequest(req);
  }

  // trata respostas comuns de requisição (sucesso / erro)
  private handleRequest(request$: Observable<any>): void {
    request$.subscribe({
      next: res => {
        this.isLoading = false;
        this.successMessage = res.message || 'Sucesso!';
        setTimeout(() => {
          this.router.navigate(['/home'], { queryParams: { openLogin: 'true' } });
        }, 2500);
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Erro inesperado.';
      }
    });
  }

  
  public restartForgotFlow(): void {
    this.router.navigate(['/auth/forgot-password']);
    this.forgotFlowStep = 'email';
    this.form.reset();
    this.setupForgotEmailStep();
  }
}
