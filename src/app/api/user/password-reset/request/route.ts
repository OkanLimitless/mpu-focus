import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email) return NextResponse.json({ success: true })
    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
    if (!user) {
      // Do not reveal whether user exists
      return NextResponse.json({ success: true })
    }
    const token = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = token
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour
    await user.save()
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`
    await sendPasswordResetEmail(user.email, resetUrl, 'de')
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: true })
  }
}

