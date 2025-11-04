const prisma = require('../lib/prisma');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { sendPaymentStatusEmail } = require('../service/mailService');

// 🔹 Inicializa o cliente do Mercado Pago com o Access Token do .env
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const preference = new Preference(client);
const payment = new Payment(client);

module.exports = {
  /**
   * @desc Cria uma preferência de pagamento (Checkout Pro)
   * @route POST /mercado-pago/create-preference
   */
  async createPreference(req, res) {
    const { descricao, valor } = req.body;
    const authenticatedUserId = req.userId;

    console.log(`➡️ Requisição para gerar pagamento [${descricao}] para o usuário: ${authenticatedUserId}`);

    if (!descricao || !valor) {
      return res.status(400).json({ error: 'Campos obrigatórios: descricao e valor.' });
    }

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: authenticatedUserId },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // 1. Criamos a referência externa primeiro
      const externalReference = `USER-${authenticatedUserId}-${Date.now()}`;

      // 🔹 Monta os dados da preferência (Checkout Pro)
      const preferenceData = {
        items: [
          {
            title: descricao,
            quantity: 1,
            unit_price: Number(valor),
            currency_id: 'BRL',
          },
        ],
        payer: { email: usuario.email },
        back_urls: {
          success: 'https://www.google.com',
          failure: 'https://www.google.com',
          pending: 'https://www.google.com',
        },
        auto_return: 'approved',
        notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL,
        external_reference: externalReference, // 2. Usamos a referência aqui
      };

      const response = await preference.create({ body: preferenceData });

      // 🔹 Registra o pagamento no banco (status inicial: Pendente)
      const novoPagamento = await prisma.planosMercadoPago.create({
        data: {
          status: 'Pendente',
          tipo: descricao,
          valor: Number(valor),
          metodoPagamento: 'MercadoPago',
          usuarioId: authenticatedUserId,
          // 3. Salvamos a external_reference como nossa chave de ligação
          idAssinaturaExterna: externalReference, 
        },
      });

      console.log('✅ Preferência criada com sucesso no Mercado Pago.');
      
      try {
        await sendPaymentStatusEmail(
          usuario.email, 
          'Pendente', 
          novoPagamento.tipo, 
          novoPagamento.valor, 
          response.id, // Podemos enviar o ID da Preferência (response.id) para o usuário ver
          null
        );
      } catch (emailError) {
        console.error("❌ Erro ao enviar e-mail de 'Pendente' na criação da preferência:", emailError);
      }
      
      res.status(201).json({
        message: 'Link de pagamento gerado com sucesso!',
        init_point: response.init_point,
        preferenceId: response.id,
        planoDBId: novoPagamento.id,
      });
    } catch (error) {
      console.error('❌ Erro ao criar preferência:', error.message);
      res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
    }
  },


  /**
   * @desc Webhook do Mercado Pago (notificação de pagamento)
   * @route POST /mercado-pago/webhook
   */
  async handleWebhook(req, res) {
    const notification = req.body;
    console.log('🔔 Webhook do Mercado Pago recebido:', JSON.stringify(notification, null, 2));

    try {
      if (notification.type === 'payment' && notification.data && notification.data.id) {
        const paymentId = notification.data.id;
        console.log(`🔄 Processando notificação de pagamento ID: ${paymentId}`);

        const paymentData = await payment.get({ id: paymentId });
        
        // --- Linha de LOG de DEBUG removida מכאן ---

        // 4. Mudamos a verificação: agora procuramos 'external_reference'
        if (!paymentData || !paymentData.status || !paymentData.external_reference) {
          console.warn(`⚠️ Pagamento ${paymentId} não encontrado ou não possui 'status' ou 'external_reference'.`);
          return res.status(200).send('Pagamento não encontrado ou dados incompletos.');
        }

        let novoStatus;
        switch (paymentData.status) {
          case 'approved':
            novoStatus = 'Pago/Ativo';
            break;
          case 'in_process':
            novoStatus = 'Em Análise';
            break;
          case 'rejected':
            novoStatus = 'Rejeitado';
            break;
          default:
            novoStatus = 'Pendente';
        }

        // 5. Buscamos o plano no DB usando a 'external_reference'
        const plano = await prisma.planosMercadoPago.findUnique({
          where: {
            idAssinaturaExterna: paymentData.external_reference,
          },
          include: {
            usuario: {
              select: { email: true }
            }
          }
        });

        if (!plano) {
          console.warn(`⚠️ Nenhum plano encontrado com a External Reference: ${paymentData.external_reference}.`);
          return res.status(200).send('Plano não encontrado no banco de dados.');
        }
        
        if (plano.status === novoStatus) {
           console.log(`ℹ️ Status (${novoStatus}) já está atualizado para a Ref Externa: ${paymentData.external_reference}. Ignorando.`);
           return res.status(200).send('Status já atualizado.');
        }

        await prisma.planosMercadoPago.update({
          where: {
            id: plano.id,
          },
          data: {
            status: novoStatus,
            idPagamentoExterno: paymentId.toString(),
          },
        });

        console.log(
          `✅ Pagamento ${paymentId} (Ref Externa: ${paymentData.external_reference}) atualizado no banco (Status: ${novoStatus}).`
        );
        
        try {
          await sendPaymentStatusEmail(
            plano.usuario.email,
            novoStatus,
            plano.tipo,
            plano.valor,
            plano.idAssinaturaExterna, // (que é a external_reference)
            paymentId.toString()
          );
        } catch (emailError) {
          console.error("❌ Erro ao enviar e-mail de status no webhook:", emailError);
        }

      }

      res.status(200).send('Webhook processado com sucesso.');
    } catch (error) {
      console.error('❌ Erro ao processar webhook do Mercado Pago:', error.message);
      res.status(500).send('Erro ao processar o webhook.');
    }
  },
};