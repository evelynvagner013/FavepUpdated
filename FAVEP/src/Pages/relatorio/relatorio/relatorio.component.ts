import { Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables, ChartType } from 'chart.js';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Subscription } from 'rxjs';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- SERVIÇOS E MODELOS ---
import { DashboardDataService } from '../../../services/dashboard-data.service';
import { AuthService } from '../../../services/auth.service';
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
  styleUrls: ['./relatorio.component.css']
})
export class RelatorioComponent implements OnInit, OnDestroy {
  // --- Propriedades do Componente ---
  menuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
  
  // --- Listas de Dados Brutos ---
  propriedades: Propriedade[] = [];
  private todasProducoes: Producao[] = [];
  private todasMovimentacoes: Financeiro[] = [];
  
  // --- Controles de Filtro ---
  selectedPropertyId: string = 'todos';
  startDate: string = '';
  endDate: string = '';
  selectedCropType: string = 'todos';
  reportType: 'productivity' | 'financial' | 'crop_production' = 'productivity';
  
  availableCropTypes: { value: string, text: string }[] = [];
  
  @ViewChild('reportChartCanvas', { static: true }) reportChartCanvas!: ElementRef<HTMLCanvasElement>;
  reportChart: Chart | null = null;
  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private authService: AuthService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });
    this.carregarDadosIniciais();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  carregarDadosIniciais(): void {
    this.dashboardDataService.carregarDadosDashboard().subscribe({
      next: (data) => {
        const { propriedades, producoes, movimentacoes } = data;
        this.propriedades = propriedades;
        this.todasProducoes = producoes;
        this.todasMovimentacoes = movimentacoes.map(rec => ({ ...rec, data: new Date(rec.data) }));
        
        const uniqueCropTypes = new Set<string>(this.todasProducoes.map(prod => prod.cultura));
        this.availableCropTypes = Array.from(uniqueCropTypes).sort().map(type => ({ value: type, text: type }));
        
        this.gerarRelatorio(); // Gera o relatório inicial com todos os dados
      },
      error: (err) => console.error('Erro ao carregar dados iniciais para o relatório:', err)
    });
  }

  gerarRelatorio(): void {
    this.reportChart?.destroy();
    const ctx = this.reportChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // --- LÓGICA DE FILTRAGEM ---
    let filteredProducoes = this.todasProducoes;
    let filteredMovimentacoes = this.todasMovimentacoes;

    if (this.selectedPropertyId !== 'todos') {
        filteredProducoes = filteredProducoes.filter(prod => prod.propriedadeId === this.selectedPropertyId);
        filteredMovimentacoes = filteredMovimentacoes.filter(mov => mov.propriedadeId === this.selectedPropertyId);
    }
    
    if (this.reportType !== 'financial' && this.selectedCropType !== 'todos') {
        filteredProducoes = filteredProducoes.filter(prod => prod.cultura === this.selectedCropType);
    }

    if (this.reportType === 'financial') {
        filteredMovimentacoes = filteredMovimentacoes.filter(mov => {
            const movDate = new Date(mov.data);
            const start = this.startDate ? new Date(this.startDate + 'T00:00:00') : null; // Adiciona T00:00:00 para evitar problemas de fuso
            const end = this.endDate ? new Date(this.endDate + 'T23:59:59') : null; // Adiciona T23:59:59 para incluir o dia todo
            
            if (start && movDate < start) return false;
            if (end && movDate > end) return false;
            return true;
        });
    }

    let labels: string[] = [];
    let datasets: any[] = [];
    let chartTitle: string = '';
    let chartType: ChartType = 'bar';

    switch (this.reportType) {
      case 'productivity':
        chartTitle = 'Produtividade por Cultura (kg/ha)';
        const productivityData = new Map<string, { totalYield: number, totalArea: number }>();
        filteredProducoes.forEach(prod => {
          if (!productivityData.has(prod.cultura)) {
            productivityData.set(prod.cultura, { totalYield: 0, totalArea: 0 });
          }
          const data = productivityData.get(prod.cultura)!;
          data.totalYield += (prod.produtividade * prod.areaproducao); // Produção total = produtividade * area
          data.totalArea += prod.areaproducao;
        });
        labels = Array.from(productivityData.keys()).sort();
        const productivityValues = labels.map(label => {
          const item = productivityData.get(label)!;
          return item.totalArea > 0 ? item.totalYield / item.totalArea : 0;
        });
        datasets = [{ label: 'Produtividade Média (kg/ha)', data: productivityValues, backgroundColor: 'rgba(75, 192, 192, 0.6)' }];
        break;

      case 'financial':
        chartTitle = 'Resultado Financeiro';
        chartType = 'bar';
        const totalRevenue = filteredMovimentacoes.filter(r => r.tipo === 'receita').reduce((sum, r) => sum + r.valor, 0);
        const totalExpense = filteredMovimentacoes.filter(r => r.tipo === 'despesa').reduce((sum, r) => sum + r.valor, 0);
        labels = ['Receitas', 'Despesas', 'Lucro/Prejuízo'];
        datasets = [{
          label: 'Valor (R$)',
          data: [totalRevenue, totalExpense, totalRevenue - totalExpense],
          backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(0, 123, 255, 0.7)'],
        }];
        break;

      case 'crop_production':
        chartTitle = 'Produção Total por Cultura (kg)';
        const cropProductionData = new Map<string, number>();
        filteredProducoes.forEach(prod => {
          const currentTotal = cropProductionData.get(prod.cultura) || 0;
          const productionOfThisEntry = prod.produtividade * prod.areaproducao; // Produção total
          cropProductionData.set(prod.cultura, currentTotal + productionOfThisEntry);
        });
        labels = Array.from(cropProductionData.keys()).sort();
        datasets = [{ label: 'Produção Total (kg)', data: labels.map(label => cropProductionData.get(label)), backgroundColor: 'rgba(153, 102, 255, 0.6)' }];
        break;
    }

    this.reportChart = new Chart(ctx, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: chartTitle, font: { size: 18 } }
        }
      }
    });
  }

  // --- Métodos Auxiliares e de UI ---

  async exportarRelatorioPDF(): Promise<void> {
    const reportContentElement = document.getElementById('report-content');
    if (!reportContentElement) {
      console.error("Elemento 'report-content' não encontrado para exportar o PDF.");
      return;
    }

    document.body.classList.add('generating-pdf');
    
    const canvas = await html2canvas(reportContentElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

    document.body.classList.remove('generating-pdf');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
    const finalImgWidth = canvas.width * ratio * 0.95;
    const finalImgHeight = canvas.height * ratio * 0.95;
    const x = (pdfWidth - finalImgWidth) / 2;
    const y = (pdfHeight - finalImgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);

    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Relatorio_FAVEP_${this.reportType}_${dataAtual}.pdf`;
    
    pdf.save(nomeArquivo);
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.menuAberto && !target.closest('.main-menu') && !target.closest('.menu-toggle')) {
      this.menuAberto = false;
    }
  }
}