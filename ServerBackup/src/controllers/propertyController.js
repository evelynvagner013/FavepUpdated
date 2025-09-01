const prisma = require('../lib/prisma');

module.exports = {
  // # getAllProperties
  async getAllProperties(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para listar todas as propriedades do usuário: ${authenticatedUserId}`);
    try {
      const properties = await prisma.propriedade.findMany({
        where: { usuarioId: authenticatedUserId },
        include: {
          // CORREÇÃO: Seleciona apenas campos seguros do usuário para evitar expor a senha.
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

  // # getPropertyById - CORRIGIDO
  async getPropertyById(req, res) {
    const { id } = req.params; // Usa o ID da URL
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para buscar propriedade com ID: "${id}"`);
    try {
      const property = await prisma.propriedade.findFirst({
        where: {
          id: id, // Busca pelo ID
          usuarioId: authenticatedUserId,
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

  // # createProperty - CORRIGIDO
  async createProperty(req, res) {
    const { nomepropriedade, area_ha, localizacao } = req.body;
    const authenticatedUserId = req.userId;
    console.log('➡️ Requisição recebida para criar uma nova propriedade');

    if (!nomepropriedade || area_ha === undefined || !localizacao) {
      return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios: nome da propriedade, área em hectares e localização.' });
    }

    try {
      // REMOVIDO: Verificação de nome de propriedade existente, pois agora nomes podem ser repetidos.

      const newProperty = await prisma.propriedade.create({
        data: {
          nomepropriedade,
          area_ha,
          localizacao,
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
        property: { ...newProperty, culturas: [] } // Retorna culturas vazio pois acabou de ser criada
      });
    } catch (error) {
      console.error('❌ Erro ao criar propriedade:', error);
      if (error.code === 'P2025') {
          return res.status(400).json({ error: `O usuário autenticado não foi encontrado.` });
      }
      res.status(500).json({ error: 'Ops! Não foi possível cadastrar a propriedade.' });
    }
  },

  // # updateProperty - CORRIGIDO
  async updateProperty(req, res) {
    const { id } = req.params; // Usa o ID da URL
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
        return res.status(404).json({ error: `Não foi possível encontrar a propriedade com ID "${id}" para atualizar.` });
      }

      const updatedProperty = await prisma.propriedade.update({
        where: {
          id: id,
        },
        data: {
          nomepropriedade, // Permite atualizar o nome
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

  // # deleteProperty - CORRIGIDO
  async deleteProperty(req, res) {
    const { id } = req.params; // Usa o ID da URL
    const authenticatedUserId = req.userId;
    console.log(`➡️ Requisição recebida para deletar propriedade com ID: "${id}"`);
    try {
      const property = await prisma.propriedade.findFirst({
        where: {
          id: id,
          usuarioId: authenticatedUserId
        }
      });
      
      if (!property) {
        return res.status(404).json({ error: `Não foi possível encontrar a propriedade com ID "${id}" para deletar.` });
      }

      // Deleta registros relacionados primeiro para evitar erros de chave estrangeira
      await prisma.financeiro.deleteMany({
        where: { propriedadeId: id },
      });
      await prisma.producao.deleteMany({
        where: { propriedadeId: id },
      });
      
      // Finalmente, deleta a propriedade
      await prisma.propriedade.delete({
        where: { id: id },
      });

      console.log('🗑️ Propriedade e dados associados deletados com sucesso:', id);
      res.status(204).send();
    } catch (error) {
      console.error('❌ Erro ao deletar propriedade:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao deletar a propriedade.' });
    }
  },
};
