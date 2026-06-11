import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { listAttemptsForProfile, listQuizzesPublished } from '@/lib/quiz-library'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const access = await requireAcademyAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const [quizzes, attempts] = await Promise.all([
      listQuizzesPublished().catch((error: any) => {
        if (String(error?.message || '').toLowerCase().includes('mpu_quizzes')) return []
        throw error
      }),
      listAttemptsForProfile(access.profile.id).catch(() => []),
    ])

    const attemptsByQuiz = new Map<string, typeof attempts>()
    for (const attempt of attempts) {
      const list = attemptsByQuiz.get(attempt.quizId) || []
      list.push(attempt)
      attemptsByQuiz.set(attempt.quizId, list)
    }

    return NextResponse.json({
      quizzes: quizzes.map((quiz) => {
        const myAttempts = attemptsByQuiz.get(quiz.id) || []
        const best = myAttempts.reduce((max, attempt) => Math.max(max, attempt.percentage), 0)
        const last = myAttempts[0] || null

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          chapterId: quiz.chapterId,
          chapterTitle: quiz.chapterTitle,
          categoryTitle: quiz.categoryTitle,
          passPercentage: quiz.passPercentage,
          questionCount: quiz.questions.length,
          totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
          myAttempts: {
            count: myAttempts.length,
            bestPercentage: best,
            lastPercentage: last?.percentage ?? null,
            lastPassed: last?.passed ?? null,
            lastNeedsReview: last?.needsReview ?? false,
            lastAttemptAt: last?.completedAt ?? null,
            everPassed: myAttempts.some((attempt) => attempt.passed === true),
          },
        }
      }),
    })
  } catch (error: any) {
    console.error('Error fetching quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}
