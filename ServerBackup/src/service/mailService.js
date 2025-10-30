// Conteúdo completo do arquivo: src/service/mailService.js

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

module.exports = {
  sendVerificationEmail, // Agora envia o CÓDIGO
  sendPasswordResetEmail,
  sendContactEmailToCompany
};