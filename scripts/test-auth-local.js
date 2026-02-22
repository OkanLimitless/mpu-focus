const { signInWithSupabasePassword } = require('../src/lib/supabase-auth')
const { ensureProfileForAuthUser } = require('../src/lib/mpu-profiles')

async function testAuth() {
    const email = 'admin@mpu-focus.de'
    const password = 'MPUFocus2026!'

    console.log('Testing auth flow for:', email)

    try {
        const authUser = await signInWithSupabasePassword(email, password)
        console.log('✅ Supabase Auth success:', authUser.id)

        const profile = await ensureProfileForAuthUser({
            authUserId: authUser.id,
            email: authUser.email,
            roleHint: 'admin'
        })
        console.log('✅ Profile verification success:', profile.role)
        console.log('All systems operational.')
    } catch (error) {
        console.error('❌ Auth flow failed:', error.message)
    }
}

testAuth()
