const prisma = require('../lib/prisma');

module.exports = {
  // # getAllFinanceiros
  async getAllFinanceiros(req, res) {
    const authenticatedUserId = req.userId;
    console.log(`➡️  Requisição para listar todos os registros financeiros do usuário ${authenticatedUserId}`);
    try {
      const financeiros = await prisma.financeiro.findMany({
        where: {
          propriedade: {
            usuarioId: authenticatedUserId,
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
      const financeiro = await prisma.financeiro.findFirst({
        where: {
          id: financeiroId,
          propriedade: {
            usuarioId: authenticatedUserId,
          },
        },
        include: {
          propriedade: true,
        },
      });

      if (!financeiro) {
        console.warn(`⚠️ Registro financeiro com ID ${financeiroId} não encontrado ou não pertence ao usuário.`);
        return res.status(404).json({ error: `Registro financeiro com ID ${financeiroId} não encontrado.` });
      }

      console.log(`✅ Registro financeiro com ID ${financeiro.id} encontrado com sucesso.`);
      res.status(200).json(financeiro);
    } catch (error) {
      console.error('❌ Erro ao buscar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao buscar este registro financeiro.' });
    }
  },

  // # createFinanceiro - CORRIGIDO
  async createFinanceiro(req, res) {
    // CORREÇÃO: Espera 'propriedadeId' no corpo da requisição em vez de 'nomepropriedade'
    const { propriedadeId, descricao, valor, data, tipo } = req.body;
    const authenticatedUserId = req.userId;

    // CORREÇÃO: Validação atualizada para 'propriedadeId'
    if (!propriedadeId || !descricao || valor === undefined || !data || !tipo) {
      return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios: propriedadeId, descricao, valor, data e tipo.' });
    }

    try {
      // CORREÇÃO: Verifica se a propriedade (pelo ID) pertence ao usuário
      const property = await prisma.propriedade.findFirst({
        where: {
          id: propriedadeId,
          usuarioId: authenticatedUserId
        }
      });

      if (!property) {
        return res.status(403).json({ error: `A propriedade com ID "${propriedadeId}" não existe ou você não tem permissão para acessá-la.` });
      }

      const newFinanceiro = await prisma.financeiro.create({
        data: {
          descricao,
          valor,
          data: new Date(data),
          tipo,
          propriedade: {
            // CORREÇÃO: Conecta usando o ID da propriedade
            connect: { id: propriedadeId },
          },
        },
        include: {
          propriedade: true,
        },
      });
      res.status(201).json({
        message: 'Registro financeiro cadastrado com sucesso!',
        financeiro: newFinanceiro,
      });
    } catch (error) {
      console.error('❌ Erro ao criar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Não foi possível cadastrar o registro financeiro.' });
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
      const existingFinanceiro = await prisma.financeiro.findFirst({
        where: {
          id: financeiroId,
          propriedade: {
            usuarioId: authenticatedUserId,
          },
        },
      });

      if (!existingFinanceiro) {
        return res.status(404).json({ error: `Registro financeiro com ID "${id}" não encontrado ou não pertence a você.` });
      }

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

  // # deleteFinanceiro
  async deleteFinanceiro(req, res) {
    const { id } = req.params;
    const authenticatedUserId = req.userId;
    const financeiroId = parseInt(id, 10);

    if (isNaN(financeiroId)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    try {
      const existingFinanceiro = await prisma.financeiro.findFirst({
        where: {
          id: financeiroId,
          propriedade: {
            usuarioId: authenticatedUserId,
          },
        },
      });

      if (!existingFinanceiro) {
        return res.status(404).json({ error: `Registro financeiro com ID "${id}" não encontrado ou não pertence a você.` });
      }

      await prisma.financeiro.delete({
        where: { id: financeiroId },
      });
      res.status(204).send();
    } catch (error) {
      console.error('❌ Erro ao deletar registro financeiro:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao deletar o registro financeiro.' });
    }
  },
};