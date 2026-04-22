import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'
import { listVideosAdmin } from '@/lib/video-library'

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

function isMissingColumn(error: any, column: string) {
    if (!error) return false
    const message = String(error?.message || '').toLowerCase()
    const details = String(error?.details || '').toLowerCase()
    const normalizedColumn = column.toLowerCase()
    return error?.code === '42703'
        || error?.code === 'PGRST204'
        || message.includes(normalizedColumn)
        || details.includes(normalizedColumn)
}

async function countRows(params: {
    supabaseAdmin: any
    table: string
    eq?: { column: string; value: string | boolean }
    eqs?: Array<{ column: string; value: string | boolean }>
    inValues?: { column: string; values: string[] }
}) {
    const { supabaseAdmin, table, eq, eqs, inValues } = params
    let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    if (eq) query = query.eq(eq.column, eq.value)
    if (eqs) {
        for (const item of eqs) query = query.eq(item.column, item.value)
    }
    if (inValues) query = query.in(inValues.column, inValues.values)
    const { count, error } = await query
    if (error) throw error
    return count || 0
}

async function hasColumn(supabaseAdmin: any, table: string, column: string) {
    const result = await supabaseAdmin
        .from(table)
        .select(column)
        .limit(1)

    if (!result.error) return true
    if (isMissingColumn(result.error, column) || isMissingRelation(result.error, table)) return false
    throw result.error
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

        const leadCountsPromise = Promise.all([
            countRows({ supabaseAdmin, table: leadTable }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.new } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.contacted } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.enrolled } }),
            countRows({ supabaseAdmin, table: leadTable, inValues: { column: 'status', values: statusMap.closed } }),
        ])

        const participantCountsPromise = (async () => {
            try {
                const totalParticipants = await countRows({ supabaseAdmin, table: 'mpu_profiles', eq: { column: 'role', value: 'student' } })
                let academyEnabledParticipants = 0

                if (await hasColumn(supabaseAdmin, 'mpu_profiles', 'academy_access_enabled')) {
                    academyEnabledParticipants = await countRows({
                        supabaseAdmin,
                        table: 'mpu_profiles',
                        eqs: [
                            { column: 'role', value: 'student' },
                            { column: 'academy_access_enabled', value: true },
                        ],
                    })
                }

                return { totalParticipants, academyEnabledParticipants }
            } catch (error: any) {
                if (isMissingRelation(error, 'mpu_profiles')) {
                    return { totalParticipants: 0, academyEnabledParticipants: 0 }
                }
                throw error
            }
        })()

        const videoCountsPromise = (async () => {
            try {
                const videos = await listVideosAdmin()
                return {
                    totalVideos: videos.length,
                    publishedVideos: videos.filter((video) => video.isPublished).length,
                }
            } catch (error: any) {
                if (
                    isMissingRelation(error, 'mpu_video_library')
                    || isMissingRelation(error, 'video_assets')
                ) {
                    return { totalVideos: 0, publishedVideos: 0 }
                }
                throw error
            }
        })()

        const [
            [totalLeads, newLeads, contactedLeads, enrolledLeads, closedLeads],
            { totalParticipants, academyEnabledParticipants },
            { totalVideos, publishedVideos },
        ] = await Promise.all([
            leadCountsPromise,
            participantCountsPromise,
            videoCountsPromise,
        ])

        return NextResponse.json({
            stats: {
                totalLeads,
                newLeads,
                contactedLeads,
                enrolledLeads,
                closedLeads,
                totalParticipants,
                academyEnabledParticipants,
                totalVideos,
                publishedVideos,
            }
        })
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: getHttpStatus(error) })
    }
}
