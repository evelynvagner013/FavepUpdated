import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Subscription } from 'rxjs';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { PropriedadeService } from '../../services/propriedade.service';
import { ProducaoService } from '../../services/producao.service';
import { MovimentacaoService } from '../../services/movimentacao.service';
import { AuthService } from '../../services/auth.service';
import {
  Usuario,
  Propriedade,
  Producao,
  Financeiro
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

  // --- Propriedades de UI e Dropdown ---
  menuAberto = false;
  mostrarDropdown = false;
  submenuAberto = false; // <<< ADICIONADO
  usuarioNome: string = '';
  usuarioFoto: string = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
  private usuarioLogado: Usuario | null = null;
  
  // --- Controle de Abas e Modais ---
  abaAtiva: string = 'propriedades';
  modalAberto: boolean = false;
  confirmacaoAberta: boolean = false;
  modalTitulo: string = '';
  mensagemConfirmacao: string = '';
  tipoEdicao: string = '';
  itemParaExcluir: any = null;
  tipoExclusao: string = '';
  
  // --- Propriedades de Filtros ---
  filtroAtivo: string = 'todos'; // Para culturas
  filtroPeriodo: string = '30';
  termoBusca: string = '';
  filtroPropriedade: string = 'todos';
  filtroStatus: string = 'ativo'; // Filtro de status da propriedade
  
  // --- Opções para os Filtros ---
  opcoesFiltro: { valor: string; texto: string }[] = [{ valor: 'todos', texto: 'Todas' }];
  opcoesFiltroPropriedade: { valor: string; texto: string }[] = [{ valor: 'todos', texto: 'Todas as Propriedades' }];

  // --- Listas de Dados (Originais) ---
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

  // --- Propriedades de Paginação ---
  paginaAtualPropriedades = 1;
  paginaAtualProducao = 1;
  paginaAtualFinanceiro = 1;
  itensPorPagina = 5;

  constructor(
    private dashboardDataService: DashboardDataService,
    private propriedadeService: PropriedadeService,
    private producaoService: ProducaoService,
    private movimentacaoService: MovimentacaoService,
    private authService: AuthService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.carregarTodosDados();
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioLogado = user;
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoperfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      } else {
        this.usuarioNome = '';
        this.usuarioFoto = 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  get propriedadesPaginadas(): Propriedade[] {
    const inicio = (this.paginaAtualPropriedades - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.propriedadesFiltradas.slice(inicio, fim);
  }

  get producoesPaginadas(): Producao[] {
    const inicio = (this.paginaAtualProducao - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.producoesFiltradas.slice(inicio, fim);
  }

  get financeirosPaginados(): Financeiro[] {
    const inicio = (this.paginaAtualFinanceiro - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.financeirosFiltrados.slice(inicio, fim);
  }

  totalPaginas(totalItens: number): number {
    return Math.ceil(totalItens / this.itensPorPagina);
  }

  mudarPagina(aba: string, novaPagina: number): void {
    if (aba === 'propriedades' && novaPagina >= 1 && novaPagina <= this.totalPaginas(this.propriedadesFiltradas.length)) {
      this.paginaAtualPropriedades = novaPagina;
    } else if (aba === 'producao' && novaPagina >= 1 && novaPagina <= this.totalPaginas(this.producoesFiltradas.length)) {
      this.paginaAtualProducao = novaPagina;
    } else if (aba === 'financeiro' && novaPagina >= 1 && novaPagina <= this.totalPaginas(this.financeirosFiltrados.length)) {
      this.paginaAtualFinanceiro = novaPagina;
    }
  }

  paginasDisponiveis(totalItens: number): number[] {
    const total = this.totalPaginas(totalItens);
    return Array.from({ length: total }, (_, i) => i + 1);
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
            ...this.propriedades.map(p => ({ valor: p.id!, texto: p.nomepropriedade }))
        ];

        this.todasCulturas = Array.from(uniqueCrops).sort();
        this.safras = Array.from(new Set(this.producoes.map(p => p.safra).filter(Boolean) as string[])).sort();
        this.aplicarFiltros();
      },
      error: (err: any) => console.error('Erro ao carregar dados:', err),
    });
  }

  selecionarAba(aba: string): void {
    this.abaAtiva = aba;
    this.filtroAtivo = 'todos';
    this.filtroPropriedade = 'todos';
    this.termoBusca = '';
    this.paginaAtualPropriedades = 1;
    this.paginaAtualProducao = 1;
    this.paginaAtualFinanceiro = 1;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.filtrarPropriedades();
    this.filtrarProducoes();
    this.filtrarFinanceiros();
  }

  filtrarPropriedades(): void {
    this.propriedadesFiltradas = this.propriedades.filter(prop => {
      const buscaValida = !this.termoBusca || 
                         prop.nomepropriedade.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
                         (prop.localizacao && prop.localizacao.toLowerCase().includes(this.termoBusca.toLowerCase()));

      if (this.filtroStatus === 'todos') {
        return buscaValida;
      }
      return prop.status === this.filtroStatus && buscaValida;
    });
    this.paginaAtualPropriedades = 1;
  }

  filtrarProducoes(): void {
    this.producoesFiltradas = this.producoes.filter(prod => {
      const filtroCultura = this.filtroAtivo === 'todos' || prod.cultura === this.filtroAtivo;
      const filtroProp = this.filtroPropriedade === 'todos' || prod.propriedadeId === this.filtroPropriedade;
      return filtroCultura && filtroProp;
    });
    this.paginaAtualProducao = 1;
  }

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
    this.paginaAtualFinanceiro = 1;
  }

  // --- MÉTODOS DE CÁLCULO ATUALIZADOS ---

  getPropriedadesAtivas(): Propriedade[] {
    return this.propriedades.filter(p => p.status === 'ativo');
  }

  calcularTotalPropriedadesAtivas(): number {
    return this.getPropriedadesAtivas().length;
  }

  calcularAreaTotal(): number {
    return this.getPropriedadesAtivas().reduce((total, prop) => total + (prop.area_ha || 0), 0);
  }

  calcularProducaoTotal(): number {
    const idsPropriedadesAtivas = new Set(this.getPropriedadesAtivas().map(p => p.id));
    const producoesAtivas = this.producoes.filter(prod => idsPropriedadesAtivas.has(prod.propriedadeId));
    return producoesAtivas.reduce((total, prod) => total + ((prod.areaproducao || 0) * (prod.quantidade || 0)), 0);
  }
  
  calcularAreaPlantada(): number {
    const idsPropriedadesAtivas = new Set(this.getPropriedadesAtivas().map(p => p.id));
    const producoesAtivas = this.producoes.filter(prod => idsPropriedadesAtivas.has(prod.propriedadeId));
    return producoesAtivas.reduce((total, prod) => total + (prod.areaproducao || 0), 0);
  }

  calcularProdutividadeMedia(): number {
    const totalProducao = this.calcularProducaoTotal();
    const totalArea = this.calcularAreaPlantada();
    return totalArea > 0 ? totalProducao / totalArea : 0;
  }

  calcularTotalReceitas(): number {
    const idsPropriedadesAtivas = new Set(this.getPropriedadesAtivas().map(p => p.id));
    return this.financeirosFiltrados
      .filter(m => m.tipo === 'receita' && idsPropriedadesAtivas.has(m.propriedadeId))
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularTotalDespesas(): number {
    const idsPropriedadesAtivas = new Set(this.getPropriedadesAtivas().map(p => p.id));
    return this.financeirosFiltrados
      .filter(m => m.tipo === 'despesa' && idsPropriedadesAtivas.has(m.propriedadeId))
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularResultadoFinanceiro(): number {
    return this.calcularTotalReceitas() - this.calcularTotalDespesas();
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
      : this.propriedadeService.adicionarPropriedade(dados as Omit<Propriedade, 'id' | 'usuarioId' | 'culturas' | 'status'>);
    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err: any) => console.error('Erro ao salvar propriedade:', err),
    });
  }

  salvarProducao(): void {
    const { id, ...dados } = this.producaoEditada;
    if (!dados.propriedadeId) { return; }
    const observable = id
      ? this.producaoService.atualizarProducao(id, dados)
      : this.producaoService.adicionarProducao(dados as Omit<Producao, 'id' | 'propriedade'>);
    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err: any) => console.error('Erro ao salvar produção:', err),
    });
  }

  salvarFinanceiro(): void {
    const { id, ...dados } = this.financeiroEditado;
    if (!dados.propriedadeId) { return; }
    const observable = id
      ? this.movimentacaoService.atualizarMovimentacao(id, dados)
      : this.movimentacaoService.adicionarMovimentacao(dados as Omit<Financeiro, 'id' | 'propriedade'>);
    observable.subscribe({
      next: () => { this.carregarTodosDados(); this.fecharModal(); },
      error: (err: any) => console.error('Erro ao salvar registro financeiro:', err),
    });
  }

  executarExclusao(): void {
    if (!this.itemParaExcluir || !this.itemParaExcluir.id) return;
    let exclusaoObservable;

    switch (this.tipoExclusao) {
      case 'propriedades':
        exclusaoObservable = this.propriedadeService.togglePropertyStatus(this.itemParaExcluir.id);
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
      error: (err: any) => console.error(`Erro ao executar ação em ${this.tipoExclusao}:`, err),
    });
  }

  abrirModalAdicionar(): void {
    this.modalAberto = true;
    this.tipoEdicao = this.abaAtiva;
    this.modalTitulo = `Adicionar ${this.getTituloModal()}`;

    switch (this.tipoEdicao) {
      case 'propriedades': this.propriedadeEditada = {}; break;
      case 'producao': this.producaoEditada = { cultura: '', safra: '', areaproducao: 0, quantidade: 0, data: new Date(), propriedadeId: '' }; break;
      case 'financeiro': this.financeiroEditado = { tipo: 'receita', data: new Date(), descricao: '', valor: 0, propriedadeId: '' }; break;
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
    if (tipo === 'propriedades') {
      const acao = item.status === 'ativo' ? 'desativar' : 'ativar';
      this.mensagemConfirmacao = `Tem certeza que deseja ${acao} a propriedade "${nomeItem}"?`;
    } else {
      this.mensagemConfirmacao = `Tem certeza que deseja excluir "${nomeItem}"? Esta ação não pode ser desfeita.`;
    }
    this.confirmacaoAberta = true;
  }

  cancelarExclusao(): void {
    this.confirmacaoAberta = false;
    this.itemParaExcluir = null;
    this.tipoExclusao = '';
  }

  @HostListener('document:click', ['$event'])
  fecharMenuFora(event: MouseEvent): void {
    const alvo = event.target as HTMLElement;
    if (this.menuAberto && !alvo.closest('.main-menu') && !alvo.closest('.menu-toggle')) {
        this.menuAberto = false;
    }
    if (this.mostrarDropdown && !alvo.closest('.user-info')) {
      this.mostrarDropdown = false;
    }
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

  // --- MÉTODOS ADICIONADOS PARA O SUBMENU ---
  toggleSubmenu(): void {
    this.submenuAberto = !this.submenuAberto;
  }

  isConfigActive(): boolean {
    const configRoutes = ['/usuario', '/plano-assinatura', '/adicionar-usuario'];
    return configRoutes.some(route => this.router.isActive(route, false));
  }
  // ---------------------------------------------

  // --- MÉTODOS DO DROPDOWN ATUALIZADOS ---
  navigateToProfile(event: MouseEvent) {
    event.stopPropagation(); // Impede a propagação do clique
    this.mostrarDropdown = false;
    this.router.navigate(['/usuario']);
  }

  logout(event: MouseEvent) {
    event.stopPropagation(); // Impede a propagação do clique
    this.mostrarDropdown = false;
    this.authService.logout();
  }
  // -----------------------------------------
}