const agentService = require('../service/agentService');

module.exports = {
  async handleChat(req, res) {
    const { question, history } = req.body; // Extrai o histórico do corpo da requisição
    console.log(`➡️  Pergunta recebida para a assistente: "${question}"`);

    if (!question) {
      return res.status(400).json({ error: 'A pergunta é obrigatória.' });
    }

    try {
      // Passa a pergunta e o histórico para o serviço
      const response = await agentService.getAgentResponse(question, history);
      console.log(`✅ Resposta da assistente gerada com sucesso.`);
      res.status(200).json({ response });
    } catch (error) {
      console.error('❌ Erro no controller do agente:', error);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao processar sua pergunta.' });
    }
  },
};