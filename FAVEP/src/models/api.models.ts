// api.models.ts

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  fotoPerfil?: string;
  senha?: string; 
  plano?: string;
}

export interface Propriedade {
  id: string; // Chave primária REAL
  nomepropriedade: string;
  localizacao: string;
  area_ha: number;
  usuarioId: string;
  culturas?: string[]; // Adicionado para comportar os dados que vêm do controller
}

export interface Producao {
  id: number;
  propriedadeId: string; // Chave estrangeira CORRETA
  cultura: string;
  safra: string;
  produtividade: number;
  areaproducao: number;
  data: Date | string; // Permitir string para facilitar o binding de formulários
  propriedade?: Propriedade; // Opcional para dados aninhados
}

export interface Financeiro { // Renomeado de Movimentacao
  id: number;
  propriedadeId: string; // Chave estrangeira CORRETA
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date | string; // Permitir string para facilitar o binding de formulários
  categoria?: string;
  propriedade?: Propriedade; // Opcional para dados aninhados
}