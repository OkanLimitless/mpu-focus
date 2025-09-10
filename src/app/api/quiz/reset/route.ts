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
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const body = await req.json().catch(() => ({}))
    const resetIntake = !!body?.resetIntake

    // delete blueprint & questions
    const bps = await QuizBlueprint.find({ userId: user._id })
    const bpIds = bps.map((b: any) => b._id)
    if (bpIds.length) await QuizQuestion.deleteMany({ userId: user._id, blueprintId: { $in: bpIds } })
    await QuizBlueprint.deleteMany({ userId: user._id })
    // delete sessions & results
    const sessions = await QuizSession.find({ userId: user._id })
    const sIds = sessions.map((s: any) => s._id)
    if (sIds.length) await QuizResult.deleteMany({ sessionId: { $in: sIds } })
    await QuizSession.deleteMany({ userId: user._id })
    // intake optional
    if (resetIntake) await UserIntake.deleteOne({ userId: user._id })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('quiz reset error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

