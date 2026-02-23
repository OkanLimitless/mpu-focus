import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.chapterId !== undefined) updateData.chapter_id = body.chapterId
        if (body.order !== undefined) updateData.order_index = body.order
        if (body.muxAssetId !== undefined) updateData.mux_asset_id = body.muxAssetId

        const { data: video, error } = await supabaseAdmin
            .from('video_assets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error("Supabase Update Error:", error)
            throw error
        }

        return NextResponse.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                chapter: { id: video.chapter_id, title: 'Modul ' + video.chapter_id },
                order: video.order_index,
                muxAssetId: video.mux_asset_id
            }
        })

    } catch (error: any) {
        console.error('Error updating video:', error)
        return NextResponse.json({ error: 'Failed to update video' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase admin credentials missing')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        const { error } = await supabaseAdmin
            .from('video_assets')
            .delete()
            .eq('id', id)

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting video:', error)
        return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 })
    }
}
