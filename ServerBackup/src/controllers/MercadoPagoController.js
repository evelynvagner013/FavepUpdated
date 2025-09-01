const prisma = require('../lib/prisma');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const preapproval = new PreApproval(client);

const getFrequencyConfig = (tipoPlano) => {
  switch (tipoPlano) {
    case 'Semanal':
      return { frequency: 7, frequency_type: 'days' };
    case 'Mensal':
      return { frequency: 1, frequency_type: 'months' };
    case 'Trimestral':
      return { frequency: 3, frequency_type: 'months' };
    case 'Semestral':
      return { frequency: 6, frequency_type: 'months' };
    case 'Anual':
      return { frequency: 1, frequency_type: 'years' };
    default:
      return { frequency: 1, frequency_type: 'months' };
  }
};

module.exports = {
  async createSubscription(req, res) {
    const { tipo, valor } = req.body;
    const authenticatedUserId = req.userId;

    console.log(`➡️  Requisição para criar assinatura [${tipo}] para o usuário: ${authenticatedUserId}`);

    if (!tipo || !valor) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo e valor.' });
    }

    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: authenticatedUserId } });
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const frequencyConfig = getFrequencyConfig(tipo);
      const planResponse = await preapproval.create({
        body: {
          reason: `Assinatura do plano ${tipo} - Favep - Gerenciamento Agrícola`,
          auto_recurring: {
            frequency: frequencyConfig.frequency,
            frequency_type: frequencyConfig.frequency_type,
            transaction_amount: Number(valor),
            currency_id: 'BRL'
          },
          back_url: 'https://seusite.com/assinatura/sucesso',
          payer_email: usuario.email,
          notification_url: 'https://acd4ea7a7ca6.ngrok-free.app/api/mercado-pago/webhook',
          external_reference: `USER-${authenticatedUserId}-PLAN-${Date.now()}`
        }
      });
      console.log('✅ Link de pagamento gerado pelo Mercado Pago.');

      const novoPlano = await prisma.planosMercadoPago.create({
        data: {
          status: 'Pendente',
          tipo,
          valor: Number(valor),
          metodoPagamento: 'MercadoPago',
          usuarioId: authenticatedUserId,
          idAssinaturaExterna: planResponse.id 
        }
      });
      console.log(`✅ Plano [${tipo}] registrado no DB com ID: ${novoPlano.id}`);
      
      res.status(201).json({
        message: 'Link de pagamento gerado com sucesso!',
        planoDBId: novoPlano.id,
        init_point: planResponse.init_point,
        idAssinaturaMercadoPago: planResponse.id 
      });

    } catch (error) {
      const errorMessage = error.cause?.message || error.message;
      console.error('❌ Erro ao criar assinatura:', errorMessage);
      res.status(500).json({ error: 'Ops! Ocorreu um erro ao processar a assinatura.' });
    }
  },
  
  async handleWebhook(req, res) {
    const notification = req.body;
    console.log('🔔 Webhook do Mercado Pago recebido:', JSON.stringify(notification, null, 2));

    if (notification.type === 'preapproval' && notification.data && notification.data.id) {
        const preapprovalId = notification.data.id;
        console.log(`🔄 Processando notificação para a assinatura ID: ${preapprovalId}`);

        try {
            const subscriptionData = await preapproval.get({ preapprovalId });

            if (!subscriptionData || !subscriptionData.id) {
                console.warn(`⚠️ Assinatura com ID ${preapprovalId} não encontrada no Mercado Pago.`);
                return res.status(200).send('Notificação recebida, mas assinatura não encontrada no MP.');
            }

            let novoStatus;
            switch (subscriptionData.status) {
                case 'authorized':
                    novoStatus = 'Pago/Ativo';
                    break;
                case 'paused':
                case 'cancelled':
                    novoStatus = 'Cancelado';
                    break;
                default:
                    novoStatus = 'Pendente'; 
                    break;
            }

            const updatedPlano = await prisma.planosMercadoPago.update({
                where: {
                    idAssinaturaExterna: subscriptionData.id,
                },
                data: {
                    status: novoStatus,
                },
            });

            console.log(`✅ Status do plano ID [${updatedPlano.id}] (Assinatura Externa: ${updatedPlano.idAssinaturaExterna}) atualizado para: ${novoStatus}`);

        } catch (error) {
            console.error(`❌ Erro ao processar o webhook para a assinatura ${preapprovalId}:`, error);
            return res.status(200).send('Erro ao processar o webhook.');
        }
    }

  
    res.status(200).send('Webhook recebido com sucesso.');
  }
};