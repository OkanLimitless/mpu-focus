import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import UserCaseProfile from '@/models/UserCaseProfile'
import QuizBlueprint from '@/models/QuizBlueprint'
import QuizQuestion from '@/models/QuizQuestion'
import UserIntake from '@/models/UserIntake'
import crypto from 'crypto'
import { generateBlueprintWithLLM } from '@/lib/quiz-prompts'

export const dynamic = 'force-dynamic'

function hashString(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const extracted = user.documentProcessing?.extractedData || ''
    if (!extracted) return NextResponse.json({ error: 'No document data found' }, { status: 400 })
    const sourceHash = hashString(extracted)

    // ensure profile exists
    const profile = await UserCaseProfile.findOne({ userId: user._id, sourceHash })
    const intake = await UserIntake.findOne({ userId: user._id })
    const facts = { ...(profile?.facts || { summary: extracted.slice(0, 2000) }), intake: intake?.responses || {} }

    // existing blueprint?
    const existing = await QuizBlueprint.findOne({ userId: user._id, sourceHash })
    if (existing) {
      return NextResponse.json({ success: true, blueprintId: existing._id })
    }

    // generate with LLM or fallback
    const generated = await generateBlueprintWithLLM(facts)
    const blueprint = await QuizBlueprint.create({
      userId: user._id,
      sourceHash,
      categories: generated.categories,
      llmMeta: generated.llmMeta,
    })

    // persist questions
    await QuizQuestion.insertMany(
      generated.questions.map((q) => ({
        userId: user._id,
        blueprintId: blueprint._id,
        type: q.type,
        category: q.category,
        difficulty: q.difficulty,
        prompt: q.prompt,
        choices: q.choices,
        correct: q.correct,
        rationales: q.rationales,
        rubric: q.rubric,
      }))
    )

    return NextResponse.json({ success: true, blueprintId: blueprint._id })
  } catch (e) {
    console.error('blueprint error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
