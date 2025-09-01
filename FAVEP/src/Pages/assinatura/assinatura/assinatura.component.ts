// assinatura/assinatura.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import { MercadoPagoService } from '../../../services/mercadopago.service'; // Importe o service

// Interfaces para tipagem
interface MercadoPagoResponse {
  init_point: string;
}

interface Plan {
  tipo: string;
  valor: number;
}

@Component({
  selector: 'app-assinatura',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assinatura.component.html',
  styleUrls: ['./assinatura.component.css']
})
export class AssinaturaComponent {

  isLoading = false;

  // Injete o MercadoPagoService
  constructor(private mercadoPagoService: MercadoPagoService) {}

  /**
   * Lida com a criação de uma assinatura para planos pagos.
   */
  async handleSubscription(plan: Plan, event: MouseEvent) {
    this.isLoading = true;
    const button = event.target as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Aguarde...';
    button.disabled = true;

    try {
      console.log(`Iniciando assinatura para o plano:`, plan);

      // Use o service para criar a assinatura
      const request$ = this.mercadoPagoService.criarAssinatura(plan.tipo, plan.valor);
      const data: MercadoPagoResponse = await lastValueFrom(request$);

      // Redirecione o usuário para o link de pagamento do Mercado Pago
      if (data && data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error('Erro: A resposta da API não continha um "init_point".', data);
        alert('Ocorreu um erro ao gerar o link de pagamento. Tente novamente.');
        button.textContent = originalText;
      }
    } catch (error) {
      console.error('Falha ao processar a assinatura:', error);
      alert('Não foi possível iniciar o processo de assinatura. Verifique o console para mais detalhes.');
      button.textContent = originalText;
    } finally {
      this.isLoading = false;
      if (button.textContent === 'Aguarde...') { // Só reabilita se não houve redirecionamento
          button.disabled = false;
      }
    }
  }

  /**
   * Lida com a assinatura do plano gratuito.
   */
  handleFreeSubscription() {
    console.log('Usuário selecionou o plano gratuito.');
    alert('Plano gratuito ativado com sucesso!');
    // Lógica futura: Chamar um service para registrar a ativação do plano gratuito no backend.
  }
}