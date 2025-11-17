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
  // # getAllProperties - Busca todas as propriedades (ativas e inativas)
  async getAllProperties(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para listar todas as propriedades do usuário: ${authenticatedUserId}`);
    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const properties = await prisma.propriedade.findMany({
        where: { 
          // MODIFICADO: Busca propriedades do "dono" (admin)
          usuarioId: dataOwnerId,
        },
        include: {
          usuario: {
            select: { nome: true, email: true }
          },
          producoes: {
            select: {
              cultura: true,
              data: true
            },
            orderBy: {
              data: 'desc'
            }
          }
        },
      });

      const propertiesWithAllCultures = properties.map(property => {
        const culturas = property.producoes.map(prod => prod.cultura);
        const { producoes, ...rest } = property;
        return { ...rest, culturas };
      });

      console.log('✅ Propriedades listadas com sucesso:', propertiesWithAllCultures.length);
      res.status(200).json(propertiesWithAllCultures);
    } catch (error) {
      console.error('❌ Erro ao listar propriedades:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar as propriedades.' });
    }
  },

  // # getPropertyById
  async getPropertyById(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para buscar propriedade com ID: \"${id}\"`);
    try {
      // --- NOSSA ADIÇÃO (Hierarquia) ---
      const { dataOwnerId } = await getUserData(authenticatedUserId);
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }
      // --- FIM DA ADIÇÃO ---

      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          // MODIFICADO: Busca propriedade do "dono" (admin)
          usuarioId: dataOwnerId
        },
        include: {
          usuario: {
            select: { nome: true, email: true }
          },
          producoes: true,
          financeiros: true
        }
      });

      if (!property) {
        return res.status(404).json({ error: `Propriedade com ID \"${id}\" não encontrada ou não pertence a você.` });
      }

      console.log('✅ Propriedade encontrada:', property.nomepropriedade);
      res.status(200).json(property);
    } catch (error) {
      console.error('❌ Erro ao buscar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar a propriedade.' });
    }
  },

  // # createProperty
  async createProperty(req, res) {
    const { nomepropriedade, localizacao, area_ha } = req.body;
    const authenticatedUserId = req.userId;
    const status = 'ativo'; // Status padrão
    console.log(`➡️ Requisição recebida para criar propriedade: \"${nomepropriedade}\"`);

    try {
      // --- NOSSA ADIÇÃO (Permissões e Limites) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo (Etapa 1.5)
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem criar propriedades.' });
      }

      // 2. Limite de Plano (Etapa 1.6) - Só se aplica ao Administrador
      if (user.cargo === 'ADMINISTRADOR') {
        const planoBaseAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('base'));
        const planoGoldAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('gold'));

        // Se for plano base (e não tiver o gold), verifica o limite
        if (planoBaseAtivo && !planoGoldAtivo) {
          const propertyCount = await prisma.propriedade.count({
            where: { usuarioId: user.id }
          });

          if (propertyCount >= 1) {
            return res.status(403).json({ error: 'Seu Plano Base permite o cadastro de apenas 1 propriedade.' });
          }
        }
      }
      // --- FIM DA ADIÇÃO ---

      const newProperty = await prisma.propriedade.create({
        data: {
          nomepropriedade,
          localizacao,
          area_ha,
          status,
          // MODIFICADO: Vincula ao "dono" (admin)
          usuarioId: dataOwnerId
        }
      });
      console.log('✅ Propriedade criada com sucesso:', newProperty.id);
      res.status(201).json(newProperty);
    } catch (error) {
      console.error('❌ Erro ao criar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao criar a propriedade.' });
    }
  },

  // # updateProperty
  async updateProperty(req, res) {
    const { id } = req.params;
    const { nomepropriedade, localizacao, area_ha } = req.body;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para atualizar propriedade com ID: \"${id}\"`);

    try {
      // --- NOSSA ADIÇÃO (Permissões) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem atualizar propriedades.' });
      }
      
      // 2. Checagem de Hierarquia (se a propriedade pertence ao admin)
      const propertyToUpdate = await prisma.propriedade.findFirst({
         where: { id: id, usuarioId: dataOwnerId }
      });

      if (!propertyToUpdate) {
        return res.status(404).json({ error: 'Propriedade não encontrada ou não pertence à sua organização.' });
      }
      // --- FIM DA ADIÇÃO ---

      const updatedProperty = await prisma.propriedade.update({
        where: { id: id },
        data: {
          nomepropriedade,
          localizacao,
          area_ha,
          usuarioId: dataOwnerId // Garante que o ID do dono não seja alterado
        },
        include: {
          producoes: {
            select: { cultura: true, data: true },
            orderBy: { data: 'desc' }
          }
        }
      });

      // Lógica para extrair culturas (como no original)
      const culturas = updatedProperty.producoes.map(prod => prod.cultura);
      const { producoes, ...rest } = updatedProperty;

      console.log('✅ Propriedade atualizada com sucesso:', updatedProperty.id);
      res.status(200).json({
        message: 'Propriedade atualizada com sucesso!',
        property: { ...rest, culturas }
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao atualizar a propriedade.' });
    }
  },

  // # togglePropertyStatus
  async togglePropertyStatus(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para alterar status da propriedade com ID: \"${id}\"`);
    try {
      // --- NOSSA ADIÇÃO (Permissões) ---
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem alterar o status de propriedades.' });
      }
      // --- FIM DA ADIÇÃO ---

      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          // MODIFICADO: Busca propriedade do "dono" (admin)
          usuarioId: dataOwnerId
        }
      });
      
      if (!property) {
        return res.status(404).json({ error: `Não foi possível encontrar a propriedade com ID \"${id}\".` });
      }

      const novoStatus = property.status === 'ativo' ? 'inativo' : 'ativo';

      await prisma.propriedade.update({
        where: { id: id },
        data: { status: novoStatus }
      });

      console.log(`🔄 Status da propriedade ${id} alterado para: ${novoStatus}`);
      res.status(200).json({ message: `Propriedade ${novoStatus === 'ativo' ? 'ativada' : 'desativada'} com sucesso!` });
    } catch (error) {
      console.error('❌ Erro ao alterar status da propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao alterar o status da propriedade.' });
    }
  }
};