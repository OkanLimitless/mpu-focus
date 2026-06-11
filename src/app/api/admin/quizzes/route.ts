import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { createQuiz, listQuizzesAdmin } from '@/lib/quiz-library'
import { createSupabaseAdminClient } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function GET() {
  try {
    await assertAdminRequest()

    const quizzes = await listQuizzesAdmin()

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: attemptRows, error } = await supabaseAdmin
      .from('mpu_quiz_attempts')
      .select('quiz_id,percentage,needs_review,passed')
    if (error) throw error

    const statsByQuiz = new Map<string, { count: number; percentageSum: number; needsReview: number; passed: number }>()
    for (const row of attemptRows || []) {
      const entry = statsByQuiz.get(row.quiz_id) || { count: 0, percentageSum: 0, needsReview: 0, passed: 0 }
      entry.count += 1
      entry.percentageSum += Number(row.percentage ?? 0)
      if (row.needs_review === true) entry.needsReview += 1
      if (row.passed === true) entry.passed += 1
      statsByQuiz.set(row.quiz_id, entry)
    }

    return NextResponse.json({
      quizzes: quizzes.map((quiz) => {
        const stats = statsByQuiz.get(quiz.id)
        return {
          ...quiz,
          questionCount: quiz.questions.length,
          totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
          attemptStats: {
            count: stats?.count || 0,
            averagePercentage: stats && stats.count > 0 ? Math.round(stats.percentageSum / stats.count) : 0,
            needsReview: stats?.needsReview || 0,
            passed: stats?.passed || 0,
          },
        }
      }),
    })
  } catch (error: any) {
    console.error('Error fetching quizzes:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch quizzes' }, { status: getHttpStatus(error) })
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()

    const quiz = await createQuiz({
      title: body.title,
      description: body.description ?? null,
      chapterId: body.chapterId || null,
      passPercentage: body.passPercentage,
      orderIndex: body.orderIndex,
      isPublished: body.isPublished === true,
      questions: Array.isArray(body.questions) ? body.questions : [],
    })

    return NextResponse.json({ success: true, quiz }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating quiz:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create quiz' }, { status: getHttpStatus(error) })
  }
}
