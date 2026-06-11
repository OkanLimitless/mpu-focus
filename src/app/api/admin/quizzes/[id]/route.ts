import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { deleteQuiz, getQuizById, updateQuiz } from '@/lib/quiz-library'

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
    return NextResponse.json({ quiz })
  } catch (error: any) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch quiz' }, { status: getHttpStatus(error) })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()
    const body = await request.json()

    const quiz = await updateQuiz(params.id, {
      title: body.title,
      description: body.description ?? null,
      chapterId: body.chapterId || null,
      passPercentage: body.passPercentage,
      orderIndex: body.orderIndex,
      isPublished: body.isPublished === true,
      questions: Array.isArray(body.questions) ? body.questions : [],
    })

    return NextResponse.json({ success: true, quiz })
  } catch (error: any) {
    console.error('Error updating quiz:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update quiz' }, { status: getHttpStatus(error) })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()
    await deleteQuiz(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting quiz:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete quiz' }, { status: getHttpStatus(error) })
  }
}
