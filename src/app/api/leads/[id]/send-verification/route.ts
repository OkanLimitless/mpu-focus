import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Lead from '@/models/Lead'
import User from '@/models/User'
import { getWelcomeLoginAndVerificationEmailTemplate, getWelcomeLoginAndVerificationEmailTemplateDe, getLoginVerificationReminderTemplate } from '@/lib/email-templates'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const leadId = params.id
    const lead = await Lead.findById(leadId)
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (lead.status !== 'converted') {
      return NextResponse.json(
        { error: 'Lead must be converted to user before sending verification email' },
        { status: 400 }
      )
    }

    if (!lead.convertedToUserId) {
      return NextResponse.json(
        { error: 'No associated user account found' },
        { status: 400 }
      )
    }

    // Find the user account
    const user = await User.findById(lead.convertedToUserId)
    if (!user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    // Ensure verification token exists
    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(32).toString('hex')
      await user.save()
    }

    // Prepare transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: false }
    })

    // If the convert-to-user flow provided a password, include it in the email.
    // We do not store plaintext password on the User model, so we accept optional password via request body.
    // This endpoint can be called right after conversion from the admin UI, passing the same password.
    let passwordFromRequest: string | undefined
    try {
      const body = await request.json()
      passwordFromRequest = body?.password
    } catch {}

    const from = `"MPU-Focus Team" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`

    if (passwordFromRequest) {
      // Prefer German welcome template by default
      const template = getWelcomeLoginAndVerificationEmailTemplateDe({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationToken: user.verificationToken,
        password: passwordFromRequest
      })

      const info = await transporter.sendMail({
        from,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
      console.log('Sent welcome+login email:', info.messageId)
    } else {
      const template = getLoginVerificationReminderTemplate({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationToken: user.verificationToken
      })

      const info = await transporter.sendMail({
        from,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
      console.log('Sent login reminder email:', info.messageId)
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })

  } catch (error) {
    console.error('Error sending verification email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
