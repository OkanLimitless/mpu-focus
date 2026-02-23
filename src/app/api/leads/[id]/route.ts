import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const body = await request.json()

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase admin credentials missing')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        const updateData: any = {}
        if (body.status !== undefined) updateData.status = body.status
        if (body.notes !== undefined) updateData.notes = body.notes

        const { data: lead, error } = await supabaseAdmin
            .from('leads')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error("Supabase Update Error:", error)
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
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
}
