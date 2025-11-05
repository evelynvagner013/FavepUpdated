import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';
import { FooterComponent } from '../footer/footer.component';

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

  form: FormGroup;
  token: string | null = null;
  mode: 'reset' | 'verify' = 'verify'; // Modo do componente
  
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Inicia o formulário
    this.form = this.fb.group({
      // Campos para o modo 'verify'
      email: ['', [Validators.email]],
      code: [''],
      // Campos para o modo 'reset'
      senha: ['', [Validators.minLength(6)]],
      confirmarSenha: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    const urlPath = this.route.snapshot.url.map(segment => segment.path).join('/');
    
    if (urlPath === 'auth/reset-password') {
      this.mode = 'reset';
      this.token = this.route.snapshot.queryParamMap.get('token');
      
      // Validações para o modo 'reset'
      this.form.get('senha')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('confirmarSenha')?.setValidators([Validators.required]);
      
      // Remove validações do modo 'verify'
      this.form.get('email')?.clearValidators();
      this.form.get('code')?.clearValidators();

      if (!this.token) {
        this.errorMessage = 'Token de redefinição de senha não encontrado. Por favor, solicite um novo link.';
      }

    } else { // 'auth/verify-email'
      this.mode = 'verify';

      // Validações para o modo 'verify'
      this.form.get('email')?.setValidators([Validators.required, Validators.email]);
      this.form.get('code')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
      
      // Remove validações do modo 'reset'
      this.form.get('senha')?.clearValidators();
      this.form.get('confirmarSenha')?.clearValidators();
    }
    
    // Atualiza validadores
    this.form.updateValueAndValidity();
  }

  // Validador customizado para checar se as senhas batem
  passwordMatchValidator(form: FormGroup): null | { mismatch: true } {
    const senha = form.get('senha');
    const confirmarSenha = form.get('confirmarSenha');
    if (senha && confirmarSenha && senha.value !== confirmarSenha.value) {
      return { mismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    let request$: any; // Observable

    if (this.mode === 'reset') {
      if (!this.token) {
        this.errorMessage = 'Token inválido.';
        this.isLoading = false;
        return;
      }
      // O método 'resetPassword' ainda existe e funciona com token
      request$ = this.authService.resetPassword(
        this.token,
        this.form.value.senha,
        this.form.value.confirmarSenha
      );

    } else { // mode === 'verify'
      // --- CORREÇÃO AQUI ---
      // Usando o novo método 'verifyEmailCode'
      request$ = this.authService.verifyEmailCode(
        this.form.value.email,
        this.form.value.code
      );
      // --- FIM DA CORREÇÃO ---
    }

    request$.subscribe({
      // --- CORREÇÃO AQUI (Erro 3) ---
      next: (response: any) => { 
        this.isLoading = false;
        this.successMessage = response.message || 'Operação realizada com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/home'], { queryParams: { openLogin: 'true' } });
        }, 3000);
      },
      // --- CORREÇÃO AQUI (Erro 4) ---
      error: (err: any) => { 
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Ocorreu um erro. Tente novamente.';
      }
    });
  }
}