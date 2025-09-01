const { sendContactEmailToCompany } = require('../service/mailService');

module.exports = {
  async sendContactEmail(req, res) {
    console.log('➡️ Requisição recebida para enviar e-mail de contato');
    const { nome, email, mensagem } = req.body;

    if (!nome || !email || !mensagem) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, email, mensagem.'
      });
    }

    try {
      await sendContactEmailToCompany(nome, email, mensagem);
      console.log(`✅ E-mail de contato de ${email} enviado com sucesso.`);

      return res.status(200).json({
        message: 'Sua mensagem foi enviada com sucesso! Agradecemos o seu contato.'
      });
    } catch (err) {
      console.error('❌ Erro no envio de e-mail de contato:', err.message);
      return res.status(500).json({ error: 'Erro ao enviar a sua mensagem.' });
    }
  },
};