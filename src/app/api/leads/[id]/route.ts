import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['new', 'contacted', 'enrolled', 'closed'])

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

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await assertAdminRequest()

        const { id } = params
        const body = await request.json()

        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase admin credentials missing')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        const updateData: any = {}
        if (body.status !== undefined) {
            if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status)) {
                return NextResponse.json({ error: 'Ungueltiger Status.' }, { status: 400 })
            }
            updateData.status = body.status
        }
        if (body.notes !== undefined) {
            if (body.notes !== null && typeof body.notes !== 'string') {
                return NextResponse.json({ error: 'Ungueltige Notiz.' }, { status: 400 })
            }
            updateData.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : null
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Keine gueltigen Felder fuer das Update uebergeben.' }, { status: 400 })
        }

        let lead: any = null
        let error: any = null

        const mpuUpdate = await supabaseAdmin
            .from('mpu_signups')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (!mpuUpdate.error) {
            lead = mpuUpdate.data
        } else if (isMissingRelation(mpuUpdate.error, 'mpu_signups')) {
            const legacyUpdate = await supabaseAdmin
                .from('leads')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()
            lead = legacyUpdate.data
            error = legacyUpdate.error
        } else {
            error = mpuUpdate.error
        }

        if (error) {
            console.error('Supabase Update Error:', error)
            throw error
        }

        // Map back to expected format
        return NextResponse.json({
            success: true,
            lead: {
                _id: lead.id,
                firstName: lead.first_name,
                lastName: lead.last_name,
                email: lead.email,
                phone: lead.phone,
                status: lead.status,
                goals: lead.goals,
                notes: lead.notes,
                createdAt: lead.created_at
            }
        })

    } catch (error: any) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: getHttpStatus(error) })
    }
}
