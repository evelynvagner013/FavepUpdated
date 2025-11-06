const prisma = require('../lib/prisma');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { sendPaymentStatusEmail } = require('../service/mailService');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const preference = new Preference(client);
const payment = new Payment(client);

// Função auxiliar para adicionar dias a uma data
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  /**
   * @desc Cria uma preferência de pagamento (Checkout Pro)
   * @route POST /mercado-pago/create-preference
   */
  async createPreference(req, res) {
    // --- LÓGICA DE LIMPEZA (NOVO) ---
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      
      // Esta rotina SÓ apaga registros PENDENTES.
      // Registros 'Pago/Ativo' (mesmo que expirados) não são afetados.
      const deleted = await prisma.planosMercadoPago.deleteMany({
        where: {
          status: 'Pendente',
          dataAssinatura: { lt: twelveHoursAgo } // lt = less than (anterior a)
        }
      });
      
      if (deleted.count > 0) {
        console.log(`🧹 Limpeza automática: ${deleted.count} pagamentos pendentes expirados foram removidos.`);
      }
    } catch (cleanupError) {
      console.error("❌ Erro ao limpar pagamentos pendentes:", cleanupError);
    }
    // --- FIM DA LÓGICA DE LIMPEZA ---

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

      let valorFinal = Number(valor);
      let aplicouDesconto = false;
      let tituloDescricao = descricao;

      const planoAtivo = await prisma.planosMercadoPago.findFirst({
        where: {
          usuarioId: authenticatedUserId,
          status: 'Pago/Ativo',
          dataExpiracao: {
            gte: new Date()
          }
        },
        orderBy: {
          dataExpiracao: 'desc'
        }
      });

      if (planoAtivo) {
        if (planoAtivo.tipo === descricao) {
          console.warn(`⚠️ Usuário ${authenticatedUserId} tentou comprar o mesmo plano [${descricao}] que já está ativo.`);
          return res.status(403).json({ 
            error: 'Você já possui este plano ativo. Aguarde a expiração para comprar novamente ou escolha um plano diferente.' 
          });
        }
        
        if (planoAtivo.dataAtivacao) {
          const agora = new Date();
          const dataAtivacaoPlano = new Date(planoAtivo.dataAtivacao);
          const diffTime = Math.abs(agora.getTime() - dataAtivacaoPlano.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 10) {
            valorFinal = valorFinal * 0.89; // Aplicando 11% de desconto
            aplicouDesconto = true;
            tituloDescricao = `${descricao} (Troca c/ 11% Desconto)`;
            console.log(`✅ Desconto de 11% aplicado para troca de plano. Novo valor: ${valorFinal}`);
          }
        }
      }

      const externalReference = `USER-${authenticatedUserId}-${Date.now()}`;

      const preferenceData = {
        items: [
          {
            title: tituloDescricao,
            quantity: 1,
            unit_price: Number(valorFinal.toFixed(2)),
            currency_id: 'BRL',
          },
        ],
        payer: { email: usuario.email },
        
        back_urls: {
          success: `${frontendUrl}/gerenciamento?status=success&pref_id=${externalReference}`,
          failure: `${frontendUrl}/assinatura?status=failure&pref_id=${externalReference}`,
          pending: `${frontendUrl}/assinatura?status=pending&pref_id=${externalReference}`,
        },
        
        notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL,
        external_reference: externalReference, 
      };

      const response = await preference.create({ body: preferenceData });

      const novoPagamento = await prisma.planosMercadoPago.create({
        data: {
          status: 'Pendente',
          tipo: tituloDescricao,
          valor: Number(valorFinal.toFixed(2)),
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
          null,
          response.init_point // URL de pagamento para o botão do e-mail
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
        let dataAtivacao = null;
        let dataExpiracao = null;

        switch (paymentData.status) {
          case 'approved':
            novoStatus = 'Pago/Ativo';
            dataAtivacao = new Date();
            dataExpiracao = addDays(dataAtivacao, 30);
            console.log(`🗓️ Plano será ativado em: ${dataAtivacao.toISOString()}, Expira em: ${dataExpiracao.toISOString()}`);
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
              select: { email: true, id: true }
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

        if (novoStatus === 'Pago/Ativo') {
          console.log(`🔄 Inativando planos antigos (exceto ${plano.id}) para o usuário ${plano.usuario.id}...`);
          
          await prisma.planosMercadoPago.updateMany({
            where: {
              usuarioId: plano.usuario.id,
              status: 'Pago/Ativo',
              id: { not: plano.id }
            },
            data: {
              status: 'Inativo/Trocado',
              dataExpiracao: new Date()
            }
          });
          
          console.log('✅ Planos antigos inativados.');
        }

        await prisma.planosMercadoPago.update({
          where: {
            id: plano.id,
          },
          data: {
            status: novoStatus,
            idPagamentoExterno: paymentId.toString(),
            ...(novoStatus === 'Pago/Ativo' && {
              dataAtivacao: dataAtivacao,
              dataExpiracao: dataExpiracao
            })
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