import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizSession from '@/models/QuizSession'
import QuizQuestion from '@/models/QuizQuestion'
import QuizResult from '@/models/QuizResult'
import UserCaseProfile from '@/models/UserCaseProfile'
import { evaluateShortAnswerWithLLM } from '@/lib/quiz-prompts'

export const dynamic = 'force-dynamic'

function asArray(v: any): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (v == null) return []
  return [String(v)]
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId, questionId, answer, timeSpentSec } = await req.json()
    if (!sessionId || !questionId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const sess = await QuizSession.findOne({ _id: sessionId, userId: user._id })
    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const q: any = await QuizQuestion.findOne({ _id: questionId, userId: user._id })
    if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    let isCorrect: boolean | undefined = undefined
    let score: number | undefined = undefined

    if (q.type === 'mcq') {
      const submitted = new Set(asArray(answer))
      const correctSet = new Set(asArray(q.correct))
      // exact match set equality
      isCorrect = submitted.size === correctSet.size && Array.from(submitted).every((v) => correctSet.has(v))
      score = isCorrect ? 1 : 0
    } else if (q.type === 'short' || q.type === 'scenario') {
      // LLM-based evaluation using rubric and case facts
      const profile = await UserCaseProfile.findOne({ userId: user._id }).sort({ createdAt: -1 })
      const facts = profile?.facts || {}
      const evalRes = await evaluateShortAnswerWithLLM(String(answer || ''), q.prompt, q.rubric, facts)
      score = evalRes.score
      // attach feedback as part of response
      // fall through to save below
      // Provide minimal normalized feedback text
      // isCorrect remains undefined; numeric score used instead
    }

    const doc = await QuizResult.findOneAndUpdate(
      { sessionId: sess._id, questionId: q._id },
      { $set: { submitted: answer, isCorrect, score, timeSpentSec } },
      { upsert: true, new: true }
    )

    // Optional feedback after answer (rationales for MCQ)
    const feedback = q.type === 'mcq'
      ? (q.rationales ? { rationales: q.rationales, correct: q.correct } : undefined)
      : ({ feedback: score != null ? `Score: ${Math.round((Number(score)||0)*100)}%` : undefined })

    return NextResponse.json({ success: true, resultId: doc._id, isCorrect, score, feedback })
  } catch (e) {
    console.error('session/answer error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
