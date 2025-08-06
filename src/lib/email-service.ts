import nodemailer from 'nodemailer'
import { getVerificationApprovedEmailTemplate, getVerificationRejectedEmailTemplate } from './email-templates'

interface User {
  firstName?: string
  lastName?: string
  email: string
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

// Send verification approved email
export async function sendVerificationApprovedEmail(user: User): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured, skipping email notification')
      return false
    }

    const transporter = createTransporter()
    const template = getVerificationApprovedEmailTemplate(user)

    const mailOptions = {
      from: `"MPU-Focus Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Verification approved email sent:', info.messageId)
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
  allowResubmission: boolean = false
): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured, skipping email notification')
      return false
    }

    const transporter = createTransporter()
    const template = getVerificationRejectedEmailTemplate(user, rejectionReason, allowResubmission)

    const mailOptions = {
      from: `"MPU-Focus Verification Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Verification rejected email sent:', info.messageId)
    return true

  } catch (error) {
    console.error('Error sending verification rejected email:', error)
    return false
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured')
      return false
    }

    const transporter = createTransporter()
    await transporter.verify()
    console.log('Email configuration is valid')
    return true

  } catch (error) {
    console.error('Email configuration test failed:', error)
    return false
  }
}