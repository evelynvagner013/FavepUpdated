import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';
import { MenuCimaComponent } from '../navbar/menu-cima/menu-cima.component';
import { ContatoService } from '../../services/contato.service';

@Component({
  selector: 'app-contato',
  standalone: true,
  // Adicionamos CommonModule e ReactiveFormsModule para o novo formulário
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FooterComponent,
    RouterLinkActive,
    MenuCimaComponent
  ],
  templateUrl: './contato.component.html',
  styleUrls: ['./contato.component.css']
})
export class ContatoComponent implements OnInit {
  // Propriedades para gerenciar o estado do formulário e feedback
  contactForm!: FormGroup;
  mensagemSucesso: string = '';
  mensagemErro: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private contatoService: ContatoService // Injetamos o serviço de contato
  ) { }

  ngOnInit(): void {
    // Inicializamos o formulário com validações
    this.contactForm = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      mensagem: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  /**
   * Função chamada quando o formulário de contato é enviado.
   * Ela valida os dados e usa o ContatoService para enviar a mensagem para a API.
   */
  onSubmit(): void {
    // Se o formulário for inválido, marca todos os campos como "tocados" para exibir os erros
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    // Define o estado de carregamento e limpa mensagens antigas
    this.isLoading = true;
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    // Chama o serviço para enviar os dados do formulário para o backend
    this.contatoService.enviarMensagem(this.contactForm.value).subscribe({
      next: (response) => {
        // Em caso de sucesso
        this.mensagemSucesso = response.message || 'Mensagem enviada com sucesso!';
        this.contactForm.reset(); // Limpa o formulário
        this.isLoading = false;
      },
      error: (err) => {
        // Em caso de erro
        this.mensagemErro = err.error?.error || 'Ocorreu um erro ao enviar a mensagem. Tente novamente mais tarde.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Mantivemos sua função para abrir o WhatsApp.
   * Ela é chamada por um botão separado no HTML.
   */
  sendWhatsApp(event: Event) {
    event.preventDefault();
    const textoPadrao = encodeURIComponent("Olá, gostaria de mais informações sobre os serviços da FAVEP.");
    const numero = "551632520000"; // Número de WhatsApp da FAVEP
    window.open(`https://wa.me/${numero}?text=${textoPadrao}`, "_blank");
  }
}
