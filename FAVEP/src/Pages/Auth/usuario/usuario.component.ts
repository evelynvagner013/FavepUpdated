import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/api.models';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { MenuCentralComponent } from '../../menu-central/menu-central.component';
import { MenuLateralComponent } from '../../menu-lateral/menu-lateral.component';
// IMPORTS DO CROPPER
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NgxMaskPipe,
    NgxMaskDirective,
    MenuCentralComponent,
    MenuLateralComponent,
    ImageCropperComponent // Necessário para o componente funcionar no HTML
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

  // Propriedades para o modal de alterar senha
  senhaModalAberto = false;
  senhaForm: FormGroup;
  senhaIsLoading = false;
  senhaSuccessMessage: string | null = null;
  senhaErrorMessage: string | null = null;
  senhaAtualVisible = false;
  novaSenhaVisible = false;
  confirmarSenhaVisible = false;

  // ESTADO PARA VERIFICAÇÃO DE NOVO E-MAIL
  mostrarVerifyEmailUpdate = false;
  emailParaVerificarUpdate: string | null = null;
  oldEmail: string | null = null;
  verificationCodeUpdate: string = '';
  verifyEmailIsLoading = false;
  verifyEmailSuccessMessage: string | null = null;
  verifyEmailErrorMessage: string | null = null;

  // ESTADO PARA 2FA DE SENHA
  senhaStep: 'form' | 'otp' = 'form';
  otpEnviado = false;

  // --- NOVAS PROPRIEDADES PARA O CROPPER (FOTO DE PERFIL) ---
  imageChangedEvent: any = ''; // Evento do input file original
  croppedImage: any = '';      // Resultado do corte em Base64
  cropperModalAberto = false;  // Controle do modal de corte
  isCropperLoading = false;    // Feedback visual de carregamento da imagem

  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private fb: FormBuilder
  ) {
    // Inicializa o formulário reativo para a senha
    this.senhaForm = this.fb.group({
      senhaAtual: ['', [Validators.required]],
      novaSenha: ['', [
        Validators.required,
        Validators.minLength(8),
        // Validador de complexidade (8+ chars, maiúscula, minúscula, número, especial)
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$')
      ]],
      confirmarSenha: ['', [Validators.required]],
      otp: ['']
    }, {
      validators: this.passwordMatchValidator
    });

    this.senhaForm.get('otp')?.disable();
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        // Atualiza o usuário e mantém a senha vazia
        this.usuario = { ...user, senha: '' };

        // Se o usuário tem um novo e-mail mas não verificou, abre o modal.
        if (!user.emailVerified && user.verificationToken) {
           this.abrirModalVerificacaoEmailUpdate(user.email);
        }

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
    if (form.get('otp')?.enabled) {
        return null;
    }

    const novaSenha = form.get('novaSenha')?.value;
    const confirmarSenha = form.get('confirmarSenha')?.value;
    return novaSenha === confirmarSenha ? null : { mismatch: true };
  }

  // --- LÓGICA DO CROPPER (SUBSTITUI O ANTIGO onFileSelected) ---

  // 1. Captura o evento de seleção de arquivo do input type="file"
  fileChangeEvent(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.imageChangedEvent = event;
      this.cropperModalAberto = true; // Abre o modal de corte
      this.isCropperLoading = true;
    }
  }

  // 2. Evento disparado cada vez que o usuário move a área de corte ou carrega a imagem
  // CORREÇÃO APLICADA: Converte Blob para Base64 para evitar erro de validação no Backend
  imageCropped(event: ImageCroppedEvent) {
    // Tenta pegar o Base64 direto (versões antigas ou configuradas)
    if (event.base64) {
      this.croppedImage = event.base64;
    }
    // Se não vier Base64, converte o Blob (versões novas padrão)
    else if (event.blob) {
      const reader = new FileReader();
      reader.onload = () => {
        this.croppedImage = reader.result; // Aqui garantimos o formato "data:image/..."
      };
      reader.readAsDataURL(event.blob);
    }
    // Último caso: converte via URL do objeto se o blob falhar
    else if (event.objectUrl) {
      fetch(event.objectUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            this.croppedImage = reader.result;
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => console.error('Erro ao converter imagem:', err));
    }
  }

  // 3. Imagem carregada com sucesso no editor
  imageLoaded(image: LoadedImage) {
      this.isCropperLoading = false;
  }

  // 4. Editor pronto para uso
  cropperReady() {
      this.isCropperLoading = false;
  }

  // 5. Falha ao carregar imagem
  loadImageFailed() {
      this.isCropperLoading = false;
      this.errorMessage = "Formato de imagem inválido ou arquivo corrompido.";
      this.fecharModalCropper();
  }

  // 6. Confirma o corte e aplica ao usuárioEditavel
  confirmarRecorte(): void {
    if (this.croppedImage) {
      this.usuarioEditavel.fotoperfil = this.croppedImage;
      this.fecharModalCropper();
    }
  }

  // 7. Cancela o corte
  fecharModalCropper(): void {
    this.cropperModalAberto = false;
    this.imageChangedEvent = '';
    this.croppedImage = '';
  }

  // 8. Função para remover a foto de perfil
  removerFoto(): void {
    // Define como null para que o backend saiba que deve remover
    this.usuarioEditavel.fotoperfil = null;
    this.imageChangedEvent = '';
    this.croppedImage = '';
  }

  // -------------------------------------------------------------

  /**
   * Salva as alterações e lida com a verificação de novo e-mail.
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

        // 1. Caso precise de verificação de e-mail (202 - Accepted)
        if (response.verificationPending) {
          this.fecharModalEdicao();
          this.successMessage = response.message;
          this.authService.setUser(response.user); // Atualiza o usuário (com novo email não verificado)

          // Inicia o fluxo de verificação
          this.abrirModalVerificacaoEmailUpdate(response.user.email, response.oldEmail);

          // Limpa a mensagem de sucesso da edição após 3s
          setTimeout(() => { this.successMessage = null; }, 3000);
          return;
        }

        // 2. Caso de atualização normal (200 - OK)
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

  fecharModalEdicao(): void {
    this.editModalAberto = false;
    this.successMessage = null;
    this.errorMessage = null;
    this.isLoading = false;
  }

  // ### Lógica de Verificação de Novo E-mail ###

  abrirModalVerificacaoEmailUpdate(newEmail: string, oldEmail: string | null = null): void {
    this.fecharModalEdicao();
    this.fecharModalSenha();
    this.emailParaVerificarUpdate = newEmail;
    this.oldEmail = oldEmail;
    this.verificationCodeUpdate = '';
    this.verifyEmailErrorMessage = null;
    this.verifyEmailSuccessMessage = null;
    this.mostrarVerifyEmailUpdate = true;
  }

  fecharModalVerificacaoEmailUpdate(): void {
    this.mostrarVerifyEmailUpdate = false;
    this.verifyEmailIsLoading = false;
  }

  onVerifyNewEmailCodeSubmit(): void {
    this.verifyEmailErrorMessage = null;
    this.verifyEmailSuccessMessage = null;

    if (!this.verificationCodeUpdate || this.verificationCodeUpdate.length !== 6) {
      this.verifyEmailErrorMessage = 'Por favor, insira o código de 6 dígitos.';
      setTimeout(() => { this.verifyEmailErrorMessage = null; }, 10000);
      return;
    }

    this.verifyEmailIsLoading = true;

    // Chama o novo método no authService
    this.authService.verifyNewEmail(this.verificationCodeUpdate).subscribe({
      next: (response) => {
        this.verifyEmailIsLoading = false;
        // Atualiza o token e o usuário no storage com o novo e-mail verificado
        this.authService.setToken(response.token);
        this.authService.setUser(response.user);
        this.verifyEmailSuccessMessage = response.message || "E-mail verificado e atualizado com sucesso!";

        setTimeout(() => {
          this.fecharModalVerificacaoEmailUpdate();
          this.successMessage = 'E-mail atualizado com sucesso!'; // Feedback na tela principal
          setTimeout(() => { this.successMessage = null; }, 5000);
        }, 3000);
      },
      error: (err) => {
        this.verifyEmailIsLoading = false;
        this.verifyEmailErrorMessage = err.error?.error || 'Falha na verificação. Tente novamente.';
        setTimeout(() => { this.verifyEmailErrorMessage = null; }, 10000);
      }
    });
  }


  // ### FUNÇÕES DE SENHA COM 2FA ###

  abrirModalSenha(): void {
    this.senhaModalAberto = true;
    this.senhaForm.reset();
    this.senhaStep = 'form'; // Reinicia para o primeiro passo
    this.otpEnviado = false;
    this.senhaForm.get('otp')?.disable(); // Garante que o campo OTP está desabilitado no início.
    this.senhaSuccessMessage = null;
    this.senhaErrorMessage = null;
    this.senhaForm.updateValueAndValidity();

    // Reabilita os campos de senha se estiverem desabilitados
    this.senhaForm.get('senhaAtual')?.enable();
    this.senhaForm.get('novaSenha')?.enable();
    this.senhaForm.get('confirmarSenha')?.enable();
  }

  fecharModalSenha(): void {
    this.senhaModalAberto = false;
    this.senhaIsLoading = false;
    this.senhaStep = 'form'; // Reinicia o estado ao fechar.
    this.otpEnviado = false;
  }

  // Função principal de submissão do formulário. Depende do estado (step).
  salvarNovaSenha(): void {
    if (this.senhaStep === 'form') {
      this.iniciarAlteracaoSenha();
    } else { // this.senhaStep === 'otp'
      this.confirmarAlteracaoSenha();
    }
  }

  iniciarAlteracaoSenha(): void {
    // 1. Força o estado 'touched' para exibir erros visuais
    this.senhaForm.get('senhaAtual')?.markAsTouched();
    this.senhaForm.get('novaSenha')?.markAsTouched();
    this.senhaForm.get('confirmarSenha')?.markAsTouched();

    const senhaAtualInvalida = this.senhaForm.get('senhaAtual')?.invalid;
    const novaSenhaInvalida = this.senhaForm.get('novaSenha')?.invalid;
    const confirmarSenhaInvalida = this.senhaForm.get('confirmarSenha')?.invalid;
    const senhasDiferentes = this.senhaForm.errors?.['mismatch'];

    // 2. Checa a validade de CADA campo e o 'mismatch'
    if (senhaAtualInvalida || novaSenhaInvalida || confirmarSenhaInvalida || senhasDiferentes) {
      this.senhaErrorMessage = 'Por favor, preencha a senha atual e a nova senha corretamente.';
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

    this.authService.iniciarChangePassword2FA(payload).subscribe({
      next: (response: any) => {
        this.senhaIsLoading = false;
        this.senhaSuccessMessage = response.message || 'Código de verificação enviado para seu e-mail/telefone!';

        // Passa para o próximo passo e habilita o campo OTP
        this.senhaStep = 'otp';
        this.otpEnviado = true;
        this.senhaForm.get('otp')?.enable();
        this.senhaForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
        this.senhaForm.get('otp')?.updateValueAndValidity();

        // Desabilita os campos de senha no passo 2
        this.senhaForm.get('senhaAtual')?.disable();
        this.senhaForm.get('novaSenha')?.disable();
        this.senhaForm.get('confirmarSenha')?.disable();


        // Limpa a mensagem de sucesso após 5 segundos para focar no OTP
        setTimeout(() => { this.senhaSuccessMessage = null; }, 5000);
      },
      error: (err: any) => {
        this.senhaIsLoading = false;
        this.senhaErrorMessage = err.error?.error || 'Erro ao iniciar alteração de senha. Verifique a senha atual e tente novamente.';

        setTimeout(() => {
          this.senhaErrorMessage = null;
        }, 10000);
      }
    });
  }

  confirmarAlteracaoSenha(): void {
    this.senhaForm.get('otp')?.markAsTouched();

    if (this.senhaForm.get('otp')?.invalid) {
      this.senhaErrorMessage = 'Por favor, insira o código de verificação.';
      setTimeout(() => { this.senhaErrorMessage = null; }, 10000);
      return;
    }

    this.senhaIsLoading = true;
    this.senhaSuccessMessage = null;
    this.senhaErrorMessage = null;

    const finalPayload = {
      senhaAtual: this.senhaForm.get('senhaAtual')?.value,
      novaSenha: this.senhaForm.get('novaSenha')?.value,
      otp: this.senhaForm.get('otp')?.value
    };

    this.authService.finalizarChangePassword2FA(finalPayload).subscribe({
      next: (response: any) => {
        this.senhaIsLoading = false;
        this.senhaSuccessMessage = response.message || 'Senha alterada com sucesso!';
        this.senhaForm.reset();
        this.senhaStep = 'form'; // Volta ao passo inicial

        setTimeout(() => {
          this.fecharModalSenha();
        }, 3000);
      },
      error: (err: any) => {
        this.senhaIsLoading = false;
        this.senhaErrorMessage = err.error?.error || 'Erro ao verificar código. Tente novamente.';

        // Limpa o campo OTP para nova tentativa
        this.senhaForm.get('otp')?.setValue('');

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
