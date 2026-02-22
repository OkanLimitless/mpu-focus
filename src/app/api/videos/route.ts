import { NextResponse } from 'next/server'
import { supabaseRest } from '@/lib/supabase-rest'

export const dynamic = 'force-dynamic'

type VideoRow = {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  category: string
  order_index: number
  is_published: boolean
}

export async function GET() {
  try {
    const { data } = await supabaseRest<VideoRow[]>({
      path: 'mpu_video_library',
      query: {
        select: 'id,title,description,video_url,thumbnail_url,duration_seconds,category,order_index,is_published',
        is_published: 'eq.true',
        order: 'order_index.asc,created_at.desc',
      },
    })

    return NextResponse.json({
      videos: (data || []).map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        durationSeconds: video.duration_seconds,
        category: video.category,
        orderIndex: video.order_index,
      })),
    })
  } catch (error) {
    console.error('Error fetching video library:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
