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
  
  // --- Listas Filtradas para o HTML ---
  movimentacoesFiltradas: Financeiro[] = []; 
  producoesFiltradas: Producao[] = []; // <-- NOVO: Exposto para o HTML

  // --- Controles de Filtro ---
  selectedPropertyId: string = 'todos';
  startDate: string = '';
  endDate: string = '';
  selectedCropType: string = 'todos';
  reportType: 'productivity' | 'financial' | 'crop_production' = 'productivity';
  
  availableCropTypes: { value: string, text: string }[] = [];
  
  @ViewChild('reportChartCanvas') reportChartCanvas!: ElementRef<HTMLCanvasElement>;
  reportChart: Chart | null = null;
  hasChartData: boolean = false;
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
        console.log('RELATORIO: DADOS RECEBIDOS DO SERVIÇO:', data); 

        const { propriedades, producoes, movimentacoes } = data;
        
        this.propriedades = propriedades; 
        this.todasProducoes = producoes;
        
        this.todasMovimentacoes = movimentacoes
          .map((rec: any) => ({ ...rec, data: new Date(rec.data as string) }))
          .filter((rec: any) => rec.data && !isNaN(rec.data.getTime())); 

        console.log('RELATORIO: Movimentações processadas (datas válidas):', this.todasMovimentacoes);
        
        const uniqueCropTypes = new Set<string>(this.todasProducoes.map(prod => prod.cultura));
        this.availableCropTypes = Array.from(uniqueCropTypes).sort().map(type => ({ value: type, text: type }));
        
        this.gerarRelatorio();
      },
      error: (err: any) => {
        console.error('RELATORIO: ERRO AO CARREGAR DADOS INICIAIS:', err);
      }
    });
  }

  gerarRelatorio(): void {
    this.reportChart?.destroy();
    
    // --- MUDANÇA AQUI ---
    // Usar 'this.' para expor a lista filtrada para o HTML
    this.producoesFiltradas = [...this.todasProducoes];
    this.movimentacoesFiltradas = [...this.todasMovimentacoes]; 

    // --- Filtro de Propriedade ---
    if (this.selectedPropertyId === 'todos') {
        const idsPropriedadesAtivas = new Set(this.propriedades.filter(p => p.status === 'ativo').map(p => p.id));
        // --- MUDANÇA AQUI ---
        this.producoesFiltradas = this.producoesFiltradas.filter(p => idsPropriedadesAtivas.has(p.propriedadeId));
        this.movimentacoesFiltradas = this.movimentacoesFiltradas.filter(m => idsPropriedadesAtivas.has(m.propriedadeId));
    } else {
        // --- MUDANÇA AQUI ---
        this.producoesFiltradas = this.producoesFiltradas.filter(prod => prod.propriedadeId === this.selectedPropertyId);
        this.movimentacoesFiltradas = this.movimentacoesFiltradas.filter(mov => mov.propriedadeId === this.selectedPropertyId);
    }
    
    // --- Filtro de Cultura ---
    if (this.reportType !== 'financial' && this.selectedCropType !== 'todos') {
        // --- MUDANÇA AQUI ---
        this.producoesFiltradas = this.producoesFiltradas.filter(prod => prod.cultura === this.selectedCropType);
    }

    // --- Filtro de Data ---
    if (this.reportType === 'financial') {
        this.movimentacoesFiltradas = this.movimentacoesFiltradas.filter(mov => {
            const movDate = mov.data as Date; 
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
    let chartType: ChartType = 'line';

    switch (this.reportType) {
      case 'productivity':
        chartTitle = 'Produtividade por Cultura (kg/ha)';
        chartType = 'line';
        const productivityData = new Map<string, { totalYield: number, totalArea: number }>();
        // --- MUDANÇA AQUI ---
        this.producoesFiltradas.forEach(prod => {
          if (!productivityData.has(prod.cultura)) productivityData.set(prod.cultura, { totalYield: 0, totalArea: 0 });
          const data = productivityData.get(prod.cultura)!;
          data.totalYield += ((prod.quantidade || 0) * (prod.areaproducao || 0));
          data.totalArea += (prod.areaproducao || 0);
        });
        labels = Array.from(productivityData.keys()).sort();
        const productivityValues = labels.map(label => {
          const item = productivityData.get(label)!;
          return item.totalArea > 0 ? item.totalYield / item.totalArea : 0;
        });
        
        datasets = [{ 
          label: 'Produtividade Média (kg/ha)', 
          data: productivityValues, 
          backgroundColor: 'rgba(255, 159, 64, 0.2)', 
          borderColor: 'rgba(255, 159, 64, 1)',
          fill: true,
          tension: 0.4 
        }];
        break;

      case 'financial':
        chartTitle = 'Resultado (R$) por Mês';
        chartType = 'line';
        const monthlyData = new Map<string, { receita: number, despesa: number }>();
        
        this.movimentacoesFiltradas.forEach(mov => { 
            if (!mov.data || !(mov.data instanceof Date) || isNaN(mov.data.getTime())) {
                console.warn('Movimentação pulada (data inválida ou não é Date):', mov);
                return; 
            }
            const movDate = mov.data; 
            const monthYear = movDate.toISOString().substring(0, 7); 
            
            if (!monthlyData.has(monthYear)) {
              monthlyData.set(monthYear, { receita: 0, despesa: 0 });
            }
            const data = monthlyData.get(monthYear)!;
            
            if (mov.tipo === 'receita') {
              data.receita += mov.valor;
            } else if (mov.tipo === 'despesa') {
              data.despesa += mov.valor;
            }
        });

        labels = Array.from(monthlyData.keys()).sort();
        const resultData = labels.map(label => {
            const data = monthlyData.get(label)!;
            return data.receita - data.despesa;
        });

        datasets = [{
            label: 'Resultado (R$)',
            data: resultData,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            fill: true,
            tension: 0.4
        }];
        break;

      case 'crop_production':
        chartTitle = 'Produção Total por Cultura (kg)';
        chartType = 'line';
        const cropProductionData = new Map<string, number>();
        // --- MUDANÇA AQUI ---
        this.producoesFiltradas.forEach(prod => {
          const currentTotal = cropProductionData.get(prod.cultura) || 0;
          const producaoTotalItem = (prod.quantidade || 0) * (prod.areaproducao || 0);
          cropProductionData.set(prod.cultura, currentTotal + producaoTotalItem);
        });
        labels = Array.from(cropProductionData.keys()).sort();
        
        datasets = [{ 
          label: 'Produção Total (kg)', 
          data: labels.map(label => cropProductionData.get(label)), 
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          fill: true,
          tension: 0.4
        }];
        break;
    }
    
    console.log('RELATORIO: Dados para o gráfico:', { labels, datasets });
    this.hasChartData = datasets.length > 0 && datasets.some(ds => ds.data.length > 0 && ds.data.some((d: number) => d !== 0));

    if (this.hasChartData) {
      setTimeout(() => {
        const canvasEl = this.reportChartCanvas?.nativeElement;
        if (!canvasEl) {
          console.error('RELATORIO: Canvas não encontrado!');
          return;
        }
        const ctx = canvasEl.getContext('2d');
        if (!ctx) {
          console.error('RELATORIO: Contexto 2D não encontrado!');
          return;
        }

        this.reportChart = new Chart(ctx, {
          type: chartType,
          data: { labels, datasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: chartTitle, font: { size: 18 } }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }, 0);
    } else {
      console.log('RELATORIO: Sem dados para exibir o gráfico.');
    }
  }

  // Função para buscar o nome da propriedade a partir do ID
  getNomePropriedade(id: string): string {
    if (!id) return 'Geral';
    if (!this.propriedades || this.propriedades.length === 0) {
      return 'Carregando...';
    }
    const prop = this.propriedades.find((p) => p.id === id);
    if (!prop) return 'Propriedade não encontrada';
    return prop.status === 'inativo' ? `${prop.nomepropriedade} (Desativada)` : prop.nomepropriedade;
  }

  async exportarRelatorioPDF(): Promise<void> {
    const reportContentElement = document.getElementById('report-export-area'); 
    if (!reportContentElement) {
      console.error("Elemento 'report-export-area' não encontrado para exportar o PDF.");
      return;
    }
    document.body.classList.add('generating-pdf');
    const canvas = await html2canvas(reportContentElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    document.body.classList.remove('generating-pdf');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.height / imgProps.width;
    
    let finalImgWidth = pdfWidth * 0.9;
    let finalImgHeight = finalImgWidth * imgRatio;

    if (finalImgHeight > pdfHeight * 0.95) {
      finalImgHeight = pdfHeight * 0.95;
      finalImgWidth = finalImgHeight / imgRatio;
    }

    const x = (pdfWidth - finalImgWidth) / 2;
    const y = (pdfHeight - finalImgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);

    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Relatorio_FAVEP_${this.reportType}_${dataAtual}.pdf`;
    
    pdf.save(nomeArquivo);
  }
}