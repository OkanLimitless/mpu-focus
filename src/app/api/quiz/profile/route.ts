import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import UserCaseProfile from '@/models/UserCaseProfile'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const profile = await UserCaseProfile.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, profile })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

