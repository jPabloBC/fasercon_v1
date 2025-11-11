import nodemailer from 'nodemailer'

// Configuración del transportador de email usando Titan
const transporter = nodemailer.createTransport({
  host: 'smtp.titan.email', // Titan Email SMTP
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER, // gerencia@ingenit.cl
    pass: process.env.EMAIL_PASSWORD, // Tu contraseña de Titan
  },
})

// Verificar la configuración del transportador
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify()
    console.log('✅ Email configuration is valid')
    return true
  } catch (error) {
    console.error('❌ Email configuration error:', error)
    return false
  }
}

// Función para enviar email de reset de contraseña
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
) => {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
  
  const mailOptions = {
    from: {
      name: 'Fasercon - Administración',
      address: process.env.EMAIL_USER!,
    },
    to: email,
    subject: 'Restablece tu contraseña - Fasercon',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablece tu contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Fasercon</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0;">Administración de Sistema</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2d3748; margin-top: 0;">Hola ${userName},</h2>
            
            <p>Has solicitado restablecer tu contraseña para acceder al panel de administración de Fasercon.</p>
            
            <p>Para crear una nueva contraseña, haz clic en el botón de abajo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold;
                        font-size: 16px;">
                Restablecer Contraseña
              </a>
            </div>
            
            <p style="font-size: 14px; color: #718096;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
            </p>
            <p style="font-size: 14px; color: #4299e1; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <div style="background: #fed7d7; border-left: 4px solid #fc8181; padding: 15px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #c53030;">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por seguridad.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #718096;">
              Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña actual seguirá siendo válida.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">
              Este email fue enviado automáticamente. Por favor no respondas a este mensaje.<br>
              © ${new Date().getFullYear()} Fasercon. Todos los derechos reservados.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hola ${userName},
      
      Has solicitado restablecer tu contraseña para acceder al panel de administración de Fasercon.
      
      Para crear una nueva contraseña, visita el siguiente enlace:
      ${resetUrl}
      
      Este enlace expirará en 24 horas por seguridad.
      
      Si no solicitaste este cambio, puedes ignorar este email.
      
      Saludos,
      Equipo Fasercon
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Password reset email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    return { success: false, error }
  }
}

export default transporter