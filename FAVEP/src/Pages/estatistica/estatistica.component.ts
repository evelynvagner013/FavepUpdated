import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Subscription } from 'rxjs';

// --- SERVIÇOS E MODELOS ---
import { DashboardDataService } from '../../services/dashboard-data.service';
import { AuthService } from '../../services/auth.service';
import { Propriedade, Producao, Financeiro, Usuario } from '../../models/api.models';
import { UsuarioService } from '../../services/usuario.service';
import { MenuLateralComponent } from "../menu-lateral/menu-lateral.component";
import { MenuCentralComponent } from "../menu-central/menu-central.component";

registerLocaleData(localePt);

@Component({
  selector: 'app-estatistica',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MenuLateralComponent,
    MenuCentralComponent
],
  templateUrl: './estatistica.component.html',
  styleUrls: ['./estatistica.component.css']
})
export class EstatisticaComponent implements OnInit, OnDestroy {


  @ViewChild('produtividadeChart') produtividadeChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('financeiroChart') financeiroChart!: ElementRef<HTMLCanvasElement>;

  clima: any = null;
  climaErro: string = '';
  
 
  // --- Listas de Dados (Brutos e Filtrados) ---
  private todasProducoes: Producao[] = [];
  private todasMovimentacoes: Financeiro[] = [];
  propriedades: Propriedade[] = [];
  
  selectedPropertyId: string = 'todos';

  // --- Propriedades para os Cards e Gráficos ---
  totalPropriedades: number = 0;
  areaTotal: number = 0;
  producaoAtual: number = 0;
  resultadoFinanceiro: number = 0;
  dadosProdutividade: number[] = [];
  culturas: string[] = [];
  meses: string[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  dadosReceitasMensais: number[] = new Array(12).fill(0);
  dadosDespesasMensais: number[] = new Array(12).fill(0);

  // --- Indicadores de dados para exibição dos gráficos ---
  hasProdutividadeData: boolean = false;
  hasFinanceiroData: boolean = false;

  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private authService: AuthService,
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.carregarDadosIniciais();
  }
 

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
  
  carregarDadosIniciais(): void {
    this.dashboardDataService.carregarDadosDashboard().subscribe({
      next: (data) => {
        this.propriedades = data.propriedades;
        this.todasProducoes = data.producoes;
        this.todasMovimentacoes = data.movimentacoes;
        this.processarDadosEstatisticos();
        
        if (this.propriedades.length > 0) {
          const primeiraPropriedade = this.propriedades[0];
        }
      },
      error: (err) => console.error('Erro ao carregar dados do dashboard:', err)
    });
  }

  processarDadosEstatisticos(): void {
    let producoesFiltradas: Producao[];
    let movimentacoesFiltradas: Financeiro[];
    let propriedadesFiltradas: Propriedade[];

    // --- LÓGICA DE FILTRO CORRIGIDA ---
    if (this.selectedPropertyId === 'todos') {
      // Para "Todas", considera apenas propriedades ATIVAS
      propriedadesFiltradas = this.propriedades.filter(p => p.status === 'ativo');
      const idsPropriedadesAtivas = new Set(propriedadesFiltradas.map(p => p.id));
      
      producoesFiltradas = this.todasProducoes.filter(p => idsPropriedadesAtivas.has(p.propriedadeId));
      movimentacoesFiltradas = this.todasMovimentacoes.filter(m => idsPropriedadesAtivas.has(m.propriedadeId));
    } else {
      // Para uma propriedade específica, exibe seus dados independentemente do status
      const selectedId = this.selectedPropertyId;
      propriedadesFiltradas = this.propriedades.filter(p => p.id === selectedId);
      producoesFiltradas = this.todasProducoes.filter(p => p.propriedadeId === selectedId);
      movimentacoesFiltradas = this.todasMovimentacoes.filter(m => m.propriedadeId === selectedId);
    }
    
    this.totalPropriedades = propriedadesFiltradas.length;
    this.areaTotal = propriedadesFiltradas.reduce((sum, prop) => sum + (prop.area_ha || 0), 0);

    const producaoPorCultura: { [key: string]: number } = {};
    this.producaoAtual = producoesFiltradas.reduce((sum, prod) => {
      if (prod.quantidade) {
        producaoPorCultura[prod.cultura] = (producaoPorCultura[prod.cultura] || 0) + prod.quantidade;
        return sum + prod.quantidade;
      }
      return sum;
    }, 0);

    const totalReceitas = movimentacoesFiltradas.filter(m => m.tipo === 'receita').reduce((sum, m) => sum + m.valor, 0);
    const totalDespesas = movimentacoesFiltradas.filter(m => m.tipo === 'despesa').reduce((sum, m) => sum + m.valor, 0);
    this.resultadoFinanceiro = totalReceitas - totalDespesas;

    this.culturas = Object.keys(producaoPorCultura).sort();
    this.dadosProdutividade = this.culturas.map(cultura => producaoPorCultura[cultura]);

    this.dadosReceitasMensais.fill(0);
    this.dadosDespesasMensais.fill(0);
    movimentacoesFiltradas.forEach(mov => {
      const month = new Date(mov.data).getMonth();
      if (month >= 0 && month < 12) {
        if (mov.tipo === 'receita') this.dadosReceitasMensais[month] += mov.valor;
        else if (mov.tipo === 'despesa') this.dadosDespesasMensais[month] += mov.valor;
      }
    });
    
    // --- ATUALIZAÇÃO DOS INDICADORES DE DADOS ---
    this.hasProdutividadeData = this.dadosProdutividade.length > 0 && this.dadosProdutividade.some(d => d > 0);
    this.hasFinanceiroData = this.dadosReceitasMensais.some(r => r > 0) || this.dadosDespesasMensais.some(d => d > 0);

    // Adiciona um pequeno delay para garantir que a view seja atualizada antes de criar os gráficos
    setTimeout(() => this.criarGraficos(), 0);
  }

  criarGraficos(): void {
    if (this.hasProdutividadeData && this.produtividadeChart && this.produtividadeChart.nativeElement) {
      Chart.getChart(this.produtividadeChart.nativeElement)?.destroy();
      new Chart(this.produtividadeChart.nativeElement, {
        type: 'bar',
        data: {
          labels: this.culturas,
          datasets: [{
            label: 'Produção Total (kg)',
            data: this.dadosProdutividade,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    if (this.hasFinanceiroData && this.financeiroChart && this.financeiroChart.nativeElement) {
      Chart.getChart(this.financeiroChart.nativeElement)?.destroy();
      new Chart(this.financeiroChart.nativeElement, {
        type: 'bar',
        data: {
          labels: this.meses,
          datasets: [
            { label: 'Receitas', data: this.dadosReceitasMensais, backgroundColor: 'rgba(40, 167, 69, 0.6)' },
            { label: 'Despesas', data: this.dadosDespesasMensais, backgroundColor: 'rgba(220, 53, 69, 0.6)' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  let label = context.dataset.label || '';
                  if (label) { label += ': '; }
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                  }
                  return label;
                }
              }
            }
          }
        }
      });
    }
  }
}