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

function isMissingRelation(error: any, relation: string) {
    if (!error) return false
    const message = String(error?.message || '').toLowerCase()
    const details = String(error?.details || '').toLowerCase()
    return error?.code === '42P01' || message.includes(relation.toLowerCase()) || details.includes(relation.toLowerCase())
}

async function countRows(params: {
    supabaseAdmin: any
    table: string
    eq?: { column: string; value: string | boolean }
    inValues?: { column: string; values: string[] }
}) {
    const { supabaseAdmin, table, eq, inValues } = params
    let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (eq) query = query.eq(eq.column, eq.value)
    if (inValues) query = query.in(inValues.column, inValues.values)
    const { count, error } = await query
    if (error) throw error
    return count || 0
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

        // Prefer MPU-specific source, fallback to legacy table if missing.
        let leadTable = 'mpu_signups'
        try {
            await countRows({ supabaseAdmin, table: leadTable })
        } catch (e: any) {
            if (isMissingRelation(e, 'mpu_signups')) {
                leadTable = 'leads'
            } else {
                throw e
            }
        }

        const statusMap = leadTable === 'mpu_signups'
            ? {
                new: ['new'],
                contacted: ['contacted'],
                enrolled: ['enrolled'],
                closed: ['closed'],
            }
            : {
                new: ['NEW', 'new'],
                contacted: ['CALLED', 'contacted'],
                enrolled: ['SOLD', 'enrolled'],
                closed: ['LOST', 'closed'],
            }

        const [
            totalLeads,
            newLeads,
            contactedLeads,
            enrolledLeads,
            closedLeads,
            totalVideos,
            publishedVideos,
        ] = await Promise.all([
            countRows({ supabaseAdmin, table: leadTable }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.new } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.contacted } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.enrolled } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.closed } }),
            countRows({ supabaseAdmin, table: 'mpu_video_library' }),
            countRows({ supabaseAdmin, table: 'mpu_video_library', eq: { column: 'is_published', value: true } }),
        ])

        return NextResponse.json({
            stats: {
                totalLeads,
                newLeads,
                contactedLeads,
                enrolledLeads,
                closedLeads,
                totalVideos,
                publishedVideos,
            }
        })
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: getHttpStatus(error) })
    }
}
