import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthUser, findSupabaseAuthUserByEmail } from '@/lib/supabase-auth'
import { normalizeEmail, upsertProfile } from '@/lib/mpu-profiles'

export async function POST(request: NextRequest) {
  try {
    // Require a strong install token
    const installToken = process.env.ADMIN_INSTALL_TOKEN
    const provided = request.headers.get('x-install-token') || ''
    if (!installToken || provided !== installToken) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@mpu-focus.com')
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'

    let authUser = await findSupabaseAuthUserByEmail(adminEmail)

    if (!authUser) {
      authUser = await createSupabaseAuthUser({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      })
    }

    await upsertProfile({
      email: adminEmail,
      authUserId: authUser.id,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    })

    return NextResponse.json(
      {
        message: 'Admin user is ready in Supabase',
        email: adminEmail,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating Supabase admin user:', error)
    return NextResponse.json(
      { message: 'Failed to create admin user' },
      { status: 500 },
    )
  }
}
