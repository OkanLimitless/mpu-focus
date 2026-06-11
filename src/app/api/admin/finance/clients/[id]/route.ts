import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { updateClientFinance } from '@/lib/finance-library'

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

    const patch: { packagePriceCents?: number | null; financeNotes?: string | null } = {}
    if (body.packagePriceCents !== undefined) {
      patch.packagePriceCents = body.packagePriceCents == null ? null : Number(body.packagePriceCents)
    }
    if (body.packagePriceEuros !== undefined) {
      patch.packagePriceCents = body.packagePriceEuros == null ? null : Math.round(Number(body.packagePriceEuros) * 100)
    }
    if (body.financeNotes !== undefined) {
      patch.financeNotes = body.financeNotes == null ? null : String(body.financeNotes).slice(0, 4000)
    }

    await updateClientFinance(params.id, patch)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating client finance:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update client' }, { status: getHttpStatus(error) })
  }
}
