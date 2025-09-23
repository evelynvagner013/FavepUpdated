const prisma = require('../lib/prisma');

module.exports = {
  // # getAllProperties - Busca todas as propriedades (ativas e inativas)
  async getAllProperties(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para listar todas as propriedades do usuário: ${authenticatedUserId}`);
    try {
      const properties = await prisma.propriedade.findMany({
        where: { 
          usuarioId: authenticatedUserId,
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

  // # getPropertyById - CORRIGIDO: Agora busca a propriedade sem verificar o status 'ativo'
  async getPropertyById(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para buscar propriedade com ID: "${id}"`);
    try {
      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          usuarioId: authenticatedUserId
          // A linha 'status: 'ativo'' foi removida para buscar por ID independentemente do status
        },
        include: {
          usuario: {
            select: { nome: true, email: true }
          },
          producoes: {
            select: { cultura: true, data: true },
            orderBy: { data: 'desc' }
          }
        },
      });

      if (!property) {
        console.warn(`⚠️ Propriedade com ID "${id}" não encontrada ou não pertence ao usuário.`);
        return res.status(404).json({ error: `Propriedade com ID "${id}" não encontrada.` });
      }

      const culturas = property.producoes.map(prod => prod.cultura);
      const { producoes, ...rest } = property;

      console.log('✅ Propriedade encontrada com sucesso:', property.id);
      res.status(200).json({ ...rest, culturas });
    } catch (error) {
      console.error('❌ Erro ao buscar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar esta propriedade.' });
    }
  },

  // # createProperty - Adicionado 'status' padrão como 'ativo'
  async createProperty(req, res) {
    const { nomepropriedade, area_ha, localizacao } = req.body;
    const authenticatedUserId = req.userId;
    console.log('➡️ Requisição recebida para criar uma nova propriedade');

    if (!nomepropriedade || area_ha === undefined || !localizacao) {
      return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios: nome da propriedade, área em hectares e localização.' });
    }

    try {

      const newProperty = await prisma.propriedade.create({
        data: {
          nomepropriedade,
          area_ha,
          localizacao,
          status: 'ativo',
          usuario: {
            connect: { id: authenticatedUserId },
          },
        },
        include: {
          usuario: {
            select: { nome: true, email: true }
          },
        },
      });

      console.log('✅ Propriedade criada com sucesso:', newProperty.id);
      res.status(201).json({
        message: 'Propriedade cadastrada com sucesso!',
        property: { ...newProperty, culturas: [] }
      });
    } catch (error) {
      console.error('❌ Erro ao criar propriedade:', error);
      if (error.code === 'P2025') {
          return res.status(400).json({ error: `O usuário autenticado não foi encontrado.` });
      }
      res.status(500).json({ error: 'Ops! Não foi possível cadastrar a propriedade.' });
    }
  },

  // # updateProperty - Sem alterações
  async updateProperty(req, res) {
    const { id } = req.params;
    const { nomepropriedade, area_ha, localizacao } = req.body;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para atualizar propriedade com ID: "${id}"`);

    try {
      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          usuarioId: authenticatedUserId
        }
      });
      
      if (!property) {
        return res.status(444).json({ error: `Não foi possível encontrar a propriedade com ID "${id}" para atualizar.` });
      }

      const updatedProperty = await prisma.propriedade.update({
        where: {
          id: id,
        },
        data: {
          nomepropriedade, 
          area_ha,
          localizacao,
        },
        include: {
          usuario: {
            select: { nome: true, email: true }
          },
          producoes: {
            select: { cultura: true, data: true },
            orderBy: { data: 'desc' }
          }
        },
      });

      const culturas = updatedProperty.producoes.map(prod => prod.cultura);
      const { producoes, ...rest } = updatedProperty;

      console.log('🔄 Propriedade atualizada com sucesso:', updatedProperty.id);
      res.status(200).json({
        message: 'Propriedade atualizada com sucesso!',
        property: { ...rest, culturas }
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao atualizar a propriedade.' });
    }
  },

  // # togglePropertyStatus - Sem alterações
  async togglePropertyStatus(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para alterar status da propriedade com ID: "${id}"`);
    try {
      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          usuarioId: authenticatedUserId
        }
      });
      
      if (!property) {
        return res.status(404).json({ error: `Não foi possível encontrar a propriedade com ID "${id}".` });
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
  },
};