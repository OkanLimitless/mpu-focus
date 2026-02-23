import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase admin credentials missing')
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false }
        })

        const { data: videos, error } = await supabaseAdmin
            .from('video_assets')
            .select('*')
            .order('order_index', { ascending: true })

        if (error) {
            console.error("Supabase Error:", error)
            throw error
        }

        const formattedVideos = videos?.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description,
            chapter: { id: v.chapter_id, title: 'Modul ' + v.chapter_id },
            order: v.order_index,
            duration: v.duration_seconds,
            muxAssetId: v.mux_asset_id,
            muxPlaybackId: v.mux_playback_id,
            muxStatus: v.mux_status
        })) || []

        return NextResponse.json({ videos: formattedVideos })
    } catch (error: any) {
        console.error('Error fetching videos:', error)
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }
}
