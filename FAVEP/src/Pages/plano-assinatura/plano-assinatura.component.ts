import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, lastValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/api.models';
import { MenuCentralComponent } from "../menu-central/menu-central.component";
import { MenuLateralComponent } from "../menu-lateral/menu-lateral.component";
import { MercadoPagoService } from '../../services/mercadopago.service';

// Interfaces para tipagem
interface MercadoPagoResponse {
  init_point: string;
}

interface Plan {
  tipo: string;
  valor: number;
}

@Component({
  selector: 'app-plano-assinatura',
  standalone: true,
  imports: [CommonModule, MenuCentralComponent, MenuLateralComponent],
  templateUrl: './plano-assinatura.component.html',
  styleUrls: ['./plano-assinatura.component.css']
})
export class PlanoAssinaturaComponent implements OnInit, OnDestroy {
  
  planoAtual: any;
  isLoading = false;
  private userSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private mercadoPagoService: MercadoPagoService // Injete o serviço do Mercado Pago
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe((user: Usuario | null) => {
      if (user) {
        // Aqui você pode adicionar a lógica para buscar o plano atual do usuário na sua API
      }
    });

    // Simulação do carregamento do plano atual do usuário
    this.loadCurrentPlan();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  loadCurrentPlan(): void {
    // Apenas uma simulação. O ideal é buscar essa informação do seu backend.
    setTimeout(() => {
      this.planoAtual = {
        nome: 'Mensal',
        preco: 'R$ 500,00/mês',
        descricao: 'Acesso a recursos de gerenciamento e relatórios básicos.'
      };
    }, 500); 
  }

  // ESTA É A FUNÇÃO QUE ESTAVA FALTANDO
  async handleSubscription(plan: Plan, event: MouseEvent) {
    if (plan.valor === 0) {
      alert('Troca para o plano gratuito concluída!');
      // Aqui você chamaria um serviço para atualizar o plano do usuário no seu backend
      return;
    }

    this.isLoading = true;
    const button = event.target as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Aguarde...';
    button.disabled = true;

    try {
      const request$ = this.mercadoPagoService.criarAssinatura(plan.tipo, plan.valor);
      const data: MercadoPagoResponse = await lastValueFrom(request$);

      if (data && data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Ocorreu um erro ao gerar o link de pagamento. Tente novamente.');
        button.textContent = originalText;
        button.disabled = false;
      }
    } catch (error) {
      console.error('Falha ao processar a troca de assinatura:', error);
      alert('Não foi possível iniciar o processo de troca.');
      button.textContent = originalText;
      button.disabled = false;
    } finally {
      this.isLoading = false;
    }
  }
}