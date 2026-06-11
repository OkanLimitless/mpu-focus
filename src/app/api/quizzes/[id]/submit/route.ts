import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { getQuizById, submitQuizAttempt } from '@/lib/quiz-library'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const access = await requireAcademyAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const quiz = await getQuizById(params.id)
    if (!quiz || (!quiz.isPublished && access.profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Quiz nicht gefunden.' }, { status: 404 })
    }

    const body = await request.json()
    const answers = Array.isArray(body.answers) ? body.answers : []

    const attempt = await submitQuizAttempt({
      quiz,
      profileId: access.profile.id,
      answers: answers.map((answer: any) => ({
        questionId: String(answer?.questionId || ''),
        selectedOptionIds: Array.isArray(answer?.selectedOptionIds) ? answer.selectedOptionIds.map(String) : [],
        answerText: typeof answer?.answerText === 'string' ? answer.answerText.slice(0, 4000) : '',
      })),
      startedAt: typeof body.startedAt === 'string' ? body.startedAt : null,
    })

    const questionsById = new Map(quiz.questions.map((q) => [q.id, q]))

    // After submitting, the learner gets the solution for learning value.
    return NextResponse.json({
      result: {
        attemptId: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passed: attempt.passed,
        needsReview: attempt.needsReview,
        passPercentage: quiz.passPercentage,
        answers: attempt.answers.map((answer) => {
          const question = questionsById.get(answer.questionId)
          return {
            questionId: answer.questionId,
            questionType: answer.questionType,
            isCorrect: answer.isCorrect,
            pointsAwarded: answer.pointsAwarded,
            maxPoints: answer.maxPoints,
            needsReview: answer.needsReview,
            selectedOptionIds: answer.selectedOptionIds,
            correctOptionIds: question?.options.filter((option) => option.isCorrect).map((option) => option.id) || [],
            explanation: question?.explanation || null,
          }
        }),
      },
    })
  } catch (error: any) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json({ error: error?.message || 'Failed to submit quiz' }, { status: 500 })
  }
}
