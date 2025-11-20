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
  dataAtivacao?: Date | string;
  dataExpiracao?: Date | string;
}

export interface Propriedade {
  id: string; // Chave primária REAL
  nomepropriedade: string;
  localizacao: string;
  area_ha: number;
  usuarioId: string;
  status: string;
  culturas?: string[];
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
  planos?: PlanosMercadoPago[];
  cargo?: 'ADMINISTRADOR' | 'GERENTE' | 'FUNCIONARIO';
  profileCompleted?: boolean;
  adminId?: string;

  // ### ADICIONADO: Lista de propriedades que este usuário pode acessar ###
  propriedadesAcessiveis?: Propriedade[];
}

export interface Producao {
  id: number;
  propriedadeId: string;
  cultura: string;
  safra: string;
  quantidade: number;
  areaproducao: number;
  data: Date | string;
  propriedade?: Propriedade;
}

export interface Financeiro {
  id: number;
  propriedadeId: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date | string;
  propriedade?: Propriedade;
}

// Interface para a troca de senha na página de perfil
export interface ChangePasswordPayload {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

// Interface de resposta do Auth
export interface AuthResponse {
  user: Usuario;
  token: string;
  message?: string;
  verificationPending?: boolean;
  oldEmail?: string;
}

// Interface de requisição de Login
export interface LoginRequest {
  email: string;
  senha: string;
}
