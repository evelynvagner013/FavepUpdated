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
  // # getAllProductions
  async getAllProductions(req, res) {
    const authenticatedUserId = req.userId;
    console.log('➡️ Requisição recebida para listar todas as produções do usuário');
    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const productions = await prisma.producao.findMany({
        where: {
          propriedade: {
            // MODIFICADO: Busca produções de propriedades do "dono" (admin)
            usuarioId: dataOwnerId, 
          },
          status: 'ativo' // MODIFICADO: Lista apenas produções ativas
        },
        include: {
          propriedade: true,
        },
      });
      console.log('✅ Produções listadas com sucesso:', productions.length);
      res.status(200).json(productions);
    } catch (error) {
      console.error('❌ Erro ao listar produções:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar as produções.' });
    }
  },

  // # getProductionById
  async getProductionById(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para buscar produção com ID: \"${id}\"`);
    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const productionIdNum = parseInt(id, 10);
      if (isNaN(productionIdNum)) {
        console.warn(`⚠️ ID de produção inválido: \"${id}\".`);
        return res.status(400).json({ error: 'ID de produção inválido. Deve ser um número.' });
      }

      const production = await prisma.producao.findFirst({
        where: {
          id: productionIdNum,
          propriedade: {
            // MODIFICADO: Busca produção de propriedade do "dono" (admin)
            usuarioId: dataOwnerId
          }
        },
        include: {
          propriedade: true
        }
      });

      if (!production) {
        return res.status(404).json({ error: `Produção com ID \"${id}\" não encontrada ou não pertence a você.` });
      }

      console.log('✅ Produção encontrada:', production.id);
      res.status(200).json(production);
    } catch (error) {
      console.error('❌ Erro ao buscar produção:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar a produção.' });
    }
  },

  // # getProductionsByProperty
  async getProductionsByProperty(req, res) {
    const { propertyId } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição para listar produções da propriedade: ${propertyId}`);
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

      const productions = await prisma.producao.findMany({
        where: {
          // MODIFICADO: Busca pela propriedade (que já foi validada)
          propriedadeId: propertyId,
          status: 'ativo' // MODIFICADO: Lista apenas produções ativas
        },
        include: {
          propriedade: true,
        },
        orderBy: {
          data: 'desc'
        }
      });
      console.log(`✅ ${productions.length} produções listadas para a propriedade ${propertyId}.`);
      res.status(200).json(productions);
    } catch (error) {
      console.error('❌ Erro ao listar produções por propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar as produções.' });
    }
  },

  // # createProduction
  async createProduction(req, res) {
    const { safra, areaproducao, data, cultura, quantidade, propriedadeId } = req.body;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para criar produção: \"${cultura}\"`);
    try {
      // --- NOSSA ADIÇÃO (Permissões e Limites) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }

      // 1. Permissão de Cargo (Etapa 1.5)
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem criar registros de produção.' });
      }

      // 2. Checar se a propriedade-pai pertence ao admin
      const property = await prisma.propriedade.findFirst({
         where: { id: propriedadeId, usuarioId: dataOwnerId }
      });

      if (!property) {
        return res.status(404).json({ error: 'A propriedade selecionada não foi encontrada ou não pertence a você.' });
      }
      
      // 3. Limite de Plano (Etapa 1.6) - Só se aplica ao Administrador
      if (user.cargo === 'ADMINISTRADOR') {
        const planoBaseAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('base'));
        const planoGoldAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('gold'));

        // Se for plano base (e não tiver o gold), verifica o limite
        if (planoBaseAtivo && !planoGoldAtivo) {
          const productionCount = await prisma.producao.count({
            where: { 
              propriedade: {
                usuarioId: user.id // Contamos todas as produções do admin
              }
            }
          });

          if (productionCount >= 5) {
            return res.status(403).json({ error: 'Seu Plano Base permite o cadastro de apenas 5 registros de produção.' });
          }
        }
      }
      // --- FIM DA ADIÇÃO ---


      const newProduction = await prisma.producao.create({
        data: {
          safra,
          areaproducao,
          data: new Date(data),
          cultura,
          quantidade,
          propriedadeId,
          status: 'ativo' // Definido no schema, mas garantindo aqui
        },
        include: {
          propriedade: true
        }
      });
      console.log('✅ Produção criada com sucesso:', newProduction.id);
      res.status(201).json(newProduction);
    } catch (error) {
      console.error('❌ Erro ao criar produção:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao criar a produção.' });
    }
  },

  // # updateProduction
  async updateProduction(req, res) {
    const { id } = req.params;
    const { safra, areaproducao, data, cultura, quantidade, propriedadeId } = req.body;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para atualizar produção com ID: \"${id}\"`);

    try {
      const productionIdNum = parseInt(id, 10);
      if (isNaN(productionIdNum)) {
        return res.status(400).json({ error: 'ID de produção inválido.' });
      }
      
      // --- NOSSA ADIÇÃO (Permissões) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem atualizar registros de produção.' });
      }

      // 2. Checar se a produção existe e pertence ao admin
      const existingProduction = await prisma.producao.findFirst({
        where: { 
          id: productionIdNum,
          propriedade: {
            usuarioId: dataOwnerId
          }
        }
      });
      
      if (!existingProduction) {
        return res.status(404).json({ error: 'Produção não encontrada ou não pertence a você.' });
      }

      // 3. (Opcional) Se o ID da propriedade mudou, checar se a *nova* propriedade também pertence ao admin
      if (propriedadeId && propriedadeId !== existingProduction.propriedadeId) {
         const property = await prisma.propriedade.findFirst({
           where: { id: propriedadeId, usuarioId: dataOwnerId }
         });

         if (!property) {
           return res.status(404).json({ error: 'A nova propriedade selecionada não foi encontrada ou não pertence a você.' });
         }
      }
      // --- FIM DA ADIÇÃO ---

      const updatedProduction = await prisma.producao.update({
        where: { id: productionIdNum },
        data: {
          safra,
          areaproducao,
          data: data ? new Date(data) : undefined,
          cultura,
          quantidade,
          propriedadeId
        },
        include: {
          propriedade: true
        }
      });

      console.log('✅ Produção atualizada com sucesso:', updatedProduction.id);
      res.status(200).json({
        message: 'Produção atualizada com sucesso!',
        production: updatedProduction
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar produção:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao atualizar a produção.' });
    }
  },

  // --- NOSSA ADIÇÃO (Soft Delete) ---
  //Função para ativar/inativar um registro de produção
  async toggleProductionStatus(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para alterar status da produção com ID: \"${id}\"`);
    try {
      const productionIdNum = parseInt(id, 10);
      if (isNaN(productionIdNum)) {
        return res.status(400).json({ error: 'ID de produção inválido.' });
      }

      // 1. Permissões e Hierarquia
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem alterar o status da produção.' });
      }

      const production = await prisma.producao.findFirst({
        where: {
          id: productionIdNum,
          propriedade: {
            usuarioId: dataOwnerId
          }
        }
      });

      if (!production) {
        return res.status(404).json({ error: `Produção com ID \"${id}\" não encontrada ou não pertence a você.` });
      }

      // 2. Lógica do Toggle
      const novoStatus = production.status === 'ativo' ? 'inativo' : 'ativo';

      await prisma.producao.update({
        where: { id: productionIdNum },
        data: { status: novoStatus }
      });

      console.log(`🔄 Status da produção ${id} alterado para: ${novoStatus}`);
      res.status(200).json({ message: `Produção ${novoStatus === 'ativo' ? 'ativada' : 'desativada'} com sucesso!` });
    } catch (error) {
      console.error('❌ Erro ao alterar status da produção:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao alterar o status da produção.' });
    }
  }
};