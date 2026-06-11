import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { reviewAgreement } from '@/lib/agreement-library'

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

    const agreement = await reviewAgreement(params.id, {
      status: body.status,
      rejectionReason: typeof body.rejectionReason === 'string' ? body.rejectionReason.slice(0, 1000) : null,
    })

    return NextResponse.json({ success: true, agreement })
  } catch (error: any) {
    console.error('Error reviewing agreement:', error)
    return NextResponse.json({ error: error?.message || 'Failed to review agreement' }, { status: getHttpStatus(error) })
  }
}
