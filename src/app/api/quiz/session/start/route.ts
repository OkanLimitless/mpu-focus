import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import QuizBlueprint from '@/models/QuizBlueprint'
import QuizQuestion from '@/models/QuizQuestion'
import QuizSession from '@/models/QuizSession'

export const dynamic = 'force-dynamic'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const blueprintId = body?.blueprintId as string | undefined
    const count = Math.max(1, Math.min(20, Number(body?.count) || 10))

    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let blueprint: any
    if (blueprintId) {
      blueprint = await QuizBlueprint.findOne({ _id: blueprintId, userId: user._id })
    } else {
      blueprint = await QuizBlueprint.findOne({ userId: user._id }).sort({ createdAt: -1 })
    }
    if (!blueprint) return NextResponse.json({ error: 'No blueprint found' }, { status: 400 })

    const allQs = await QuizQuestion.find({ userId: user._id, blueprintId: blueprint._id }).lean()
    if (allQs.length === 0) return NextResponse.json({ error: 'No questions available' }, { status: 400 })

    // Simple balanced selection based on blueprint categories
    const byCat: Record<string, any[]> = {}
    allQs.forEach(q => {
      byCat[q.category] = byCat[q.category] || []
      byCat[q.category].push(q)
    })
    Object.keys(byCat).forEach(k => { byCat[k] = shuffle(byCat[k]) })

    const totalWeight = (blueprint.categories || []).reduce((acc: number, c: any) => acc + (c.count || 0), 0) || 1
    const selection: any[] = []
    const desired: Array<{ key: string; target: number }> = (blueprint.categories || []).map((c: any) => ({
      key: c.key,
      target: Math.max(1, Math.round(count * (c.count || 1) / totalWeight))
    }))

    // First pass: take per category
    for (const d of desired) {
      const pool = byCat[d.key] || []
      while (d.target > 0 && pool.length > 0 && selection.length < count) {
        selection.push(pool.shift())
        d.target--
      }
    }
    // Fill remainder from any category
    if (selection.length < count) {
      const remainder = shuffle(allQs.filter(q => !selection.find(s => String(s._id) === String(q._id))))
      selection.push(...remainder.slice(0, count - selection.length))
    }

    const selectedIds = selection.slice(0, count).map(q => q._id)
    const sessionDoc = await QuizSession.create({ userId: user._id, questionIds: selectedIds, startedAt: new Date() })

    // Return sanitized questions (no 'correct' field)
    const sanitized = selection.slice(0, count).map(q => ({
      _id: q._id,
      type: q.type,
      category: q.category,
      difficulty: q.difficulty,
      prompt: q.prompt,
      choices: q.choices,
      // correct omitted intentionally
      // rationales/rubric omitted until after answer
    }))

    return NextResponse.json({ success: true, sessionId: sessionDoc._id, questions: sanitized })
  } catch (e) {
    console.error('session/start error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

