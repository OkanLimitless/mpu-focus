import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { token, password } = await req.json()
    if (!token || !password || String(password).length < 6) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

