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

    // Score: MCQ scored; short/scenario currently excluded from numeric scoring
    let correct = 0
    let total = 0
    const comp: Record<string, { correct: number; total: number }> = {}

    for (const r of results) {
      const q = byQ[String(r.questionId)]
      if (!q) continue
      if (q.type === 'mcq') {
        total += 1
        if (r.isCorrect) correct += 1
        comp[q.category] = comp[q.category] || { correct: 0, total: 0 }
        comp[q.category].total += 1
        if (r.isCorrect) comp[q.category].correct += 1
      }
    }

    const score = total > 0 ? Math.round((correct / total) * 100) : 0
    const competencyScores: Record<string, number> = {}
    Object.keys(comp).forEach(k => {
      competencyScores[k] = comp[k].total > 0 ? Math.round((comp[k].correct / comp[k].total) * 100) : 0
    })

    const finishedAt = new Date()
    const durationSeconds = Math.floor((finishedAt.getTime() - new Date(sess.startedAt).getTime()) / 1000)

    await QuizSession.updateOne({ _id: sess._id }, { $set: { finishedAt, durationSeconds, score, competencyScores } })

    return NextResponse.json({ success: true, score, competencyScores })
  } catch (e) {
    console.error('session/finish error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

