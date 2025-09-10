import nodemailer from 'nodemailer'
import { getVerificationApprovedEmailTemplate, getVerificationRejectedEmailTemplate, getVerificationApprovedEmailTemplateDe, getVerificationRejectedEmailTemplateDe, getPasswordResetEmailTemplate } from './email-templates'

interface User {
  firstName?: string
  lastName?: string
  email: string
  verificationToken?: string
}

// Create transporter
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD, // Using SMTP_PASSWORD like the working email service
    },
    tls: {
      rejectUnauthorized: false
    }
  }
  
  console.log('Creating transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? '***' + config.auth.user.slice(-4) : 'undefined',
    pass: config.auth.pass ? '***configured***' : 'undefined'
  })
  
  return nodemailer.createTransport(config)
}

// Enhanced SMTP credential check - using same variable names as working email service
function checkSMTPCredentials(): { configured: boolean; missing: string[] } {
  const missing = []
  
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD') // Changed from SMTP_PASS
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST')
  
  return {
    configured: missing.length === 0,
    missing
  }
}

// Send verification approved email
export async function sendVerificationApprovedEmail(user: User, lang: 'de' | 'en' = 'de'): Promise<boolean> {
  try {
    const credentialCheck = checkSMTPCredentials()
    
    if (!credentialCheck.configured) {
      console.warn('SMTP credentials not configured for approval email, missing:', credentialCheck.missing)
      return false
    }

    console.log('Sending verification approved email to:', user.email)
    const transporter = createTransporter()
    const template = lang === 'de' ? getVerificationApprovedEmailTemplateDe(user) : getVerificationApprovedEmailTemplate(user)

    const mailOptions = {
      from: `"MPU-Focus Team" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Verification approved email sent successfully:', info.messageId)
    return true

  } catch (error) {
    console.error('Error sending verification approved email:', error)
    return false
  }
}

// Send verification rejected email
export async function sendVerificationRejectedEmail(
  user: User, 
  rejectionReason: string,
  allowResubmission: boolean = false,
  lang: 'de' | 'en' = 'de'
): Promise<boolean> {
  try {
    const credentialCheck = checkSMTPCredentials()
    
    if (!credentialCheck.configured) {
      console.warn('SMTP credentials not configured for rejection email, missing:', credentialCheck.missing)
      return false
    }

    console.log('Sending verification rejected email to:', user.email, {
      allowResubmission,
      rejectionReasonLength: rejectionReason.length
    })
    
    const transporter = createTransporter()
    const template = lang === 'de' ? getVerificationRejectedEmailTemplateDe(user, rejectionReason, allowResubmission) : getVerificationRejectedEmailTemplate(user, rejectionReason, allowResubmission)

    const mailOptions = {
      from: `"MPU-Focus Verification Team" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    console.log('Sending rejection email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length,
      textLength: mailOptions.text.length
    })

    const info = await transporter.sendMail(mailOptions)
    console.log('Verification rejected email sent successfully:', info.messageId)
    return true

  } catch (error: any) {
    console.error('Error sending verification rejected email:', {
      error: error.message,
      stack: error.stack,
      user: user.email,
      allowResubmission
    })
    return false
  }
}

// Send password reset email
export async function sendPasswordResetEmail(toEmail: string, resetUrl: string, lang: 'de' | 'en' = 'de'): Promise<boolean> {
  try {
    const credentialCheck = checkSMTPCredentials()
    if (!credentialCheck.configured) return false
    const transporter = createTransporter()
    const tpl = getPasswordResetEmailTemplate(toEmail, resetUrl, lang)
    const info = await transporter.sendMail({
      from: `"MPU-Focus" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    })
    return !!info.messageId
  } catch {
    return false
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const credentialCheck = checkSMTPCredentials()
    
    if (!credentialCheck.configured) {
      console.warn('SMTP credentials not configured for testing, missing:', credentialCheck.missing)
      return false
    }

    console.log('Testing email configuration...')
    const transporter = createTransporter()
    await transporter.verify()
    console.log('Email configuration is valid')
    return true

  } catch (error) {
    console.error('Email configuration test failed:', error)
    return false
  }
}
