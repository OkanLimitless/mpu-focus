import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabaseUrl = process.env.SUPABASE_URL
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
            videoUrl: v.mux_playback_id ? `https://stream.mux.com/${v.mux_playback_id}.m3u8` : '', // Fallback for public LMS player
            thumbnailUrl: v.mux_playback_id ? `https://image.mux.com/${v.mux_playback_id}/thumbnail.jpg?time=0` : null,
            durationSeconds: v.duration_seconds,
            category: 'Lektion ' + (v.chapter_id || '1'),
            orderIndex: v.order_index
        })) || []

        return NextResponse.json({ videos: formattedVideos })
    } catch (error: any) {
        console.error('Error fetching videos:', error)
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }
}
