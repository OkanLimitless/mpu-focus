import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizSession from '@/models/QuizSession'
import QuizResult from '@/models/QuizResult'
import QuizQuestion from '@/models/QuizQuestion'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const sess: any = await QuizSession.findOne({ _id: sessionId, userId: user._id })
    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const results = await QuizResult.find({ sessionId: sess._id })
    const questions = await QuizQuestion.find({ _id: { $in: sess.questionIds } })

    const byQ: Record<string, any> = {}
    questions.forEach(q => { byQ[String(q._id)] = q })

    // Score: include MCQ (0/1) and short/scenario numeric scores (0..1)
    let sum = 0
    let cnt = 0
    const comp: Record<string, { sum: number; cnt: number }> = {}

    for (const r of results) {
      const q = byQ[String(r.questionId)]
      if (!q) continue
      if (q.type === 'mcq') {
        cnt += 1
        sum += r.isCorrect ? 1 : 0
        comp[q.category] = comp[q.category] || { sum: 0, cnt: 0 }
        comp[q.category].cnt += 1
        comp[q.category].sum += r.isCorrect ? 1 : 0
      } else if (typeof r.score === 'number') {
        cnt += 1
        sum += r.score
        comp[q.category] = comp[q.category] || { sum: 0, cnt: 0 }
        comp[q.category].cnt += 1
        comp[q.category].sum += r.score
      }
    }

    const score = cnt > 0 ? Math.round((sum / cnt) * 100) : 0
    const competencyScores: Record<string, number> = {}
    Object.keys(comp).forEach(k => { competencyScores[k] = comp[k].cnt > 0 ? Math.round((comp[k].sum / comp[k].cnt) * 100) : 0 })

    const finishedAt = new Date()
    const durationSeconds = Math.floor((finishedAt.getTime() - new Date(sess.startedAt).getTime()) / 1000)

    await QuizSession.updateOne({ _id: sess._id }, { $set: { finishedAt, durationSeconds, score, competencyScores } })

    return NextResponse.json({ success: true, score, competencyScores, itemsScored: cnt, itemsTotal: sess.questionIds.length })
  } catch (e) {
    console.error('session/finish error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
