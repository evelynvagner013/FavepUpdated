import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Subscription } from 'rxjs';

// --- SERVIÇOS ---
import { DashboardDataService } from '../../services/dashboard-data.service';
import { PropriedadeService } from '../../services/propriedade.service';
import { ProducaoService } from '../../services/producao.service';
import { MovimentacaoService } from '../../services/movimentacao.service';
import { AuthService } from '../../services/auth.service';

// --- MODELOS CORRIGIDOS ---
import {
  Usuario,
  Propriedade,
  Producao,
  Financeiro,
} from '../../models/api.models';

registerLocaleData(localePt);

@Component({
  selector: 'app-gerenciamento',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './gerenciamento.component.html',
  styleUrl: './gerenciamento.component.css',
})
export class GerenciamentoComponent implements OnInit, OnDestroy {

  menuAberto = false;
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';

  abaAtiva: string = 'propriedades';
  modalAberto: boolean = false;
  confirmacaoAberta: boolean = false;
  modalTitulo: string = '';
  mensagemConfirmacao: string = '';
  tipoEdicao: string = '';
  itemParaExcluir: any = null;
  tipoExclusao: string = '';
  
  // Filtros
  filtroAtivo: string = 'todos'; // Para culturas
  filtroPeriodo: string = '30';
  termoBusca: string = '';
  filtroPropriedade: string = 'todos';
  
  // Opções dos filtros
  opcoesFiltro: { valor: string; texto: string }[] = [{ valor: 'todos', texto: 'Todas' }];
  opcoesFiltroPropriedade: { valor: string; texto: string }[] = [{ valor: 'todos', texto: 'Todas' }];

  // --- Listas de Dados ---
  propriedades: Propriedade[] = [];
  producoes: Producao[] = [];
  financeiros: Financeiro[] = [];

  // --- Listas Filtradas para Exibição ---
  propriedadesFiltradas: Propriedade[] = [];
  producoesFiltradas: Producao[] = [];
  financeirosFiltrados: Financeiro[] = [];

  // --- Objetos para Edição/Criação no Modal ---
  propriedadeEditada: Partial<Propriedade> = {};
  producaoEditada: Partial<Producao> = {};
  financeiroEditado: Partial<Financeiro> = { tipo: 'receita' };

  todasCulturas: string[] = [];
  safras: string[] = [];

  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private propriedadeService: PropriedadeService,
    private producaoService: ProducaoService,
    private movimentacaoService: MovimentacaoService,
    private authService: AuthService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });
    this.carregarTodosDados();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  carregarTodosDados(): void {
    this.dashboardDataService.carregarDadosDashboard().subscribe({
      next: (data) => {
        const { propriedades, producoes, movimentacoes } = data;
        this.propriedades = propriedades;
        this.producoes = producoes;
        this.financeiros = movimentacoes.sort((a, b) => new Date(b.data as string).getTime() - new Date(a.data as string).getTime());

        const uniqueCrops = new Set<string>(this.producoes.map(p => p.cultura));
        this.opcoesFiltro = [{ valor: 'todos', texto: 'Todas' }, ...Array.from(uniqueCrops).sort().map(c => ({ valor: c, texto: c }))];
        
        this.opcoesFiltroPropriedade = [
            { valor: 'todos', texto: 'Todas as Propriedades' },
            ...this.propriedades.map(p => ({ valor: p.id, texto: p.nomepropriedade }))
        ];

        this.todasCulturas = Array.from(uniqueCrops).sort();
        this.safras = Array.from(new Set(this.producoes.map(p => p.safra).filter(Boolean))).sort();
        this.aplicarFiltros();
      },
      error: (err) => console.error('Erro ao carregar dados:', err),
    });
  }

  selecionarAba(aba: string): void {
    this.abaAtiva = aba;
    this.filtroAtivo = 'todos';
    this.filtroPropriedade = 'todos';
    this.termoBusca = '';
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.filtrarPropriedades();
    this.filtrarProducoes();
    this.filtrarFinanceiros();
  }

  filtrarPropriedades(): void {
    this.propriedadesFiltradas = this.propriedades.filter(prop =>
      !this.termoBusca || prop.nomepropriedade.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
      (prop.localizacao && prop.localizacao.toLowerCase().includes(this.termoBusca.toLowerCase()))
    );
  }

  // ✅ ALTERADO: Lógica de busca por texto removida.
  filtrarProducoes(): void {
    this.producoesFiltradas = this.producoes.filter(prod => {
      const filtroCultura = this.filtroAtivo === 'todos' || prod.cultura === this.filtroAtivo;
      const filtroProp = this.filtroPropriedade === 'todos' || prod.propriedadeId === this.filtroPropriedade;
      return filtroCultura && filtroProp;
    });
  }

  // ✅ ALTERADO: Lógica de busca por texto removida.
  filtrarFinanceiros(): void {
    const dias = parseInt(this.filtroPeriodo, 10);
    const dataLimite = new Date();
    if (!isNaN(dias)) {
      dataLimite.setDate(dataLimite.getDate() - dias);
    }

    this.financeirosFiltrados = this.financeiros.filter(fin => {
      const periodo = this.filtroPeriodo === 'todos' || new Date(fin.data as string) >= dataLimite;
      const filtroProp = this.filtroPropriedade === 'todos' || fin.propriedadeId === this.filtroPropriedade;
      return periodo && filtroProp;
    });
  }

  calcularAreaTotal(): number {
    return this.propriedades.reduce((total, prop) => total + (prop.area_ha || 0), 0);
  }

  calcularProducaoTotal(): number {
    return this.producoesFiltradas.reduce((total, prod) => total + (prod.produtividade || 0), 0);
  }
  
  calcularAreaPlantada(): number {
    return this.producoesFiltradas.reduce((total, prod) => total + (prod.areaproducao || 0), 0);
  }

  calcularProdutividadeMedia(): number {
    const totalProducao = this.calcularProducaoTotal();
    const totalArea = this.calcularAreaPlantada();
    return totalArea > 0 ? totalProducao / totalArea : 0;
  }

  calcularTotalReceitas(): number {
    return this.financeirosFiltrados
      .filter(m => m.tipo === 'receita')
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularTotalDespesas(): number {
    return this.financeirosFiltrados
      .filter(m => m.tipo === 'despesa')
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularResultadoFinanceiro(): number {
    return this.calcularTotalReceitas() - this.calcularTotalDespesas();
  }

  executarExclusao(): void {
    if (!this.itemParaExcluir || !this.itemParaExcluir.id) return;
    let exclusaoObservable;

    switch (this.tipoExclusao) {
      case 'propriedades':
        exclusaoObservable = this.propriedadeService.excluirPropriedade(this.itemParaExcluir.id);
        break;
      case 'producao':
        exclusaoObservable = this.producaoService.excluirProducao(this.itemParaExcluir.id);
        break;
      default:
        this.cancelarExclusao();
        return;
    }

    exclusaoObservable.subscribe({
      next: () => {
        this.carregarTodosDados();
        this.cancelarExclusao();
      },
      error: (err) => console.error(`Erro ao excluir ${this.tipoExclusao}:`, err),
    });
  }

  salvar(): void {
    switch (this.tipoEdicao) {
      case 'propriedades': this.salvarPropriedade(); break;
      case 'producao': this.salvarProducao(); break;
      case 'financeiro': this.salvarFinanceiro(); break;
    }
  }

  salvarPropriedade(): void {
    const { id, ...dados } = this.propriedadeEditada;
    
    const observable = id
      ? this.propriedadeService.atualizarPropriedade(id, dados)
      : this.propriedadeService.adicionarPropriedade(dados as Omit<Propriedade, 'id' | 'usuarioId' | 'culturas'>);

    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err) => console.error('Erro ao salvar propriedade:', err),
    });
  }

  salvarProducao(): void {
    const { id, ...dados } = this.producaoEditada;
    if (!dados.propriedadeId) {
      console.error("ID da propriedade é obrigatório para salvar a produção.");
      return;
    }
    const observable = id
      ? this.producaoService.atualizarProducao(id, dados)
      : this.producaoService.adicionarProducao(dados as Omit<Producao, 'id' | 'propriedade'>);

    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err) => console.error('Erro ao salvar produção:', err),
    });
  }

  salvarFinanceiro(): void {
    const { id, ...dados } = this.financeiroEditado;
    if (!dados.propriedadeId) {
      console.error("ID da propriedade é obrigatório para salvar o registro financeiro.");
      return;
    }
    const observable = id
      ? this.movimentacaoService.atualizarMovimentacao(id, dados)
      : this.movimentacaoService.adicionarMovimentacao(dados as Omit<Financeiro, 'id' | 'propriedade'>);

    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err) => console.error('Erro ao salvar registro financeiro:', err),
    });
  }

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent) {
    const alvo = event.target as HTMLElement;
    if (!alvo.closest('.menu-toggle') && !alvo.closest('.main-menu')) {
      this.menuAberto = false;
    }
  }

  abrirModalAdicionar(): void {
    this.modalAberto = true;
    this.tipoEdicao = this.abaAtiva;
    this.modalTitulo = `Adicionar ${this.getTituloModal()}`;

    switch (this.tipoEdicao) {
      case 'propriedades': 
        this.propriedadeEditada = {}; 
        break;
      case 'producao': 
        this.producaoEditada = { cultura: '', safra: '', areaproducao: 0, produtividade: 0, data: new Date(), propriedadeId: '' }; 
        break;
      case 'financeiro': 
        this.financeiroEditado = { tipo: 'receita', data: new Date(), descricao: '', valor: 0, propriedadeId: '' }; 
        break;
    }
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.propriedadeEditada = {};
    this.producaoEditada = {};
    this.financeiroEditado = { tipo: 'receita' };
  }

  editarPropriedade(prop: Propriedade): void {
    this.propriedadeEditada = { ...prop };
    this.modalTitulo = 'Editar Propriedade';
    this.tipoEdicao = 'propriedades';
    this.modalAberto = true;
  }

  editarProducao(prod: Producao): void {
    const dataFormatada = this.datePipe.transform(prod.data, 'yyyy-MM-dd');
    this.producaoEditada = { ...prod, data: dataFormatada || '' };
    this.modalTitulo = 'Editar Produção';
    this.tipoEdicao = 'producao';
    this.modalAberto = true;
  }

  editarMovimentacao(fin: Financeiro): void {
    const dataFormatada = this.datePipe.transform(fin.data, 'yyyy-MM-dd');
    this.financeiroEditado = { ...fin, data: dataFormatada || '' };
    this.modalTitulo = 'Editar Movimentação Financeira';
    this.tipoEdicao = 'financeiro';
    this.modalAberto = true;
  }

  confirmarExclusao(item: any, tipo: string): void {
    this.itemParaExcluir = item;
    this.tipoExclusao = tipo;
    const nomeItem = item.nomepropriedade || item.descricao || item.cultura || `ID: ${item.id}`;
    this.mensagemConfirmacao = `Tem certeza que deseja excluir "${nomeItem}"? Esta ação não pode ser desfeita.`;
    this.confirmacaoAberta = true;
  }

  cancelarExclusao(): void {
    this.confirmacaoAberta = false;
    this.itemParaExcluir = null;
    this.tipoExclusao = '';
  }

  getTituloModal(): string {
    const titulos: { [key: string]: string } = {
      propriedades: 'Propriedade',
      producao: 'Produção',
      financeiro: 'Movimentação Financeira',
    };
    return titulos[this.abaAtiva] || 'Item';
  }

  getNomePropriedade(id: string): string {
    if (!id) return 'Geral';
    const prop = this.propriedades.find((p) => p.id === id);
    return prop ? prop.nomepropriedade : 'Propriedade não encontrada';
  }

  trackById(index: number, item: { id: any }): any {
    return item.id;
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }
}