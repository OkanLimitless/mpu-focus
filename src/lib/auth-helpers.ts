import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

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
  await connectDB()
  const adminUser = await User.findOne({ email: sessionRes.session!.user!.email })
  if (!adminUser || adminUser.role !== 'admin') {
    return { ok: false as const, status: 403 as const, error: 'Forbidden' as const, session: sessionRes.session }
  }
  return { ok: true as const, status: 200 as const, error: null, session: sessionRes.session }
}