import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// --- IMPORTAÇÕES ADICIONADAS ---
import { ActivatedRoute, Router } from '@angular/router';
// --- FIM DAS IMPORTAÇÕES ---
import { AuthService } from '../../services/auth.service';
import { MercadoPagoService } from '../../services/mercadopago.service';
import { MenuLateralComponent } from "../menu-lateral/menu-lateral.component";
import { RouterLink } from '@angular/router';

// Interface para os cards de plano
interface PlanoDisplay {
  id: 'gratis' | 'base' | 'gold';
  nome: string;
  preco: string;
  descricao: string;
  features: string[];
  valorBackend: number;
  descricaoBackend: string;
}

@Component({
  selector: 'app-plano-assinatura',
  standalone: true,
  imports: [
    CommonModule,
    MenuLateralComponent,
    RouterLink
  ],
  templateUrl: './plano-assinatura.component.html',
  styleUrls: ['./plano-assinatura.component.css']
})
export class PlanoAssinaturaComponent implements OnInit {

  planoAtualId: 'gratis' | 'base' | 'gold' = 'gratis';
  planoAtualDisplay: PlanoDisplay | null = null;
  planosDisponiveis: PlanoDisplay[] = [];
  isLoading: boolean = false;

  // --- NOVAS PROPRIEDADES PARA FEEDBACK ---
  paymentStatus: 'success' | 'failure' | 'pending' | null = null;
  statusMessage: string | null = null;
  // --- FIM DAS NOVAS PROPRIEDADES ---

  private todosOsPlanos: { [key: string]: PlanoDisplay } = {
    'gratis': {
      id: 'gratis',
      nome: 'Plano Grátis (Trial)',
      preco: 'R$ 0,00',
      descricao: 'Acesso por 7 dias para avaliação.',
      features: ['Acesso de 1 membro', '7 dias de teste', 'Acesso total ao site'],
      valorBackend: 0,
      descricaoBackend: 'Plano Grátis'
    },
    'base': {
      id: 'base',
      nome: 'Plano Base',
      preco: 'R$ 150,00/mês', // SEU PREÇO REAL
      descricao: 'Funcionalidades essenciais para começar.',
      features: ['Limite de 1 membro', 'Limitado a 5 produções', 'Sem acesso a relatórios'],
      valorBackend: 150.00, // SEU PREÇO REAL
      descricaoBackend: 'Plano Base'
    },
    'gold': {
      id: 'gold',
      nome: 'Plano Gold',
      preco: 'R$ 300,00/mês', // SEU PREÇO REAL
      descricao: 'Acesso completo para máxima produtividade.',
      features: ['Membros ilimitados', 'Produções ilimitadas', 'Acesso total a relatórios'],
      valorBackend: 300.00, // SEU PREÇO REAL
      descricaoBackend: 'Plano Gold'
    }
  };

  constructor(
    private authService: AuthService,
    private mercadopagoService: MercadoPagoService,
    // --- SERVIÇOS INJETADOS ---
    private route: ActivatedRoute, // Para ler a URL
    private router: Router // Para limpar a URL
    // --- FIM DOS SERVIÇOS ---
  ) { }

  ngOnInit(): void {
    // --- LÓGICA ADICIONADA ---
    this.checkPaymentStatus(); // Verifica se o usuário voltou de um pagamento
    // --- FIM DA LÓGICA ---

    this.planoAtualId = this.authService.getPlanoAtivo() || 'gratis';
    this.planoAtualDisplay = this.todosOsPlanos[this.planoAtualId];
    this.definirPlanosDisponiveis();
  }

  // --- NOVA FUNÇÃO ---
  private checkPaymentStatus(): void {
    this.route.queryParams.subscribe(params => {
      const status = params['status'];

      if (status === 'success') {
        this.paymentStatus = 'success';
        this.statusMessage = 'Pagamento aprovado com sucesso! Seu novo plano será ativado assim que o sistema processar (geralmente instantâneo).';
        // Atualiza a visualização do plano (pode levar alguns segundos para o webhook atualizar)
        this.refreshPlanData();
      }
      else if (status === 'failure') {
        this.paymentStatus = 'failure';
        this.statusMessage = 'Ocorreu uma falha ao processar seu pagamento. Por favor, tente novamente ou use outro método de pagamento.';
      }
      else if (status === 'pending') {
        this.paymentStatus = 'pending';
        this.statusMessage = 'Seu pagamento está pendente de processamento. Avisaremos assim que for concluído.';
      }

      // Limpa os parâmetros da URL para que a mensagem suma se o usuário recarregar
      if (status) {
        // Atraso leve para garantir que a mensagem seja exibida
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: null, pref_id: null },
            queryParamsHandling: 'merge', // 'merge' preserva outros params, 'null' remove
            replaceUrl: true
          });
        }, 100); // 100ms de atraso
      }
    });
  }

  // --- NOVA FUNÇÃO (Simples) ---
  // Apenas recarrega os dados do auth.service, que o webhook deve ter atualizado
  private refreshPlanData(): void {
    // O ideal seria ter uma função authService.refreshUserData()
    // Por enquanto, apenas recarregamos o que temos:
    console.log('Recarregando dados do plano...');

    // AVISO: A forma ideal de fazer isso seria o auth.service ter uma
    // função que busca os dados do usuário no backend novamente.
    // Como não temos isso, apenas redefinimos o plano:

    // Simplesmente recarregamos os dados do localStorage (que o login atualizou)
    const usuario = this.authService.getUser();
    if(usuario) {
       this.authService.setUser(usuario); // Dispara o BehaviorSubject
    }

    // Recarrega o componente
    this.planoAtualId = this.authService.getPlanoAtivo() || 'gratis';
    this.planoAtualDisplay = this.todosOsPlanos[this.planoAtualId];
    this.definirPlanosDisponiveis();
  }
  // --- FIM DAS NOVAS FUNÇÕES ---


  definirPlanosDisponiveis(): void {
    this.planosDisponiveis = [];

    switch (this.planoAtualId) {
      case 'gratis':
        this.planosDisponiveis.push(this.todosOsPlanos['base']);
        this.planosDisponiveis.push(this.todosOsPlanos['gold']);
        break;
      case 'base':
        this.planosDisponiveis.push(this.todosOsPlanos['gold']);
        break;
      case 'gold':
        this.planosDisponiveis.push(this.todosOsPlanos['base']);
        break;
    }
  }

  assinarPlano(plano: PlanoDisplay): void {
    if (plano.id === 'gratis' || plano.valorBackend === 0) {
      console.log('Ativando plano de teste...');
      return;
    }

    this.isLoading = true;

    if (this.planoAtualId === 'gold' && plano.id === 'base') {
      const confirmDowngrade = confirm(
        "Atenção: Ao mudar para o Plano Base, todos os membros " +
        "adicionais (se houver) perderão o acesso. Somente a sua conta (pagante) " +
        "permanecerá ativa. Deseja continuar?"
      );
      if (!confirmDowngrade) {
        this.isLoading = false;
        return;
      }
    }

    const dadosPagamento = {
      descricao: plano.descricaoBackend,
      valor: plano.valorBackend
    };

    this.mercadopagoService.createPreference(dadosPagamento).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.init_point) {
          window.location.href = response.init_point;
        } else {
          console.error('Resposta inválida do Mercado Pago', response);
          alert('Não foi possível gerar o link de pagamento. Tente novamente.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erro ao gerar link de pagamento:', err);
        alert('Erro ao conectar com o sistema de pagamento. Verifique o console.');
      }
    });
  }
}
