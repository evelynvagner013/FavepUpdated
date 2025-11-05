// Planos front/models/api.models.ts

// --- MODIFICAÇÃO AQUI ---
// Interface 'PlanosMercadoPago' movida para cima para ser usada em 'Usuario'
export interface PlanosMercadoPago {
  id: string;
  status: string;
  tipo: string; // Ex: "Plano Base", "Plano Gold"
  valor: number;
  dataAssinatura: Date | string;
  metodoPagamento: string;
  usuarioId: string;
  idAssinaturaExterna?: string;
  idPagamentoExterno?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  fotoperfil?: string;
  senha?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  planos?: PlanosMercadoPago[]; // <-- CAMPO ADICIONADO
}
// --- FIM DA MODIFICAÇÃO ---

export interface Propriedade {
  id: string; // Chave primária REAL
  nomepropriedade: string;
  localizacao: string;
  area_ha: number;
  usuarioId: string;
  status: string; // NOVO CAMPO
  culturas?: string[]; // Adicionado para comportar os dados que vêm do controller
}

export interface Producao {
  id: number;
  propriedadeId: string; // Chave estrangeira CORRETA
  cultura: string;
  safra: string;
  quantidade: number; // Campo alterado de 'produtividade' para 'quantidade'
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
  propriedade?: Propriedade; // Opcional para dados aninhados
}

// Interface de resposta do Auth
export interface AuthResponse {
  user: Usuario;
  token: string;
}

// Interface de requisição de Login
export interface LoginRequest {
  email: string;
  senha: string;
}