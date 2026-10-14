import 'server-only'
import nodemailer from 'nodemailer'
import { setTimeout, clearTimeout } from 'node:timers'

export function leadNotificationsEnabled() {
  return Boolean(process.env.LEAD_NOTIFICATION_EMAIL && process.env.SMTP_HOST && process.env.FROM_EMAIL)
}
// Only a lead reference is sent; contact details and MPU answers stay in the CRM.
export async function notifyNewLead(leadId: string): Promise<'sent' | 'failed' | 'disabled'> {
  if (!leadNotificationsEnabled()) return 'disabled'
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  })
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Notification timeout')), 4000)
    })
    const result = await Promise.race([transport.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.LEAD_NOTIFICATION_EMAIL,
      subject: 'Neue MPU Focus Beratungsanfrage',
      text: `Eine neue Anfrage wurde im CRM gespeichert.\nReferenz: ${leadId}\nBitte öffnen Sie den Bereich Interessenten im MPU Focus Admin-Panel.`,
    }), deadline])
    return result.accepted?.length ? 'sent' : 'failed'
  } catch {
    console.error('Lead notification delivery failed; the lead remains saved in the CRM.')
    return 'failed'
  } finally {
    if (timeout) clearTimeout(timeout)
    transport.close()
  }
}
