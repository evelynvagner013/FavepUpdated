const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// # sendVerificationEmail
async function sendVerificationEmail(to, code) { 
  const mailOptions = {
    from: `"Favep" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Seu Código de Verificação - Favep',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
        <h2>Bem-vindo à Favep!</h2>
        <p>Obrigado por se registrar. Use este código para verificar seu e-mail:</p>
        <h3 style="font-size: 32px; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 0; border-radius: 5px; margin: 20px 0;">
          ${code}
        </h3>
        <p style="font-size: 0.9em; color: #777;">Este código expira em 10 minutos.</p>
        <p style="font-size: 0.9em; color: #777;">Se você não se registrou, por favor, ignore este e-mail.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

// # sendPasswordResetEmail
async function sendPasswordResetEmail(to, token) {
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  const mailOptions = {
    from: `"Favep" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Redefinição de Senha - Favep',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
        <h2>Redefinição de Senha</h2>
        <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova:</p>
        <div style="margin: 30px 0;">
            <a href="${resetLink}" target="_blank" style="background-color: #28a745; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Redefinir Senha
            </a>
        </div>
        <p style="font-size: 0.9em; color: #777;">Se o botão não funcionar, copie e cole este link no seu navegador:<br>${resetLink}</p>
        <p style="font-size: 0.9em; color: #777;">Se você não solicitou isso, por favor, ignore este e-mail.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

// # sendContactEmailToCompany
async function sendContactEmailToCompany(fromName, fromEmail, message) {
  const mailOptions = {
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: fromEmail,
    subject: `Nova Mensagem de Contato de ${fromName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2>Nova Mensagem de Contato</h2>
        <p><strong>De:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>Mensagem:</strong></p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

// # sendPaymentStatusEmail
async function sendPaymentStatusEmail(userEmail, status, tipoPlano, valor, preferenceId, paymentId, initPoint = null) {
  
  let subject = '';
  let statusMessage = '';
  let paymentButtonHtml = '';

  switch (status) {
    case 'Pago/Ativo':
      subject = 'Pagamento Aprovado - Favep';
      statusMessage = 'Seu pagamento foi aprovado e seu plano já está ativo!';
      break;
    case 'Rejeitado':
      subject = 'Pagamento Recusado - Favep';
      statusMessage = 'Houve um problema ao processar seu pagamento e ele foi recusado.';
      break;
    case 'Em Análise':
      subject = 'Pagamento em Análise - Favep';
      statusMessage = 'Seu pagamento está sendo revisado. Avisaremos assim que for concluído.';
      break;
    case 'Pendente':
      subject = 'Pagamento Pendente - Favep';
      statusMessage = 'Iniciamos sua solicitação de assinatura. Para ativá-la, por favor, conclua o pagamento.';
      if (initPoint) {
        paymentButtonHtml = `
        <div style="margin: 30px 0; text-align: center;">
            <a href="${initPoint}" target="_blank" style="background-color: #009EE3; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Concluir Pagamento
            </a>
        </div>
        <p style="font-size: 0.9em; color: #777; text-align: center;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <span style="word-break: break-all;">${initPoint}</span>
        </p>
        <p style="font-size: 0.9em; color: #777; text-align: center;">
            Este link de pagamento é válido por 12 horas.
        </p>
        `;
      }
      break;
    default:
      subject = 'Atualização do Pagamento - Favep';
      statusMessage = `O status do seu pagamento foi atualizado para: ${status}.`;
  }

  const mailOptions = {
    from: `"Favep" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2>Olá!</h2>
        <p>Recebemos uma atualização sobre a sua assinatura no Favep.</p>
        <p style="font-size: 1.1em;">
          <strong>${statusMessage}</strong>
        </p>
        
        ${paymentButtonHtml} 
        
        <hr style="border: 0; border-top: 1px solid #eee;">
        <h3>Detalhes da Transação:</h3>
        <ul>
          <li><strong>Plano:</strong> ${tipoPlano}</li>
          <li><strong>Valor:</strong> R$ ${valor.toFixed(2)}</li>
          <li><strong>Status:</strong> ${status}</li>
          <li><strong>ID da Assinatura (Preferência):</strong> ${preferenceId}</li>
          <li><strong>ID do Pagamento (Ordem):</strong> ${paymentId || 'N/A'}</li>
        </ul>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 0.9em; color: #777;">
          Se você tiver alguma dúvida, entre em contato conosco.<br>
          Equipe Favep.
        </p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ E-mail de status (${status}) enviado para ${userEmail}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar e-mail de status para ${userEmail}:`, error);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendContactEmailToCompany,
  sendPaymentStatusEmail
};