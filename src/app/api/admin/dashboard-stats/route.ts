import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('unauthorized')) return 401
    if (message.includes('forbidden')) return 403
    return 500
}

export async function GET() {
    try {
        await assertAdminRequest()

        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase admin credentials missing')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        // Fetch counts from leads table
        const { count: totalLeads } = await supabaseAdmin
            .from('leads')
            .select('*', { count: 'exact', head: true })

        const { count: newLeads } = await supabaseAdmin
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'new')

        // Fetch counts from users table
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })

        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_login_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        return NextResponse.json({
            stats: {
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                totalLeads: totalLeads || 0,
                newLeads: newLeads || 0
            }
        })
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: getHttpStatus(error) })
    }
}
