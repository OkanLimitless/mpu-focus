import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProfileByEmail } from '@/lib/mpu-profiles'

export async function assertAdminRequest(): Promise<{ ok: true; email: string }> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Unauthorized')
  }

  const profile = await getProfileByEmail(email)
  if (!profile || !profile.is_active || profile.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return { ok: true, email }
}
