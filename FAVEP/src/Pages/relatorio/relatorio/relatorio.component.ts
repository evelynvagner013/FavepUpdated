import { Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Subscription } from 'rxjs';

// --- SERVIÇOS ---
import { DashboardDataService } from '../../../services/dashboard-data.service';
import { AuthService } from '../../../services/auth.service';
// CORREÇÃO: Importa 'Financeiro' em vez de 'Movimentacao'
import { Usuario, Propriedade, Producao, Financeiro } from '../../../models/api.models';

registerLocaleData(localePt);

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FormsModule
  ],
  providers: [DatePipe],
  templateUrl: './relatorio.component.html',
  styleUrl: './relatorio.component.css'
})
export class RelatorioComponent implements OnInit, OnDestroy {

  menuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';

  propriedades: Propriedade[] = [];
  producoes: Producao[] = [];
  // CORREÇÃO: Usa o tipo 'Financeiro'
  movimentacoes: Financeiro[] = [];

  selectedPropertyId: string = 'todos';
  startDate: string = '';
  endDate: string = '';
  selectedCropType: string = 'todos';
  reportType: 'productivity' | 'financial' | 'crop_production' = 'productivity';

  availableCropTypes: { value: string, text: string }[] = [{ value: 'todos', text: 'Todas as Culturas' }];

  @ViewChild('reportChartCanvas', { static: true }) reportChartCanvas!: ElementRef<HTMLCanvasElement>;
  reportChart: Chart | null = null;

  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private authService: AuthService,
    private datePipe: DatePipe
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoPerfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });
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
        const { propriedades, producoes, movimentacoes } = data;
        this.propriedades = propriedades;
        this.producoes = producoes;
        // CORREÇÃO: Atribui os dados ao array de 'Financeiro' e garante que a data seja um objeto Date
        this.movimentacoes = movimentacoes.map(rec => ({ ...rec, data: new Date(rec.data) }));

        const uniqueCropTypes = new Set<string>(this.producoes.map(prod => prod.cultura));
        this.availableCropTypes = [{ value: 'todos', text: 'Todas as Culturas' }];
        Array.from(uniqueCropTypes).sort().forEach(type => {
          this.availableCropTypes.push({ value: type, text: type });
        });

        this.gerarRelatorio();
      },
      error: (err) => {
        console.error('Erro ao carregar dados iniciais para o relatório:', err);
      }
    });
  }

  gerarRelatorio(): void {
    if (this.reportChart) {
      this.reportChart.destroy();
      this.reportChart = null;
    }

    const ctx = this.reportChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Contexto 2D do canvas não pôde ser obtido!');
      return;
    }

    let labels: string[] = [];
    let datasets: any[] = [];
    let chartTitle: string = '';
    let chartType: 'bar' | 'line' | 'pie' = 'bar';

    const filteredProducoes = this.producoes.filter(prod => {
      // CORREÇÃO: Comparando 'prod.propriedadeId' com 'selectedPropertyId'
      const isPropertyMatch = this.selectedPropertyId === 'todos' || prod.propriedadeId === this.selectedPropertyId;
      const isCropTypeMatch = this.selectedCropType === 'todos' || prod.cultura === this.selectedCropType;
      const isDateRangeMatch = (!this.startDate || new Date(prod.data) >= new Date(this.startDate)) &&
                                 (!this.endDate || new Date(prod.data) <= new Date(this.endDate));
      return isPropertyMatch && isCropTypeMatch && isDateRangeMatch;
    });

    const filteredMovimentacoes = this.movimentacoes.filter(mov => {
      // CORREÇÃO: Comparando 'mov.propriedadeId' com 'selectedPropertyId'
      const isPropertyMatch = this.selectedPropertyId === 'todos' || mov.propriedadeId === this.selectedPropertyId;
      const isDateRangeMatch = (!this.startDate || mov.data >= new Date(this.startDate)) &&
                                 (!this.endDate || mov.data <= new Date(this.endDate));
      return isPropertyMatch && isDateRangeMatch;
    });

    switch (this.reportType) {
      case 'productivity':
        chartTitle = 'Produtividade por Cultura (kg/ha)';
        chartType = 'bar';
        const productivityData: { [key: string]: { totalYield: number, totalArea: number } } = {};
        filteredProducoes.forEach(prod => {
          if (!productivityData[prod.cultura]) {
            productivityData[prod.cultura] = { totalYield: 0, totalArea: 0 };
          }
          productivityData[prod.cultura].totalYield += (prod.produtividade || 0);
          // CORREÇÃO: Buscando a área da propriedade pelo 'propriedadeId' e usando 'area_ha'
          const propArea = this.propriedades.find(p => p.id === prod.propriedadeId)?.area_ha || 0;
          productivityData[prod.cultura].totalArea += propArea;
        });
        labels = Object.keys(productivityData).sort();
        const productivityValues = labels.map(label => {
          const item = productivityData[label];
          return item.totalArea > 0 ? item.totalYield / item.totalArea : 0;
        });
        datasets = [{
          label: 'Produtividade (kg/ha)',
          data: productivityValues,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        }];
        break;

      case 'financial':
        chartTitle = 'Composição Financeira';
        chartType = 'pie';
        const totalRevenue = filteredMovimentacoes.filter(r => r.tipo === 'receita').reduce((sum, r) => sum + r.valor, 0);
        const totalExpense = filteredMovimentacoes.filter(r => r.tipo === 'despesa').reduce((sum, r) => sum + r.valor, 0);
        labels = ['Receitas', 'Despesas'];
        datasets = [{
          label: 'Valor (R$)',
          data: [totalRevenue, totalExpense],
          backgroundColor: [
            'rgba(40, 167, 69, 0.7)',
            'rgba(220, 53, 69, 0.7)'
          ],
          borderColor: [
            'rgba(40, 167, 69, 1)',
            'rgba(220, 53, 69, 1)'
          ],
          borderWidth: 1
        }];
        break;

      case 'crop_production':
        chartTitle = 'Produção Total por Cultura (kg)';
        chartType = 'bar';
        const cropProductionData: { [key: string]: number } = {};
        filteredProducoes.forEach(prod => {
          if (!cropProductionData[prod.cultura]) {
            cropProductionData[prod.cultura] = 0;
          }
          cropProductionData[prod.cultura] += (prod.produtividade || 0);
        });
        labels = Object.keys(cropProductionData).sort();
        const productionValues = labels.map(label => cropProductionData[label]);
        datasets = [{
          label: 'Produção (kg)',
          data: productionValues,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        }];
        break;
    }

    this.reportChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: chartTitle, font: { size: 16 } },
          legend: {
            display: datasets.length > 1 || chartType === 'pie',
            position: 'top',
          }
        },
        scales: chartType !== 'pie' ? {
          y: {
            beginAtZero: true,
            title: { display: true, text: this.getAxisYTitle(this.reportType) },
            ticks: {
              callback: (value: any) => {
                if (this.reportType === 'financial') {
                  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
                }
                return new Intl.NumberFormat('pt-BR').format(value);
              }
            }
          },
          x: {
            title: { display: true, text: this.getAxisXTitle(this.reportType) }
          }
        } : {}
      }
    });
  }

  getAxisYTitle(reportType: string): string {
    const titles: { [key: string]: string } = {
      productivity: 'Produtividade (kg/ha)',
      financial: 'Valor (R$)',
      crop_production: 'Produção (kg)'
    };
    return titles[reportType] || 'Valor';
  }

  getAxisXTitle(reportType: string): string {
    const titles: { [key:string]: string } = {
      productivity: 'Culturas',
      financial: 'Categorias',
      crop_production: 'Culturas'
    };
    return titles[reportType] || '';
  }

  alternarMenu() {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent) {
    const alvo = event.target as HTMLElement;
    if (!alvo.closest('.menu-toggle') && !alvo.closest('.main-menu')) {
      this.menuAberto = false;
    }
  }
}
