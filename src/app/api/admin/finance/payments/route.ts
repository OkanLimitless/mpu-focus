import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { getProfileByEmail } from '@/lib/mpu-profiles'
import { createPayment } from '@/lib/finance-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()

    // Track which admin recorded the payment, for the audit trail.
    const adminCheck = await requireAdmin()
    const adminEmail = adminCheck.ok ? adminCheck.session?.user?.email : null
    const adminProfile = adminEmail ? await getProfileByEmail(adminEmail).catch(() => null) : null

    const amountCents = Number.isFinite(Number(body.amountCents))
      ? Math.round(Number(body.amountCents))
      : Math.round(Number(body.amountEuros) * 100)

    const payment = await createPayment({
      profileId: String(body.profileId || ''),
      amountCents,
      method: ['cash', 'bank_transfer', 'paypal', 'other'].includes(body.method) ? body.method : 'cash',
      note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null,
      paidAt: typeof body.paidAt === 'string' && body.paidAt ? new Date(body.paidAt).toISOString() : null,
      recordedBy: adminProfile?.id ?? null,
    })

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create payment' }, { status: getHttpStatus(error) })
  }
}
