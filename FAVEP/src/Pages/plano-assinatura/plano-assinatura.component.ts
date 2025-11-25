import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  dataAtivacao?: Date | string;
  dataExpiracao?: Date | string;
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

  paymentStatus: 'success' | 'failure' | 'pending' | null = null;
  statusMessage: string | null = null;
  planoAtivoCompleto: any = null; // Para guardar o objeto plano com as datas do DB

  // --- ADIÇÃO: Estados para o Modal de Confirmação ---
  showConfirmationModal: boolean = false;
  planoToChange: PlanoDisplay | null = null;
  confirmationMessage: string = '';
  // --- FIM DA ADIÇÃO ---

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
      features: ['Limite de 1 propriedade', 'Limitado a 5 produções', 'Sem acesso ao convite de usuários', 'Sem acesso a relatórios'],
      valorBackend: 150.00, // SEU PREÇO REAL
      descricaoBackend: 'Plano Base'
    },
    'gold': {
      id: 'gold',
      nome: 'Plano Gold',
      preco: 'R$ 300,00/mês', // SEU PREÇO REAL
      descricao: 'Acesso completo para máxima produtividade.',
      features: ['Propriedades ilimitadas', 'Produções ilimitadas', 'Acesso total a relatórios'],
      valorBackend: 300.00, // SEU PREÇO REAL
      descricaoBackend: 'Plano Gold'
    }
  };

  constructor(
    private authService: AuthService,
    private mercadopagoService: MercadoPagoService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkPaymentStatus();
    this.loadCurrentPlan();
  }

  private checkPaymentStatus(): void {
    this.route.queryParams.subscribe(params => {
      const status = params['status'];

      if (status === 'success') {
        this.paymentStatus = 'success';
        this.statusMessage = 'Pagamento aprovado com sucesso! Seu novo plano será ativado assim que o sistema processar (geralmente instantâneo).';
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

      if (status) {
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: null, pref_id: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }, 100);
      }
    });
  }

  private loadCurrentPlan(): void {
    this.planoAtualId = this.authService.getPlanoAtivo() || 'gratis';
    const basePlan = this.todosOsPlanos[this.planoAtualId];

    const user = this.authService.getUser();

    if (user && user.planos && user.planos.length > 0) {
        this.planoAtivoCompleto = user.planos[0];

        this.planoAtualDisplay = {
            ...basePlan,
            dataAtivacao: this.planoAtivoCompleto.dataAtivacao,
            dataExpiracao: this.planoAtivoCompleto.dataExpiracao
        };
    } else {
        this.planoAtualDisplay = basePlan;
        this.planoAtivoCompleto = null;
    }

    this.definirPlanosDisponiveis();
  }

  formatDate(dateInput: Date | string | undefined): string {
    if (!dateInput) return 'N/A';

    let date: Date;
    if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else {
        date = dateInput;
    }

    if (isNaN(date.getTime())) {
      return 'Data Inválida';
    }

    return date.toLocaleDateString('pt-BR');
  }

  private refreshPlanData(): void {
    console.log('Recarregando dados do plano...');
    const usuario = this.authService.getUser();
    if(usuario) {
       this.authService.setUser(usuario);
    }
    this.loadCurrentPlan();
  }

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

    if (this.isLoading) return;

    if (plano.id === 'gratis' && this.planoAtualId === 'gratis') {
        console.log('Ativando plano de teste...');
        return;
    }

    let confirmationMessage = `Você está prestes a mudar do seu plano atual (${this.planoAtualDisplay?.nome}) para o ${plano.nome}. Deseja confirmar a mudança?`;

    // Lógica para Downgrade de Gold para Base
    if (this.planoAtualId === 'gold' && plano.id === 'base') {
      confirmationMessage =
        "Atenção: Você está fazendo um Downgrade. Ao mudar para o Plano Base, todos os membros " +
        "adicionais (se houver) perderão o acesso. Somente a sua conta (pagante) " +
        "permanecerá ativa. Deseja continuar com o Downgrade?";
    }

    // Confirmação para mudar do pago para o grátis
    if (plano.id === 'gratis' && this.planoAtualId !== 'gratis') {
         confirmationMessage = `Atenção: Você está prestes a mudar do Plano Pago (${this.planoAtualDisplay?.nome}) para o Plano Grátis (Trial). Seu plano atual será mantido até ${this.formatDate(this.planoAtualDisplay?.dataExpiracao)}, e sua conta passará a seguir as limitações do Plano Grátis. Deseja confirmar?`;
    }

    // Configura o modal para aparecer
    this.confirmationMessage = confirmationMessage;
    this.planoToChange = plano;
    this.showConfirmationModal = true;
  }

  // --- NOVA FUNÇÃO: Cancela a ação de mudança de plano ---
  cancelPlanChange(): void {
    this.showConfirmationModal = false;
    this.planoToChange = null;
    this.confirmationMessage = '';
  }

  // --- NOVA FUNÇÃO: Confirma a ação e inicia o pagamento ---
  confirmPlanChange(): void {
    const plano = this.planoToChange;

    if (!plano || this.isLoading) {
      this.cancelPlanChange();
      return;
    }

    // Se for o Plano Grátis
    if (plano.id === 'gratis' || plano.valorBackend === 0) {
        console.log(`Usuário confirmou a troca para o Plano Grátis.`);
        alert('Troca para o Plano Grátis solicitada. O sistema será atualizado em breve.');
        this.cancelPlanChange();
        return;
    }

    // Inicia o processo de pagamento
    this.isLoading = true;
    this.showConfirmationModal = false; // Fecha o modal antes de começar o loading principal

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
        this.planoToChange = null;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erro ao gerar link de pagamento:', err);
        alert('Erro ao conectar com o sistema de pagamento. Verifique o console.');
        this.planoToChange = null;
      }
    });
  }
}
