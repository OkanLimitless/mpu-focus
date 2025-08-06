import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter (configured via environment variables)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export const sendEmail = async ({ to, subject, html, text }: EmailOptions) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@mpu-focus.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const sendVerificationInvitation = async (user: {
  email: string
  firstName: string
  lastName: string
  verificationToken: string
}) => {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MPU-Focus - Verifizierung erforderlich</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9fafb; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .requirements { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            ul { padding-left: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MPU-Focus</h1>
            <p>Willkommen auf unserer Plattform!</p>
        </div>
        
        <div class="content">
            <h2>Hallo ${user.firstName} ${user.lastName},</h2>
            
            <p>Ihr Benutzerkonto wurde erfolgreich erstellt! Um vollständigen Zugang zu unserer MPU-Vorbereitungsplattform zu erhalten, müssen Sie noch einige wichtige Schritte abschließen.</p>
            
            <div class="requirements">
                <h3>Erforderliche Dokumente:</h3>
                <ul>
                    <li><strong>Reisepass oder Personalausweis</strong> - Hochladen eines gültigen Ausweisdokuments</li>
                    <li><strong>Vertrag</strong> - Digitale Unterzeichnung unserer Nutzungsvereinbarung</li>
                </ul>
            </div>
            
            <p>Klicken Sie auf den Button unten, um mit der Verifizierung zu beginnen:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verifizierung starten</a>
            </div>
            
            <p>Nach erfolgreicher Verifizierung erhalten Sie vollständigen Zugang zu:</p>
            <ul>
                <li>Alle Kursinhalte und Videos</li>
                <li>Persönliches Dashboard mit Fortschrittsverfolgung</li>
                <li>Support und Beratung</li>
            </ul>
            
            <p><strong>Hinweis:</strong> Dieser Link ist aus Sicherheitsgründen zeitlich begrenzt gültig. Falls der Link abgelaufen ist, kontaktieren Sie bitte unser Support-Team.</p>
        </div>
        
        <div class="footer">
            <p>MPU-Focus - Ihr Partner für die MPU-Vorbereitung</p>
            <p>Bei Fragen erreichen Sie uns unter: support@mpu-focus.com</p>
        </div>
    </body>
    </html>
  `

  return sendEmail({
    to: user.email,
    subject: 'MPU-Focus - Vervollständigen Sie Ihre Registrierung',
    html,
  })
}