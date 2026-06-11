import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { getFinanceOverview } from '@/lib/finance-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function GET() {
  try {
    await assertAdminRequest()
    const overview = await getFinanceOverview()
    return NextResponse.json(overview)
  } catch (error: any) {
    console.error('Error fetching finance overview:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch finance data' }, { status: getHttpStatus(error) })
  }
}
