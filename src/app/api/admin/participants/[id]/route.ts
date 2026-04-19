import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  if (message.includes('not configured')) return 503
  return 500
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, boolean> = {}

    if (typeof body.academyAccessEnabled === 'boolean') {
      patch.academy_access_enabled = body.academyAccessEnabled
    }

    if (typeof body.isActive === 'boolean') {
      patch.is_active = body.isActive
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('mpu_profiles')
      .update(patch)
      .eq('id', params.id)
      .eq('role', 'student')
      .select('id,email,first_name,last_name,role,is_active,academy_access_enabled,created_at,updated_at')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 })
    }

    return NextResponse.json({
      participant: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        isActive: data.is_active === true,
        academyAccessEnabled: data.academy_access_enabled === true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Error updating participant:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update participant' }, { status: getHttpStatus(error) })
  }
}
