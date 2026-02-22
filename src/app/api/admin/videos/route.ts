import { NextRequest, NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { supabaseRest } from '@/lib/supabase-rest'

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
  created_at: string
  updated_at: string
}

function mapVideo(row: VideoRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    category: row.category,
    orderIndex: row.order_index,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request)

    const { data } = await supabaseRest<VideoRow[]>({
      path: 'mpu_video_library',
      query: {
        select: '*',
        order: 'order_index.asc,created_at.desc',
      },
      useServiceRole: true,
    })

    return NextResponse.json({ videos: (data || []).map(mapVideo) })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request)

    const body = await request.json()
    const title = String(body?.title || '').trim()
    const videoUrl = String(body?.videoUrl || '').trim()
    const description = body?.description ? String(body.description).trim() : null
    const category = body?.category ? String(body.category).trim() : 'general'
    const thumbnailUrl = body?.thumbnailUrl ? String(body.thumbnailUrl).trim() : null
    const durationSeconds = body?.durationSeconds ? Number(body.durationSeconds) : null
    const orderIndex = body?.orderIndex ? Number(body.orderIndex) : 0
    const isPublished = body?.isPublished !== undefined ? Boolean(body.isPublished) : true

    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'title and videoUrl are required' }, { status: 400 })
    }

    const { data } = await supabaseRest<VideoRow[]>({
      path: 'mpu_video_library',
      method: 'POST',
      body: {
        title,
        video_url: videoUrl,
        description,
        category,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSeconds,
        order_index: orderIndex,
        is_published: isPublished,
      },
      useServiceRole: true,
      prefer: 'return=representation',
    })

    return NextResponse.json({
      success: true,
      video: data?.[0] ? mapVideo(data[0]) : null,
    }, { status: 201 })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
