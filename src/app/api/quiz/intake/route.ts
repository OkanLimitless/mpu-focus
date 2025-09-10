import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import UserIntake from '@/models/UserIntake'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const intake = await UserIntake.findOne({ userId: user._id }).lean()
    return NextResponse.json({ success: true, intake })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const body = await req.json()
    const responses = body?.responses || {}
    const complete = !!body?.complete
    const update: any = { responses }
    if (complete) update.completedAt = new Date()
    const doc = await UserIntake.findOneAndUpdate(
      { userId: user._id },
      { $set: update },
      { upsert: true, new: true }
    )
    return NextResponse.json({ success: true, intake: doc })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

