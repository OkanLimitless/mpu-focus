import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { reviewAttemptOpenAnswers } from '@/lib/quiz-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()
    const body = await request.json()

    const grades: Record<string, number> = {}
    if (body.grades && typeof body.grades === 'object') {
      for (const [questionId, points] of Object.entries(body.grades)) {
        grades[questionId] = Number(points)
      }
    }

    const attempt = await reviewAttemptOpenAnswers(params.id, grades)
    return NextResponse.json({ success: true, attempt })
  } catch (error: any) {
    console.error('Error reviewing quiz attempt:', error)
    return NextResponse.json({ error: error?.message || 'Failed to review attempt' }, { status: getHttpStatus(error) })
  }
}
