import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { testEmailConfiguration } from '@/lib/email-service'
import nodemailer from 'nodemailer'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, testEmail } = body

    // Check SMTP configuration
    const smtpConfig = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER ? '***' + process.env.SMTP_USER.slice(-4) : undefined,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***configured***' : undefined,
      FROM_EMAIL: process.env.FROM_EMAIL
    }

    const configStatus = {
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_HOST),
      missing: [] as string[]
    }

    if (!process.env.SMTP_USER) configStatus.missing.push('SMTP_USER')
    if (!process.env.SMTP_PASSWORD) configStatus.missing.push('SMTP_PASSWORD')
    if (!process.env.SMTP_HOST) configStatus.missing.push('SMTP_HOST')

    if (action === 'check') {
      // Just check configuration
      return NextResponse.json({
        success: true,
        message: configStatus.configured ? 'SMTP configuration is complete' : 'SMTP configuration is incomplete',
        smtpConfig,
        configStatus
      })
    }

    if (action === 'test') {
      if (!configStatus.configured) {
        return NextResponse.json({
          success: false,
          message: 'SMTP configuration is incomplete',
          smtpConfig,
          configStatus
        })
      }

      // Test SMTP connection
      const connectionTest = await testEmailConfiguration()
      
      if (!connectionTest) {
        return NextResponse.json({
          success: false,
          message: 'SMTP connection test failed',
          smtpConfig,
          configStatus,
          connectionTest
        })
      }

      // Send test email if testEmail is provided
      if (testEmail) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
            tls: {
              rejectUnauthorized: false
            }
          })

          const mailOptions = {
            from: `"MPU-Focus Test" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
            to: testEmail,
            subject: 'MPU-Focus SMTP Test Email',
            html: `
              <h2>SMTP Configuration Test</h2>
              <p>This is a test email to verify your SMTP configuration is working correctly.</p>
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                <li>Sent at: ${new Date().toLocaleString()}</li>
                <li>Admin: ${session.user.email}</li>
              </ul>
              <p>If you received this email, your SMTP configuration is working correctly!</p>
            `,
            text: `
              SMTP Configuration Test
              
              This is a test email to verify your SMTP configuration is working correctly.
              
              Test Details:
              - SMTP Host: ${process.env.SMTP_HOST}
              - SMTP Port: ${process.env.SMTP_PORT}
              - Sent at: ${new Date().toLocaleString()}
              - Admin: ${session.user.email}
              
              If you received this email, your SMTP configuration is working correctly!
            `
          }

          const info = await transporter.sendMail(mailOptions)
          
          return NextResponse.json({
            success: true,
            message: 'Test email sent successfully',
            smtpConfig,
            configStatus,
            connectionTest,
            testEmailSent: true,
            messageId: info.messageId,
            testEmail
          })
          
        } catch (emailError: any) {
          console.error('Test email failed:', emailError)
          return NextResponse.json({
            success: false,
            message: 'Test email failed to send',
            smtpConfig,
            configStatus,
            connectionTest,
            testEmailSent: false,
            emailError: emailError.message
          })
        }
      } else {
        return NextResponse.json({
          success: true,
          message: 'SMTP connection test passed',
          smtpConfig,
          configStatus,
          connectionTest
        })
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "test"' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error testing email configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}