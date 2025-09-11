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

    const body = await req.json().catch(() => ({}))
    const force = !!body?.force
    const desiredCount = Math.max(8, Math.min(30, Number(body?.desiredCount) || 12))

    const extracted = (user.documentProcessing?.extractedData || '').trim()
    const intake = await UserIntake.findOne({ userId: user._id })
    if (!intake?.completedAt) {
      return NextResponse.json({ error: 'Baseline intake not completed' }, { status: 400 })
    }
    const intakeJSON = JSON.stringify(intake?.responses || {})
    const hasDoc = extracted.length > 0
    const hasIntake = intakeJSON !== '{}' && intakeJSON.length > 2
    if (!hasDoc && !hasIntake) {
      return NextResponse.json({ error: 'No baseline or document data found' }, { status: 400 })
    }
    // Profile for doc facts uses the doc-only hash
    const docOnlyHash = hasDoc ? hashString(extracted) : null
    // Composite hash for blueprint caches both sources deterministically
    const sourceHash = hashString(`${docOnlyHash || ''}|${hasIntake ? hashString(intakeJSON) : ''}`)

    // ensure profile exists
    const profile = docOnlyHash ? await UserCaseProfile.findOne({ userId: user._id, sourceHash: docOnlyHash }) : null
    const facts = { ...(profile?.facts || (hasDoc ? { summary: extracted.slice(0, 2000) } : {})), intake: hasIntake ? (intake?.responses || {}) : {} }

    // existing blueprint?
    let existing = await QuizBlueprint.findOne({ userId: user._id, sourceHash })
    if (existing && !force) {
      return NextResponse.json({ success: true, blueprintId: existing._id })
    }
    if (existing && force) {
      // delete existing blueprint and questions
      const oldId = existing._id
      await QuizQuestion.deleteMany({ userId: user._id, blueprintId: oldId })
      await QuizBlueprint.deleteOne({ _id: oldId })
      existing = null as any
    }

    // generate with LLM or fallback
    const generated = await generateBlueprintWithLLM(facts, desiredCount)
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
