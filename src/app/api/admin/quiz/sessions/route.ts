import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizSession from '@/models/QuizSession'
import QuizResult from '@/models/QuizResult'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const sessions = await QuizSession.find({ userId }).sort({ createdAt: -1 }).lean()

    const resultsBySession: Record<string, number> = {}
    const ids = sessions.map(s => s._id)
    if (ids.length) {
      const counts = await QuizResult.aggregate([
        { $match: { sessionId: { $in: ids } } },
        { $group: { _id: '$sessionId', c: { $sum: 1 } } }
      ])
      counts.forEach((r: any) => { resultsBySession[String(r._id)] = r.c })
    }

    const payload = sessions.map((s: any) => ({
      _id: s._id,
      score: s.score ?? null,
      competencyScores: s.competencyScores || {},
      startedAt: s.startedAt,
      finishedAt: s.finishedAt || null,
      itemsTotal: (s.questionIds || []).length,
      itemsScored: resultsBySession[String(s._id)] || 0,
    }))

    return NextResponse.json({ success: true, sessions: payload })
  } catch (e) {
    console.error('admin quiz/sessions error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

