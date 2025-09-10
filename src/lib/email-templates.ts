// Email templates for verification notifications

interface User {
  firstName?: string
  lastName?: string
  email: string
  verificationToken?: string
}

export function getVerificationApprovedEmailTemplate(user: User) {
  const firstName = user.firstName || 'Dear User'
  
  return {
    subject: '🎉 Your MPU-Focus Account Has Been Verified!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Verified - MPU-Focus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .success-icon { font-size: 48px; margin-bottom: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 14px; color: #6b7280; }
          .feature-list { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { margin: 10px 0; padding-left: 20px; position: relative; }
          .feature-item::before { content: "✓"; position: absolute; left: 0; color: #059669; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">🎉</div>
            <h1 style="margin: 0; font-size: 28px;">Verification Complete!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your MPU-Focus account is now fully activated</p>
          </div>
          
          <div class="content">
            <p>Hello ${firstName},</p>
            
            <p><strong>Congratulations!</strong> Your identity documents have been successfully verified and your MPU-Focus account is now fully activated.</p>
            
            <div class="feature-list">
              <h3 style="margin-top: 0; color: #1f2937;">What you can now access:</h3>
              <div class="feature-item">Complete MPU preparation course materials</div>
              <div class="feature-item">Interactive video lessons and exercises</div>
              <div class="feature-item">Personalized progress tracking</div>
              <div class="feature-item">Expert support and guidance</div>
              <div class="feature-item">Practice tests and assessments</div>
            </div>
            
            <p>You can now log in to your account and begin your MPU preparation journey. Our comprehensive course materials are designed to help you succeed in your Medical-Psychological Assessment.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL}/login" class="button">Access Your Account</a>
            </div>
            
            <p><strong>Need help getting started?</strong><br>
            Visit your dashboard for a guided tour of the platform features and recommended learning path.</p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best of luck with your MPU preparation!</p>
            
            <p>Best regards,<br>
            <strong>The MPU-Focus Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${user.email}</p>
            <p>MPU-Focus - Your trusted partner for MPU preparation</p>
            <p>If you didn't request this verification, please contact our support team immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      🎉 Verification Complete!
      
      Hello ${firstName},
      
      Congratulations! Your identity documents have been successfully verified and your MPU-Focus account is now fully activated.
      
      What you can now access:
      ✓ Complete MPU preparation course materials
      ✓ Interactive video lessons and exercises
      ✓ Personalized progress tracking
      ✓ Expert support and guidance
      ✓ Practice tests and assessments
      
      You can now log in to your account and begin your MPU preparation journey at: ${process.env.NEXTAUTH_URL}/login
      
      Need help getting started? Visit your dashboard for a guided tour of the platform features and recommended learning path.
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
      
      Best of luck with your MPU preparation!
      
      Best regards,
      The MPU-Focus Team
      
      ---
      This email was sent to ${user.email}
      MPU-Focus - Your trusted partner for MPU preparation
    `
  }
}

export function getVerificationRejectedEmailTemplate(
  user: User, 
  rejectionReason: string,
  allowResubmission: boolean = false
) {
  const firstName = user.firstName || 'Dear User'
  
  // Create the correct resubmission URL using the verification token
  const resubmissionUrl = user.verificationToken 
    ? `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`
    : `${process.env.NEXTAUTH_URL}/dashboard`
    
  const resubmissionSection = allowResubmission ? `
    <div class="resubmission-section">
      <h3 style="color: #1f2937; margin-bottom: 15px;">📝 Document Re-submission</h3>
      <p>Good news! You can upload new documents without having to sign the contract again. Your previous contract signature remains valid.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resubmissionUrl}" class="button">Upload New Documents</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">Click the button above to go directly to the verification page where you can upload your updated documents.</p>
    </div>
  ` : `
    <div class="info-section">
      <p>To proceed with your verification, please contact our support team for guidance on the next steps.</p>
    </div>
  `
  
  return {
    subject: '📋 MPU-Focus Verification Update Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Update Required - MPU-Focus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .warning-icon { font-size: 48px; margin-bottom: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 14px; color: #6b7280; }
          .rejection-reason { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .resubmission-section { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-section { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .requirements { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .requirement-item { margin: 8px 0; padding-left: 20px; position: relative; }
          .requirement-item::before { content: "•"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="warning-icon">📋</div>
            <h1 style="margin: 0; font-size: 28px;">Verification Update Required</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Additional information needed for your MPU-Focus account</p>
          </div>
          
          <div class="content">
            <p>Hello ${firstName},</p>
            
            <p>Thank you for submitting your verification documents for MPU-Focus. After careful review, we need some additional information or updated documents to complete your verification process.</p>
            
            <div class="rejection-reason">
              <h3 style="margin-top: 0; color: #dc2626;">📝 Required Updates:</h3>
              <p style="margin-bottom: 0;"><strong>${rejectionReason}</strong></p>
            </div>
            
            ${resubmissionSection}
            
            <div class="requirements">
              <h3 style="margin-top: 0; color: #1f2937;">📋 Document Requirements:</h3>
              <div class="requirement-item">Clear, high-resolution photo or scan</div>
              <div class="requirement-item">All text must be clearly readable</div>
              <div class="requirement-item">Valid government-issued ID (passport, driver's license, or national ID)</div>
              <div class="requirement-item">Document must not be expired</div>
              <div class="requirement-item">All corners and edges must be visible</div>
              <div class="requirement-item">File format: JPEG, PNG, or PDF (max 10MB)</div>
            </div>
            
            <p><strong>Need help?</strong> Our support team is here to assist you with any questions about the verification process or document requirements.</p>
            
            <p>We appreciate your patience and look forward to welcoming you to the MPU-Focus community soon!</p>
            
            <p>Best regards,<br>
            <strong>The MPU-Focus Verification Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${user.email}</p>
            <p>MPU-Focus - Your trusted partner for MPU preparation</p>
            <p>For support, please contact us through your account dashboard or reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      📋 Verification Update Required
      
      Hello ${firstName},
      
      Thank you for submitting your verification documents for MPU-Focus. After careful review, we need some additional information or updated documents to complete your verification process.
      
      Required Updates:
      ${rejectionReason}
      
      ${allowResubmission ? `
      📝 Document Re-submission
      Good news! You can upload new documents without having to sign the contract again. Your previous contract signature remains valid.
      
      Upload new documents at: ${resubmissionUrl}
      ` : `
      To proceed with your verification, please contact our support team for guidance on the next steps.
      `}
      
      Document Requirements:
      • Clear, high-resolution photo or scan
      • All text must be clearly readable
      • Valid government-issued ID (passport, driver's license, or national ID)
      • Document must not be expired
      • All corners and edges must be visible
      • File format: JPEG, PNG, or PDF (max 10MB)
      
      Need help? Our support team is here to assist you with any questions about the verification process or document requirements.
      
      We appreciate your patience and look forward to welcoming you to the MPU-Focus community soon!
      
      Best regards,
      The MPU-Focus Verification Team
      
      ---
      This email was sent to ${user.email}
      MPU-Focus - Your trusted partner for MPU preparation
    `
  }
}

export function getWelcomeLoginAndVerificationEmailTemplate(user: User & { password: string }) {
  const firstName = user.firstName || 'Dear User'
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  const verificationUrl = user.verificationToken
    ? `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`
    : `${process.env.NEXTAUTH_URL}/dashboard`

  return {
    subject: 'Welcome to MPU-Focus — Your Login Details and Next Steps',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to MPU-Focus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 36px 28px; text-align: center; }
          .content { padding: 32px 28px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
          .secondary { background: #111827; }
          .panel { background-color: #f3f4f6; padding: 16px; border-radius: 8px; }
          .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #111827; color: #fff; padding: 10px 12px; border-radius: 6px; display: inline-block; }
          .list { margin: 0; padding-left: 18px; }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Welcome to MPU-Focus</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.95;">Your login details and verification steps</p>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Your account has been created. Please log in and complete your account verification to access the course.</p>

            <div class="panel" style="margin: 16px 0;">
              <h3 style="margin-top: 0;">Your login</h3>
              <p><strong>Username (Email):</strong> ${user.email}<br>
              <strong>Password:</strong></p>
              <div class="code" style="user-select: all; -webkit-user-select: all; display: inline-block;">${user.password}</div>
              <div style="margin-top: 12px;">
                <a href="${loginUrl}" class="button">Log in</a>
              </div>
            </div>

            <h3>What happens next</h3>
            <ol class="list">
              <li>Log in using the credentials above.</li>
              <li>On first login, you’ll see a guided dialog to complete verification:</li>
              <ul class="list">
                <li>Upload a valid ID document (passport or national ID)</li>
                <li>Review and sign the service agreement</li>
              </ul>
              <li>Our team will review your submission (typically 1–2 business days).</li>
              <li>Once approved, your dashboard will unlock all course content.</li>
            </ol>

            <p style="margin-top: 16px; font-size: 14px; color: #374151;">Tip: For security, you can change your password after your first login from your account settings.</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${user.email}</p>
            <p>MPU-Focus — Your trusted partner for MPU preparation</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to MPU-Focus

Hello ${firstName},

Your account has been created. Please log in and complete your account verification.

Login:
- Username (Email): ${user.email}
- Password: ${user.password}

Login: ${loginUrl}

Next steps:
1) Log in using the credentials above
2) On first login, follow the verification dialog (upload ID, sign agreement)
3) We review your submission (1–2 business days)
4) Your dashboard unlocks after approval

For security, change your password after first login from your account settings.
    `
  }
}

export function getWelcomeLoginAndVerificationEmailTemplateDe(user: User & { password: string }) {
  const firstName = user.firstName || 'Kunde'
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  const verificationUrl = user.verificationToken
    ? `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`
    : `${process.env.NEXTAUTH_URL}/dashboard`

  return {
    subject: 'Willkommen bei MPU-Focus – Ihre Zugangsdaten und die nächsten Schritte',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willkommen bei MPU-Focus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%); color: white; padding: 36px 28px; text-align: center; }
          .content { padding: 28px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
          .panel { background-color: #f3f4f6; padding: 16px; border-radius: 8px; }
          .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background: #111827; color: #fff; padding: 10px 12px; border-radius: 6px; display: inline-block; }
          .list { margin: 0; padding-left: 18px; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Willkommen bei MPU-Focus</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.95;">Ihre Zugangsdaten und die nächsten Schritte</p>
          </div>
          <div class="content">
            <p>Hallo ${firstName},</p>
            <p>Ihr Konto wurde erstellt. Bitte melden Sie sich an und schließen Sie die Verifizierung ab, um auf den Kurs zuzugreifen.</p>

            <div class="panel" style="margin: 16px 0;">
              <h3 style="margin-top: 0;">Ihre Anmeldung</h3>
              <p><strong>Nutzername (E-Mail):</strong> ${user.email}<br>
              <strong>Passwort:</strong></p>
              <div class="code" style="user-select: all; -webkit-user-select: all; display: inline-block;">${user.password}</div>
              <div style="margin-top: 12px;">
                <a href="${loginUrl}" class="button">Jetzt einloggen</a>
              </div>
            </div>

            <h3>So geht es weiter</h3>
            <ol class="list">
              <li>Melden Sie sich mit den obigen Zugangsdaten an.</li>
              <li>Beim ersten Login führen wir Sie durch die Verifizierung:</li>
              <ul class="list">
                <li>Gültiges Ausweisdokument hochladen (Pass/Personalausweis)</li>
                <li>Dienstleistungsvereinbarung digital unterschreiben</li>
              </ul>
              <li>Unser Team prüft Ihre Eingaben (in der Regel 1–2 Werktage).</li>
              <li>Nach Freigabe wird Ihr Dashboard vollständig freigeschaltet.</li>
            </ol>

            <p style="margin-top: 14px; font-size: 14px; color: #374151;">Sicherheitstipp: Ändern Sie Ihr Passwort nach dem ersten Login in den Kontoeinstellungen.</p>
          </div>
          <div class="footer">
            <p>Diese E-Mail wurde an ${user.email} gesendet</p>
            <p>MPU-Focus – Ihr Partner für erfolgreiche MPU-Vorbereitung</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Willkommen bei MPU-Focus

Hallo ${firstName},

Ihr Konto wurde erstellt. Bitte loggen Sie sich ein und schließen Sie die Verifizierung ab.

Login:
- E-Mail: ${user.email}
- Passwort: ${user.password}

Login: ${loginUrl}

Nächste Schritte:
1) Einloggen
2) Verifizierung starten (Ausweis hochladen, Vereinbarung unterschreiben)
3) Prüfung durch unser Team (1–2 Werktage)
4) Freischaltung des Dashboards

Sicherheitstipp: Passwort nach dem ersten Login ändern.
    `
  }
}

export function getLoginVerificationReminderTemplate(user: User) {
  const firstName = user.firstName || 'Dear User'
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  const verificationUrl = user.verificationToken
    ? `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}`
    : `${process.env.NEXTAUTH_URL}/dashboard`

  return {
    subject: 'Complete your MPU-Focus verification — Login instructions inside',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 32px 24px; text-align: center; }
          .content { padding: 28px 24px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
          .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px;">Complete Your Verification</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Please log in to MPU-Focus and complete the verification steps shown in your dashboard dialog.</p>
            <p><strong>Login with your email address:</strong> ${user.email}</p>
            <div>
              <a href="${loginUrl}" class="button">Log in</a>
            </div>
            <p style="margin-top: 12px; font-size: 14px; color: #374151;">If you need to reset your password, please use the password reset option on the login page or contact support.</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${user.email}</p>
            <p>MPU-Focus — Your trusted partner for MPU preparation</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Complete Your Verification

Hello ${firstName},

Please log in to MPU-Focus and complete the verification steps shown in your dashboard dialog.

Login with your email address: ${user.email}
Login: ${loginUrl}

If you need to reset your password, please use the password reset option on the login page or contact support.
    `
  }
}

// Password reset email (DE/EN)
export function getPasswordResetEmailTemplate(email: string, resetUrl: string, lang: 'de' | 'en' = 'de') {
  if (lang === 'de') {
    return {
      subject: 'Passwort zurücksetzen – MPU-Focus',
      html: `
        <!DOCTYPE html>
        <html><head><meta charSet="utf-8"/></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6;color:#111">
          <p>Sie haben eine Zurücksetzung Ihres Passworts angefordert.</p>
          <p>Klicken Sie auf den folgenden Link, um ein neues Passwort zu setzen:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Wenn Sie dies nicht waren, ignorieren Sie diese E-Mail.</p>
        </body></html>
      `,
      text: `Sie haben eine Zurücksetzung Ihres Passworts angefordert. Link: ${resetUrl}`
    }
  }
  return {
    subject: 'Reset your password – MPU-Focus',
    html: `
      <!DOCTYPE html>
      <html><head><meta charSet="utf-8"/></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6;color:#111">
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If this wasn’t you, please ignore this email.</p>
      </body></html>
    `,
    text: `You requested a password reset. Link: ${resetUrl}`
  }
}

// Minimal German templates for verification emails
export function getVerificationApprovedEmailTemplateDe(user: User) {
  const firstName = user.firstName || 'Kunde'
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  return {
    subject: '🎉 Ihr MPU-Focus Konto wurde verifiziert!',
    html: `
      <p>Hallo ${firstName},</p>
      <p><strong>Glückwunsch!</strong> Ihre Dokumente wurden erfolgreich geprüft und Ihr Konto ist nun aktiviert.</p>
      <p><a href="${loginUrl}">Hier einloggen</a> und mit der MPU-Vorbereitung starten.</p>
      <p>Ihr MPU-Focus Team</p>
    `,
    text: `Verifizierung abgeschlossen. Login: ${loginUrl}`
  }
}

export function getVerificationRejectedEmailTemplateDe(user: User, rejectionReason: string, allowResubmission: boolean) {
  const firstName = user.firstName || 'Kunde'
  const resubmissionUrl = allowResubmission && user.verificationToken ? `${process.env.NEXTAUTH_URL}/verification/${user.verificationToken}` : ''
  return {
    subject: allowResubmission ? '⚠️ Verifizierung unvollständig – Bitte Dokumente erneut einreichen' : '❌ Verifizierung abgelehnt – Aktion erforderlich',
    html: `
      <p>Hallo ${firstName},</p>
      <p>Zur Verifizierung benötigen wir folgende Aktualisierung:</p>
      <p><strong>${rejectionReason}</strong></p>
      ${allowResubmission ? `<p>Sie können neue Dokumente hier hochladen: <a href="${resubmissionUrl}">${resubmissionUrl}</a></p>` : '<p>Bitte kontaktieren Sie unseren Support für die nächsten Schritte.</p>'}
      <p>Ihr MPU-Focus Team</p>
    `,
    text: allowResubmission ? `Aktualisierung nötig. Neue Dokumente: ${resubmissionUrl}` : 'Verifizierung abgelehnt. Bitte Support kontaktieren.'
  }
}
