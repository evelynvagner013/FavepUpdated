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

// --- MODIFICADO ---
// Agora envia um código de 6 dígitos
async function sendVerificationEmail(to, code) { 
  const mailOptions = {
    from: `"Favep" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Seu Código de Verificação - Favep', // Assunto modificado
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

// --- SEM MUDANÇAS ---
async function sendPasswordResetEmail(to, token) {
  // ... (seu código original de redefinição de senha com LINK)
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  const mailOptions = {
    from: `"Favep" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Redefinição de Senha - Favep',
    html: `... (seu HTML original de redefinição de senha) ...`
  };
  await transporter.sendMail(mailOptions);
}

// --- SEM MUDANÇAS ---
async function sendContactEmailToCompany(fromName, fromEmail, message) {
  // ... (seu código original de contato)
  const mailOptions = {
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: fromEmail,
    subject: `Nova Mensagem de Contato de ${fromName}`,
    html: `... (seu HTML original de contato) ...`
  };
  await transporter.sendMail(mailOptions);
}

// --- NOVO (Etapa 3) ---
// Envia e-mail de status de pagamento
async function sendPaymentStatusEmail(userEmail, status, tipoPlano, valor, preferenceId, paymentId) {
  
  let subject = '';
  let statusMessage = '';

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
  sendPaymentStatusEmail // Exporta a nova função
};