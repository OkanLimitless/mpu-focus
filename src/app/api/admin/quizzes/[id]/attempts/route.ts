import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { getQuizById, listAttemptsForQuiz } from '@/lib/quiz-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()

    const quiz = await getQuizById(params.id)
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz nicht gefunden.' }, { status: 404 })
    }

    const attempts = await listAttemptsForQuiz(params.id)
    const questionsById = new Map(quiz.questions.map((q) => [q.id, q]))

    return NextResponse.json({
      quiz: { id: quiz.id, title: quiz.title, passPercentage: quiz.passPercentage },
      attempts: attempts.map((attempt) => ({
        ...attempt,
        answers: attempt.answers.map((answer) => {
          const question = questionsById.get(answer.questionId)
          return {
            ...answer,
            question: question?.question || 'Frage wurde entfernt',
            options: question?.options.map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect })) || [],
          }
        }),
      })),
    })
  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch attempts' }, { status: getHttpStatus(error) })
  }
}
