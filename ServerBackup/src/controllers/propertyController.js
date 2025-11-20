const prisma = require('../lib/prisma');

// --- NOSSA ADIÇÃO (Helper) ---
//Função para buscar dados do usuário logado (cargo, planos, adminId, permissões)
async function getUserData(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      planos: {
        where: {
          status: 'Pago/Ativo',
          dataExpiracao: { gte: new Date() }
        }
      },
      // ### NOVO: Incluímos as propriedades que ele tem permissão (apenas ID) ###
      propriedadesAcessiveis: {
        select: { id: true }
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
  // # getAllProperties - Busca todas as propriedades (respeitando permissões)
  async getAllProperties(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para listar propriedades do usuário: ${authenticatedUserId}`);
    try {
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);
      
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }

      // Configuração inicial do filtro: Propriedades do Admin
      const whereClause = {
        usuarioId: dataOwnerId
      };

      // ### LÓGICA DE FILTRAGEM DE ACESSO ###
      // Se NÃO for Administrador, aplica o filtro das checkboxes
      if (user.cargo !== 'ADMINISTRADOR') {
        const allowedIds = user.propriedadesAcessiveis.map(p => p.id);
        
        // Se o array estiver vazio, ele não verá nada (segurança)
        // Adiciona condição: ID da propriedade deve estar na lista de permitidos
        whereClause.id = { in: allowedIds };
        
        console.log(`🔒 Sub-usuário ${user.email} limitado a ${allowedIds.length} propriedades.`);
      }

      const properties = await prisma.propriedade.findMany({
        where: whereClause,
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
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);
      
      if (!dataOwnerId) {
        return res.status(403).json({ error: 'Usuário administrador não encontrado.' });
      }

      // ### VERIFICAÇÃO DE SEGURANÇA INDIVIDUAL ###
      if (user.cargo !== 'ADMINISTRADOR') {
         const isAllowed = user.propriedadesAcessiveis.some(p => p.id === id);
         if (!isAllowed) {
             // Retorna 404 para não revelar existência ou 403
             return res.status(404).json({ error: `Propriedade não encontrada ou sem permissão de acesso.` });
         }
      }

      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
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
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem criar propriedades.' });
      }

      // 2. Limite de Plano (Só se aplica ao Administrador)
      if (user.cargo === 'ADMINISTRADOR') {
        const planoBaseAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('base'));
        const planoGoldAtivo = user.planos.some(p => p.tipo.toLowerCase().includes('gold'));

        if (planoBaseAtivo && !planoGoldAtivo) {
          const propertyCount = await prisma.propriedade.count({
            where: { usuarioId: user.id }
          });

          if (propertyCount >= 1) {
            return res.status(403).json({ error: 'Seu Plano Base permite o cadastro de apenas 1 propriedade.' });
          }
        }
      }

      const newProperty = await prisma.propriedade.create({
        data: {
          nomepropriedade,
          localizacao,
          area_ha,
          status,
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
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem atualizar propriedades.' });
      }
      
      // 2. Checagem de Hierarquia e Permissão
      // Mesmo gerentes devem ter acesso à propriedade para editá-la
      const whereClause = { id: id, usuarioId: dataOwnerId };
      
      if (user.cargo === 'GERENTE') {
         const allowedIds = user.propriedadesAcessiveis.map(p => p.id);
         if (!allowedIds.includes(id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta propriedade.' });
         }
      }

      const propertyToUpdate = await prisma.propriedade.findFirst({
         where: whereClause
      });

      if (!propertyToUpdate) {
        return res.status(404).json({ error: 'Propriedade não encontrada ou não pertence à sua organização.' });
      }

      const updatedProperty = await prisma.propriedade.update({
        where: { id: id },
        data: {
          nomepropriedade,
          localizacao,
          area_ha,
          usuarioId: dataOwnerId
        },
        include: {
          producoes: {
            select: { cultura: true, data: true },
            orderBy: { data: 'desc' }
          }
        }
      });

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
      const { user, dataOwnerId } = await getUserData(authenticatedUserId);

      // 1. Permissão de Cargo
      if (user.cargo === 'FUNCIONARIO') {
        return res.status(403).json({ error: 'Funcionários não podem alterar o status de propriedades.' });
      }

      // Verificar se Gerente tem permissão naquela propriedade
      if (user.cargo === 'GERENTE') {
         const allowedIds = user.propriedadesAcessiveis.map(p => p.id);
         if (!allowedIds.includes(id)) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar esta propriedade.' });
         }
      }

      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
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