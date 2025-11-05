const prisma = require('../lib/prisma');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { sendPaymentStatusEmail } = require('../service/mailService');

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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️ AVISO: FRONTEND_URL não definida no .env, usando "http://localhost:4200" como padrão.');
    }

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: authenticatedUserId },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const externalReference = `USER-${authenticatedUserId}-${Date.now()}`;

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
        
        // --- CORREÇÃO DE REDIRECIONAMENTO ---
        // 'success' agora aponta para /gerenciamento
        // 'failure' e 'pending' apontam para /assinatura (a página de planos)
        back_urls: {
          success: `${frontendUrl}/gerenciamento?status=success&pref_id=${externalReference}`,
          failure: `${frontendUrl}/assinatura?status=failure&pref_id=${externalReference}`,
          pending: `${frontendUrl}/assinatura?status=pending&pref_id=${externalReference}`,
        },
        // --- FIM DA CORREÇÃO ---
        
        notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL,
        external_reference: externalReference, 
      };

      const response = await preference.create({ body: preferenceData });

      // ... (o resto da função de criação continua igual) ...

      const novoPagamento = await prisma.planosMercadoPago.create({
        data: {
          status: 'Pendente',
          tipo: descricao,
          valor: Number(valor),
          metodoPagamento: 'MercadoPago',
          usuarioId: authenticatedUserId,
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
          response.id,
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

        // 1. Atualiza a tabela de Planos
        await prisma.planosMercadoPago.update({
          where: {
            id: plano.id,
          },
          data: {
            status: novoStatus,
            idPagamentoExterno: paymentId.toString(),
          },
        });

        // ==========================================================
        // === INÍCIO DA CORREÇÃO: Atualizar a tabela 'Usuario' ===
        // ==========================================================
        
        // 2. Se o pagamento foi aprovado, atualiza a tabela principal do usuário
        if (novoStatus === 'Pago/Ativo') {
          
          await prisma.usuario.update({
            where: {
              id: plano.usuarioId // Usa o ID do usuário guardado no plano
            },
            data: {
              planoAtivo: true
              // Opcional: pode querer guardar o tipo de plano aqui também
              // tipoPlano: plano.tipo 
            }
          });
          
          console.log(`✅ Tabela 'Usuario' (ID: ${plano.usuarioId}) atualizada para planoAtivo: true.`);
        }
        
        // ==========================================================
        // === FIM DA CORREÇÃO ======================================
        // ==========================================================

        console.log(
          `✅ Pagamento ${paymentId} (Ref Externa: ${paymentData.external_reference}) atualizado no banco (Status: ${novoStatus}).`
        );
        
        try {
          // Envia o e-mail de status (Aprovado, Recusado, etc.)
          await sendPaymentStatusEmail(
            plano.usuario.email,
            novoStatus,
            plano.tipo,
            plano.valor,
            plano.idAssinaturaExterna, 
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