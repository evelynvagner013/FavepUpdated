const prisma = require('../lib/prisma');

// --- NOSSA ADIÇÃO (Helper) ---
//Função para buscar dados do usuário logado (cargo, planos, adminId)
async function getUserData(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      planos: {
        where: {
          status: 'Pago/Ativo',
          dataExpiracao: { gte: new Date() }
        }
      }
    }
  });

  // Determina o ID do "dono" dos dados.
  // Se for admin, é o 'userId'. Se for sub-usuário, é o 'adminId'.
  const dataOwnerId = user.cargo === 'ADMINISTRADOR' ? user.id : user.adminId;
  
  return { user, dataOwnerId };
}
// --- FIM DA ADIÇÃO ---


module.exports = {
  // # getAllFinanceiros
  async getAllFinanceiros(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️  Requisição para listar todos os registros financeiros do usuário ${authenticatedUserId}`);
    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const financeiros = await prisma.financeiro.findMany({
        where: {
          propriedade: {
            // MODIFICADO: Busca registros de propriedades do "dono" (admin)
            usuarioId: dataOwnerId,
          },
        },
        include: {
          propriedade: true,
        },
      });
      console.log(`✅ ${financeiros.length} registros financeiros listados com sucesso.`);
      res.status(200).json(financeiros);
    } catch (error) {
      console.error('❌ Erro ao listar registros financeiros:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar os registros financeiros.' });
    }
  },

  // # getFinanceiroById
  async getFinanceiroById(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    const financeiroId = parseInt(id, 10);

    if (isNaN(financeiroId)) {
      return res.status(400).json({ error: 'ID inválido. Por favor, forneça um número válido.' });
    }

    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const financeiro = await prisma.financeiro.findFirst({
        where: {
          id: financeiroId,
          propriedade: {
            // MODIFICADO: Busca registro de propriedade do "dono" (admin)
            usuarioId: dataOwnerId,
          },
        },
        include: { propriedade: true },
      });

      if (!financeiro) {
        return res.status(404).json({ error: `Registro financeiro com ID \"${id}\" não encontrado ou não pertence a você.` });
      }

      console.log('✅ Registro financeiro encontrado:', financeiro.id);
      res.status(200).json(financeiro);
    } catch (error) {
      console.error('❌ Erro ao buscar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar o registro financeiro.' });
    }
  },

  // # getFinanceirosByProperty
  async getFinanceirosByProperty(req, res) {
    const { propertyId } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️  Requisição para listar registros financeiros da propriedade ${propertyId}`);

    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Checar se a propriedade pertence ao admin
      const property = await prisma.propriedade.findFirst({
        where: { id: propertyId, usuarioId: dataOwnerId }
      });

      if (!property) {
        return res.status(404).json({ error: 'Propriedade não encontrada ou não pertence a você.' });
      }
      // --- FIM DA ADIÇÃO ---


      const financeiros = await prisma.financeiro.findMany({
        where: {
          // MODIFICADO: Busca pela propriedade (que já foi validada)
          propriedadeId: propertyId,
        },
        include: { propriedade: true },
        orderBy: { data: 'desc' },
      });

      console.log(`✅ ${financeiros.length} registros financeiros listados para ${propertyId}`);
      res.status(200).json(financeiros);
    } catch (error) {
      console.error('❌ Erro ao listar registros financeiros por propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar os registros financeiros.' });
    }
  },

  // # createFinanceiro
  async createFinanceiro(req, res) {
    const { descricao, valor, data, tipo, propriedadeId } = req.body;
    const authenticatedUserId = req.userId;
    console.log(`➡️  Requisição para criar registro financeiro: \"${descricao}\"`);

    try {
      // --- NOSSA ADIÇÃO (Permissões) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem criar registros financeiros.' });
      }

      // 2. Checar se a propriedade-pai pertence ao admin
      const property = await prisma.propriedade.findFirst({
         where: { id: propriedadeId, usuarioId: dataOwnerId }
      });

      if (!property) {
        return res.status(404).json({ error: 'A propriedade selecionada não foi encontrada ou não pertence a você.' });
      }
      // --- FIM DA ADIÇÃO ---


      const newFinanceiro = await prisma.financeiro.create({
        data: {
          descricao,
          valor,
          data: new Date(data),
          tipo,
          propriedadeId,
        },
        include: { propriedade: true },
      });
      console.log('✅ Registro financeiro criado com sucesso:', newFinanceiro.id);
      res.status(201).json(newFinanceiro);
    } catch (error) {
      console.error('❌ Erro ao criar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao criar o registro financeiro.' });
    }
  },

  // # updateFinanceiro
  async updateFinanceiro(req, res) {
    const { id } = req.params;
    const { descricao, valor, data, tipo } = req.body;
    const authenticatedUserId = req.userId;
    const financeiroId = parseInt(id, 10);

    if (isNaN(financeiroId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    try {
      // --- NOSSA ADIÇÃO (Permissões) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem atualizar registros financeiros.' });
      }

      // 2. Checar se o registro existe e pertence ao admin
      const existingFinanceiro = await prisma.financeiro.findFirst({
        where: { 
          id: financeiroId,
          propriedade: {
            usuarioId: dataOwnerId
          }
        }
      });
      
      if (!existingFinanceiro) {
        return res.status(404).json({ error: 'Registro financeiro não encontrado ou não pertence a você.' });
      }
      // --- FIM DA ADIÇÃO ---


      const updatedFinanceiro = await prisma.financeiro.update({
        where: { id: financeiroId },
        data: {
          descricao,
          valor,
          data: data ? new Date(data) : undefined,
          tipo
        },
        include: { propriedade: true },
      });
      res.status(200).json({
        message: 'Registro financeiro atualizado com sucesso!',
        financeiro: updatedFinanceiro,
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao atualizar o registro financeiro.' });
    }
  },
};