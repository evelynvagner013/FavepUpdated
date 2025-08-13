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
  Financeiro, // CORREÇÃO: Importando o modelo 'Financeiro' correto
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
  filtroAtivo: string = 'todos';
  filtroPeriodo: string = '30';
  termoBusca: string = '';
  opcoesFiltro: { valor: string; texto: string }[] = [{ valor: 'todos', texto: 'Todos' }];

  // --- Listas de Dados ---
  propriedades: Propriedade[] = [];
  producoes: Producao[] = [];
  financeiros: Financeiro[] = []; // CORREÇÃO: Renomeado de 'movimentacoes' para 'financeiros'

  // --- Listas Filtradas para Exibição ---
  propriedadesFiltradas: Propriedade[] = [];
  producoesFiltradas: Producao[] = [];
  financeirosFiltrados: Financeiro[] = []; // CORREÇÃO: Renomeado de 'movimentacoesFiltradas'

  // --- Objetos para Edição/Criação no Modal ---
  propriedadeEditada: Partial<Propriedade> = {};
  producaoEditada: Partial<Producao> = {};
  financeiroEditado: Partial<Financeiro> = { tipo: 'receita' }; // CORREÇÃO: Renomeado de 'movimentacaoEditada'

  todasCulturas: string[] = [];
  safras: string[] = [];

  private userSubscription: Subscription | undefined;

  constructor(
    private dashboardDataService: DashboardDataService,
    private propriedadeService: PropriedadeService,
    private producaoService: ProducaoService,
    private movimentacaoService: MovimentacaoService, // O serviço pode manter o nome antigo se preferir
    private authService: AuthService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuarioNome = user.nome;
        this.usuarioFoto = user.fotoPerfil || 'https://placehold.co/40x40/aabbcc/ffffff?text=User';
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
        // O dashboardDataService foi corrigido para retornar 'movimentacoes' que é um array de 'Financeiro'
        const { propriedades, producoes, movimentacoes } = data;
        this.propriedades = propriedades;
        this.producoes = producoes;
        this.financeiros = movimentacoes.sort((a, b) => new Date(b.data as string).getTime() - new Date(a.data as string).getTime());

        const uniqueCrops = new Set<string>(this.producoes.map(p => p.cultura));
        this.opcoesFiltro = [{ valor: 'todos', texto: 'Todos' }, ...Array.from(uniqueCrops).sort().map(c => ({ valor: c, texto: c }))];
        this.todasCulturas = Array.from(uniqueCrops).sort();
        this.safras = Array.from(new Set(this.producoes.map(p => p.safra).filter(Boolean))).sort();
        this.aplicarFiltros();
      },
      error: (err) => console.error('Erro ao carregar dados:', err),
    });
  }

  selecionarAba(aba: string): void {
    this.abaAtiva = aba;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.filtrarPropriedades();
    this.filtrarProducoes();
    this.filtrarFinanceiros(); // CORREÇÃO: Renomeado
  }

  filtrarPropriedades(): void {
    this.propriedadesFiltradas = this.propriedades.filter(prop =>
      !this.termoBusca || prop.nomepropriedade.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
      (prop.localizacao && prop.localizacao.toLowerCase().includes(this.termoBusca.toLowerCase()))
    );
  }

  filtrarProducoes(): void {
    this.producoesFiltradas = this.producoes.filter(prod => {
      const filtroCultura = this.filtroAtivo === 'todos' || prod.cultura === this.filtroAtivo;
      const busca = !this.termoBusca ||
        // CORREÇÃO: Usa o 'propriedadeId' para buscar o nome correto
        this.getNomePropriedade(prod.propriedadeId).toLowerCase().includes(this.termoBusca.toLowerCase()) ||
        prod.cultura.toLowerCase().includes(this.termoBusca.toLowerCase()) ||
        prod.safra.toLowerCase().includes(this.termoBusca.toLowerCase());
      return filtroCultura && busca;
    });
  }

  // CORREÇÃO: Renomeado e lógica ajustada para usar 'propriedadeId'
  filtrarFinanceiros(): void {
    const dias = parseInt(this.filtroPeriodo, 10);
    const dataLimite = new Date();
    if (!isNaN(dias)) {
      dataLimite.setDate(dataLimite.getDate() - dias);
    }

    this.financeirosFiltrados = this.financeiros.filter(fin => {
      const periodo = this.filtroPeriodo === 'todos' || new Date(fin.data as string) >= dataLimite;
      const busca = !this.termoBusca ||
        (fin.descricao && fin.descricao.toLowerCase().includes(this.termoBusca.toLowerCase())) ||
        (fin.propriedadeId && this.getNomePropriedade(fin.propriedadeId).toLowerCase().includes(this.termoBusca.toLowerCase()));
      return periodo && busca;
    });
  }

  // --- Métodos de Cálculo (sem alterações na lógica, mas agora usam os dados corretos) ---
  calcularAreaTotal(): number {
    return this.propriedades.reduce((total, prop) => total + (prop.area_ha || 0), 0);
  }

  contarCulturasAtivas(): number {
    return new Set(this.producoes.map(p => p.cultura)).size;
  }

  calcularProducaoTotal(): number {
    return this.producoes.reduce((total, prod) => total + (prod.produtividade || 0), 0);
  }
  
  // CORREÇÃO: Usa 'propriedadeId' para garantir a contagem correta
  calcularAreaPlantada(): number {
    const propertyIds = new Set(this.producoes.map(p => p.propriedadeId));
    return this.propriedades
      .filter(p => propertyIds.has(p.id))
      .reduce((total, prop) => total + (prop.area_ha || 0), 0);
  }

  calcularProdutividadeMedia(): number {
    const totalProducao = this.calcularProducaoTotal();
    const totalArea = this.calcularAreaPlantada();
    return totalArea > 0 ? totalProducao / totalArea : 0;
  }

  calcularTotalReceitas(): number {
    return this.financeiros
      .filter(m => m.tipo === 'receita')
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularTotalDespesas(): number {
    return this.financeiros
      .filter(m => m.tipo === 'despesa')
      .reduce((total, m) => total + m.valor, 0);
  }

  calcularResultadoFinanceiro(): number {
    return this.calcularTotalReceitas() - this.calcularTotalDespesas();
  }

  // CORREÇÃO: Lógica de exclusão agora usa o ID correto para cada entidade
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
      case 'financeiro':
        exclusaoObservable = this.movimentacaoService.excluirMovimentacao(this.itemParaExcluir.id);
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
      case 'financeiro': this.salvarFinanceiro(); break; // CORREÇÃO: Renomeado
    }
  }

  // CORREÇÃO: Lógica de salvar baseada na existência do 'id'
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
    // Garante que o ID da propriedade foi selecionado
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

  // CORREÇÃO: Renomeado e lógica ajustada
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
        // CORREÇÃO: Inicializa com 'propriedadeId'
        this.producaoEditada = { cultura: '', safra: '', areaproducao: 0, produtividade: 0, data: new Date(), propriedadeId: '' }; 
        break;
      case 'financeiro': 
        // CORREÇÃO: Inicializa com 'propriedadeId'
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
    // Formata a data para o input type="date"
    const dataFormatada = this.datePipe.transform(prod.data, 'yyyy-MM-dd');
    // CORREÇÃO: Adiciona um fallback ('') para o caso de o transform retornar null
    this.producaoEditada = { ...prod, data: dataFormatada || '' };
    this.modalTitulo = 'Editar Produção';
    this.tipoEdicao = 'producao';
    this.modalAberto = true;
  }

  editarMovimentacao(fin: Financeiro): void {
    const dataFormatada = this.datePipe.transform(fin.data, 'yyyy-MM-dd');
    // CORREÇÃO: Adiciona um fallback ('') para o caso de o transform retornar null
    this.financeiroEditado = { ...fin, data: dataFormatada || '' };
    this.modalTitulo = 'Editar Movimentação Financeira';
    this.tipoEdicao = 'financeiro';
    this.modalAberto = true;
  }

  // CORREÇÃO: Mensagem de confirmação usa o nome correto do item
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

  // CORREÇÃO: Função agora busca pelo ID da propriedade (string)
  getNomePropriedade(id: string): string {
    if (!id) return 'Geral'; // Retorna um valor padrão se não houver ID
    const prop = this.propriedades.find((p) => p.id === id);
    return prop ? prop.nomepropriedade : 'Propriedade não encontrada';
  }

  // CORREÇÃO: trackBy agora usa apenas o ID, que é o identificador único
  trackById(index: number, item: { id: string | number }): string | number {
    return item.id;
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }
}
