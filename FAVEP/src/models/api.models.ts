// ====================================================================
// Interfaces com nomes e campos em português (DA SUA API)
// ====================================================================

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  fotoPerfil?: string;
  senha: string;
  plano?: string;
}

export interface Propriedade {
  nomepropriedade: string; // CHAVE PRIMÁRIA
  localizacao: string;
  area_ha: number;
  usuarioId: string;
}

export interface Producao {
  id: number;
  nomepropriedade: string; // CHAVE ESTRANGEIRA
  cultura: string;
  safra: string;
  produtividade: number; // Campo corrigido de 'quantidade'
  areaproducao: number; // Campo corrigido de 'area'
  data: Date;
}


export interface Movimentacao {
  id: number;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date | string;
  nomepropriedade?: string; // CHAVE ESTRANGEIRA
  categoria?: string;
}