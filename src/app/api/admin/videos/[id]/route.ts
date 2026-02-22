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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()

    const body = await request.json()
    const patch: Record<string, unknown> = {}

    if (body?.title !== undefined) patch.title = String(body.title).trim()
    if (body?.description !== undefined) patch.description = body.description ? String(body.description).trim() : null
    if (body?.videoUrl !== undefined) patch.video_url = String(body.videoUrl).trim()
    if (body?.thumbnailUrl !== undefined) patch.thumbnail_url = body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null
    if (body?.category !== undefined) patch.category = String(body.category).trim()
    if (body?.durationSeconds !== undefined) patch.duration_seconds = body.durationSeconds ? Number(body.durationSeconds) : null
    if (body?.orderIndex !== undefined) patch.order_index = Number(body.orderIndex)
    if (body?.isPublished !== undefined) patch.is_published = Boolean(body.isPublished)

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data } = await supabaseRest<VideoRow[]>({
      path: 'mpu_video_library',
      method: 'PATCH',
      query: {
        id: `eq.${params.id}`,
        select: '*',
      },
      body: patch,
      useServiceRole: true,
      prefer: 'return=representation',
    })

    const video = data?.[0]
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, video: mapVideo(video) })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (String(error?.message) === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()

    await supabaseRest({
      path: 'mpu_video_library',
      method: 'DELETE',
      query: {
        id: `eq.${params.id}`,
      },
      useServiceRole: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (String(error?.message) === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
