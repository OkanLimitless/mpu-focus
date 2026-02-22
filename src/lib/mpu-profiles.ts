import { supabaseRest } from '@/lib/supabase-rest'

export type MpuProfileRole = 'admin' | 'student'

export type MpuProfileRow = {
  id: string
  auth_user_id: string | null
  email: string
  first_name: string
  last_name: string
  role: MpuProfileRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function splitNameFromEmail(email: string): { firstName: string; lastName: string } {
  const localPart = email.split('@')[0] || 'user'
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim()
  const words = cleaned.split(' ').filter(Boolean)

  if (words.length === 0) {
    return { firstName: 'User', lastName: 'Account' }
  }

  if (words.length === 1) {
    return { firstName: words[0], lastName: 'User' }
  }

  return {
    firstName: words[0],
    lastName: words.slice(1).join(' '),
  }
}

export async function getProfileByEmail(email: string): Promise<MpuProfileRow | null> {
  const normalized = normalizeEmail(email)
  const { data } = await supabaseRest<MpuProfileRow[]>({
    path: 'mpu_profiles',
    query: {
      select: '*',
      email: `eq.${normalized}`,
      limit: 1,
    },
    useServiceRole: true,
  })

  return data?.[0] || null
}

export async function getProfileByAuthUserId(authUserId: string): Promise<MpuProfileRow | null> {
  const { data } = await supabaseRest<MpuProfileRow[]>({
    path: 'mpu_profiles',
    query: {
      select: '*',
      auth_user_id: `eq.${authUserId}`,
      limit: 1,
    },
    useServiceRole: true,
  })

  return data?.[0] || null
}

export async function upsertProfile(params: {
  email: string
  authUserId?: string | null
  firstName: string
  lastName: string
  role?: MpuProfileRole
  isActive?: boolean
}): Promise<MpuProfileRow> {
  const { data } = await supabaseRest<MpuProfileRow[]>({
    path: 'mpu_profiles',
    method: 'POST',
    query: {
      on_conflict: 'email',
    },
    body: {
      email: normalizeEmail(params.email),
      auth_user_id: params.authUserId || null,
      first_name: params.firstName.trim() || 'User',
      last_name: params.lastName.trim() || 'Account',
      role: params.role || 'student',
      is_active: params.isActive ?? true,
    },
    useServiceRole: true,
    prefer: 'resolution=merge-duplicates,return=representation',
  })

  const profile = data?.[0]
  if (!profile) {
    throw new Error('Failed to upsert profile')
  }

  return profile
}

export async function ensureProfileForAuthUser(params: {
  authUserId: string
  email: string
  firstName?: string
  lastName?: string
  roleHint?: MpuProfileRole
}): Promise<MpuProfileRow> {
  const normalizedEmail = normalizeEmail(params.email)

  let profile = await getProfileByAuthUserId(params.authUserId)
  if (profile) return profile

  const byEmail = await getProfileByEmail(normalizedEmail)
  if (byEmail) {
    const mergedRole = params.roleHint === 'admin' ? 'admin' : byEmail.role
    if (!byEmail.auth_user_id || byEmail.auth_user_id !== params.authUserId) {
      return upsertProfile({
        email: normalizedEmail,
        authUserId: params.authUserId,
        firstName: byEmail.first_name,
        lastName: byEmail.last_name,
        role: mergedRole,
        isActive: byEmail.is_active,
      })
    }
    if (mergedRole !== byEmail.role) {
      return upsertProfile({
        email: normalizedEmail,
        authUserId: params.authUserId,
        firstName: byEmail.first_name,
        lastName: byEmail.last_name,
        role: mergedRole,
        isActive: byEmail.is_active,
      })
    }
    return { ...byEmail, role: mergedRole }
  }

  const fallback = splitNameFromEmail(normalizedEmail)

  return upsertProfile({
    email: normalizedEmail,
    authUserId: params.authUserId,
    firstName: params.firstName || fallback.firstName,
    lastName: params.lastName || fallback.lastName,
    role: params.roleHint || 'student',
    isActive: true,
  })
}
