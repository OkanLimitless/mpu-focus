import { normalizeEmail } from '@/lib/mpu-profiles'

type SupabaseAuthError = {
  msg?: string
  error_description?: string
  error?: string
  message?: string
}

type SupabaseAuthUser = {
  id: string
  email: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    full_name?: string
    [key: string]: unknown
  }
}

function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL
  if (!value) throw new Error('SUPABASE_URL is not configured')
  return value
}

function getAnonKey() {
  const value = process.env.SUPABASE_ANON_KEY
  if (!value) throw new Error('SUPABASE_ANON_KEY is not configured')
  return value
}

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return value
}

function parseErrorMessage(payload: SupabaseAuthError, fallback: string): string {
  return payload?.error_description || payload?.msg || payload?.message || payload?.error || fallback
}

export async function signInWithSupabasePassword(email: string, password: string): Promise<SupabaseAuthUser> {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: getAnonKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizeEmail(email),
      password,
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload?.user?.id || !payload?.user?.email) {
    throw new Error(parseErrorMessage(payload, 'Invalid login credentials'))
  }

  return payload.user as SupabaseAuthUser
}

export async function createSupabaseAuthUser(params: {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'admin' | 'student'
}): Promise<SupabaseAuthUser> {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: getServiceRoleKey(),
      Authorization: `Bearer ${getServiceRoleKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizeEmail(params.email),
      password: params.password,
      email_confirm: true,
      user_metadata: {
        first_name: params.firstName,
        last_name: params.lastName,
        role: params.role || 'student',
      },
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload?.id || !payload?.email) {
    throw new Error(parseErrorMessage(payload, 'Failed to create Supabase auth user'))
  }

  return payload as SupabaseAuthUser
}

export async function findSupabaseAuthUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: 'GET',
    headers: {
      apikey: getServiceRoleKey(),
      Authorization: `Bearer ${getServiceRoleKey()}`,
    },
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, 'Failed to list Supabase auth users'))
  }

  const users = Array.isArray(payload?.users) ? payload.users : []
  const normalized = normalizeEmail(email)
  const found = users.find((user: any) => normalizeEmail(String(user?.email || '')) === normalized)
  if (!found) return null

  return {
    id: found.id,
    email: found.email,
    user_metadata: found.user_metadata || {},
  }
}
