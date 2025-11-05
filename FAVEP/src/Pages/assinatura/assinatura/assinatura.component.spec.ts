import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { MercadoPagoService } from '../../../services/mercadopago.service';
import { MenuCentralComponent } from "../../menu-central/menu-central.component";
import { MenuLateralComponent } from "../../menu-lateral/menu-lateral.component";
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/api.models';

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
  imports: [CommonModule, MenuCentralComponent, MenuLateralComponent, DatePipe],
  templateUrl: './assinatura.component.html',
  styleUrls: ['./assinatura.component.css']
})
export class AssinaturaComponent implements OnInit, OnDestroy {

  isLoading = false;
  isLoadingPlan = true;

  planoAtual: string | null = null;
  dataContratacao: Date | null = null;

  private userSubscription?: Subscription;
  private currentUser: Usuario | null = null;

  constructor(
    private mercadoPagoService: MercadoPagoService,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.isLoadingPlan = true;

    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;

      // 🔹 Mantido o comportamento original (sem alterar valores)
      if (user) {
        this.planoAtual = null;
        this.dataContratacao = null;
      } else {
        this.planoAtual = null;
        this.dataContratacao = null;
      }

      this.isLoadingPlan = false;
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  async handleSubscription(plan: Plan, event: MouseEvent) {
    if (plan.valor === 0) {
      // É o plano gratuito (Trial)
      await this.handleFreeSubscription(plan);
      return;
    }

    this.isLoading = true;
    const button = event.target as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Aguarde...';
    button.disabled = true;

    try {
      // --- CORREÇÃO AQUI ---
      // 1. O método agora é 'createPreference'
      // 2. Ele espera um objeto { descricao, valor }
      const dadosPagamento = {
        descricao: plan.tipo, // O backend espera 'descricao'
        valor: plan.valor
      };
      // Usando o nome correto do método
      const request$ = this.mercadoPagoService.createPreference(dadosPagamento); 
      // --- FIM DA CORREÇÃO ---

      const data: MercadoPagoResponse = await lastValueFrom(request$);

      if (data && data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Ocorreu um erro ao gerar o link de pagamento. Tente novamente.');
        button.textContent = originalText;
        button.disabled = false;
      }
    } catch (error) {
      alert('Não foi possível iniciar o processo de assinatura.');
      button.textContent = originalText;
      button.disabled = false;
    } finally {
      this.isLoading = false;
    }
  }

  async handleFreeSubscription(plan: Plan) {
    if (!this.currentUser) {
      alert("Você precisa estar logado para selecionar um plano.");
      return;
    }

    this.isLoading = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.planoAtual = plan.tipo;
      this.dataContratacao = new Date();
      alert('Plano gratuito ativado com sucesso!');
    } catch {
      alert('Não foi possível ativar o plano gratuito.');
    } finally {
      this.isLoading = false;
    }
  }
}