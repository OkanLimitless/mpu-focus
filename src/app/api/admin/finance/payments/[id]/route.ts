import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { deletePayment } from '@/lib/finance-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()
    await deletePayment(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete payment' }, { status: getHttpStatus(error) })
  }
}
