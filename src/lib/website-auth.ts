import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProfileByEmail } from '@/lib/mpu-profiles'
import { isWebsiteEditorEmail } from '@/lib/website-access'

export async function assertWebsiteEditorRequest() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.trim().toLowerCase()
  if (!email || !session?.user?.id) throw new Error('Unauthorized')
  const profile = await getProfileByEmail(email)
  if (!profile?.is_active || profile.auth_user_id !== session.user.id ||
      (profile.role !== 'admin' && !isWebsiteEditorEmail(email))) {
    throw new Error('Forbidden')
  }
  return { email }
}
