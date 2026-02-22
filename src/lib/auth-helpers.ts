import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProfileByEmail } from '@/lib/mpu-profiles'

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return { ok: false as const, status: 401 as const, error: 'Unauthorized' as const, session: null }
  }
  return { ok: true as const, status: 200 as const, error: null, session }
}

export async function requireAdmin() {
  const sessionRes = await requireSession()
  if (!sessionRes.ok) return sessionRes
  const email = sessionRes.session!.user!.email as string
  const profile = await getProfileByEmail(email)
  if (!profile || !profile.is_active || profile.role !== 'admin') {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' as const, session: sessionRes.session }
  }
  return { ok: true as const, status: 200 as const, error: null, session: sessionRes.session }
}
