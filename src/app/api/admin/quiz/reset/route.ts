import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizBlueprint from '@/models/QuizBlueprint'
import QuizQuestion from '@/models/QuizQuestion'
import QuizSession from '@/models/QuizSession'
import QuizResult from '@/models/QuizResult'
import UserIntake from '@/models/UserIntake'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { userId, resetIntake } = body || {}
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const bps = await QuizBlueprint.find({ userId })
    const bpIds = bps.map((b: any) => b._id)
    if (bpIds.length) await QuizQuestion.deleteMany({ userId, blueprintId: { $in: bpIds } })
    await QuizBlueprint.deleteMany({ userId })
    const sessions = await QuizSession.find({ userId })
    const sIds = sessions.map((s: any) => s._id)
    if (sIds.length) await QuizResult.deleteMany({ sessionId: { $in: sIds } })
    await QuizSession.deleteMany({ userId })
    if (resetIntake) await UserIntake.deleteOne({ userId })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin quiz reset error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

