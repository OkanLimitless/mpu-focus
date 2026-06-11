import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { getQuizById } from '@/lib/quiz-library'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const access = await requireAcademyAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const quiz = await getQuizById(params.id)
    if (!quiz || (!quiz.isPublished && access.profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Quiz nicht gefunden.' }, { status: 404 })
    }

    // Correct answers are stripped — grading happens server-side on submit.
    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passPercentage: quiz.passPercentage,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          question: question.question,
          questionType: question.questionType,
          points: question.points,
          orderIndex: question.orderIndex,
          multipleCorrect: question.options.filter((option) => option.isCorrect).length > 1,
          options: question.options.map((option) => ({ id: option.id, text: option.text })),
        })),
      },
    })
  } catch (error: any) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}
