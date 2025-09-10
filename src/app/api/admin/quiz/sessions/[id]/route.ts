import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizSession from '@/models/QuizSession'
import QuizResult from '@/models/QuizResult'
import QuizQuestion from '@/models/QuizQuestion'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const sess: any = await QuizSession.findById(params.id).lean()
    if (!sess) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const results = await QuizResult.find({ sessionId: sess._id }).lean()
    const questions = await QuizQuestion.find({ _id: { $in: sess.questionIds } }).lean()
    const byQ: Record<string, any> = {}
    questions.forEach(q => { byQ[String(q._id)] = q })

    const items = results.map(r => {
      const q = byQ[String(r.questionId)]
      return {
        questionId: r.questionId,
        type: q?.type,
        category: q?.category,
        difficulty: q?.difficulty,
        prompt: q?.prompt,
        choices: q?.choices,
        correct: q?.correct,
        rationales: q?.rationales,
        submitted: r.submitted,
        isCorrect: r.isCorrect,
        score: r.score,
        feedback: r.feedback,
      }
    })

    return NextResponse.json({ success: true, session: sess, items })
  } catch (e) {
    console.error('admin session details error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
