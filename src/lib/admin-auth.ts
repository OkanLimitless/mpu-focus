import { NextRequest } from 'next/server'

export function assertAdminRequest(request: NextRequest): { ok: true } {
  const expected = process.env.ADMIN_DASHBOARD_KEY
  if (!expected) {
    throw new Error('ADMIN_DASHBOARD_KEY is not configured')
  }

  const provided = request.headers.get('x-admin-key')
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized')
  }

  return { ok: true }
}
