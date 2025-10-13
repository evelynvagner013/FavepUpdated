import { Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { MenuCentralComponent } from "../../menu-central/menu-central.component";
import { MenuLateralComponent } from "../../menu-lateral/menu-lateral.component";

registerLocaleData(localePt);

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FormsModule,
    MenuCentralComponent,
    MenuLateralComponent
],
  providers: [DatePipe],
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.css']
})
export class RelatorioComponent implements OnInit, OnDestroy {

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
  
  // ALTERAÇÃO 1: Removido { static: true } para lidar com o elemento condicional (*ngIf)
  @ViewChild('reportChartCanvas') reportChartCanvas!: ElementRef<HTMLCanvasElement>;
  reportChart: Chart | null = null;
  hasChartData: boolean = false; // Flag para controlar a exibição do gráfico
  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private authService: AuthService,
    private router: Router
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
        const { propriedades, producoes, movimentacoes } = data;
        this.propriedades = propriedades;
        this.todasProducoes = producoes;
        this.todasMovimentacoes = movimentacoes.map(rec => ({ ...rec, data: new Date(rec.data as string) }));
        
        const uniqueCropTypes = new Set<string>(this.todasProducoes.map(prod => prod.cultura));
        this.availableCropTypes = Array.from(uniqueCropTypes).sort().map(type => ({ value: type, text: type }));
        
        this.gerarRelatorio();
      },
      error: (err: any) => console.error('Erro ao carregar dados iniciais para o relatório:', err)
    });
  }

  gerarRelatorio(): void {
    this.reportChart?.destroy();
    
    let filteredProducoes: Producao[] = [...this.todasProducoes];
    let filteredMovimentacoes: Financeiro[] = [...this.todasMovimentacoes];

    if (this.selectedPropertyId === 'todos') {
        const idsPropriedadesAtivas = new Set(this.propriedades.filter(p => p.status === 'ativo').map(p => p.id));
        filteredProducoes = filteredProducoes.filter(p => idsPropriedadesAtivas.has(p.propriedadeId));
        filteredMovimentacoes = filteredMovimentacoes.filter(m => idsPropriedadesAtivas.has(m.propriedadeId));
    } else {
        filteredProducoes = filteredProducoes.filter(prod => prod.propriedadeId === this.selectedPropertyId);
        filteredMovimentacoes = filteredMovimentacoes.filter(mov => mov.propriedadeId === this.selectedPropertyId);
    }
    
    if (this.reportType !== 'financial' && this.selectedCropType !== 'todos') {
        filteredProducoes = filteredProducoes.filter(prod => prod.cultura === this.selectedCropType);
    }

    if (this.reportType === 'financial') {
        filteredMovimentacoes = filteredMovimentacoes.filter(mov => {
            const movDate = new Date(mov.data);
            const start = this.startDate ? new Date(this.startDate + 'T00:00:00') : null;
            const end = this.endDate ? new Date(this.endDate + 'T23:59:59') : null;
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
          if (!productivityData.has(prod.cultura)) productivityData.set(prod.cultura, { totalYield: 0, totalArea: 0 });
          const data = productivityData.get(prod.cultura)!;
          data.totalYield += (prod.quantidade * prod.areaproducao);
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
        const totalRevenue = filteredMovimentacoes.filter(r => r.tipo === 'receita').reduce((sum, r) => sum + r.valor, 0);
        const totalExpense = filteredMovimentacoes.filter(r => r.tipo === 'despesa').reduce((sum, r) => sum + r.valor, 0);
        labels = ['Receitas', 'Despesas', 'Lucro/Prejuízo'];
        datasets = [{ label: 'Valor (R$)', data: [totalRevenue, totalExpense, totalRevenue - totalExpense], backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(0, 123, 255, 0.7)'] }];
        break;
      case 'crop_production':
        chartTitle = 'Produção Total por Cultura (kg)';
        const cropProductionData = new Map<string, number>();
        filteredProducoes.forEach(prod => {
          const currentTotal = cropProductionData.get(prod.cultura) || 0;
          cropProductionData.set(prod.cultura, currentTotal + (prod.quantidade * prod.areaproducao));
        });
        labels = Array.from(cropProductionData.keys()).sort();
        datasets = [{ label: 'Produção Total (kg)', data: labels.map(label => cropProductionData.get(label)), backgroundColor: 'rgba(153, 102, 255, 0.6)' }];
        break;
    }

    this.hasChartData = datasets.length > 0 && datasets.some(ds => ds.data.length > 0 && ds.data.some((d: number) => d !== 0));

    // ALTERAÇÃO 2: A criação do gráfico agora é adiada para garantir que o canvas exista
    if (this.hasChartData) {
      setTimeout(() => {
        const canvasEl = this.reportChartCanvas?.nativeElement;
        if (!canvasEl) return;

        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

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
      }, 0);
    }
  }

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
}