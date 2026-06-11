import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { moveVideoWithinChapter } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const direction = body.direction === 'up' ? 'up' : 'down'
    const video = await moveVideoWithinChapter(params.id, direction)
    return NextResponse.json({ success: true, video })
  } catch (error: any) {
    console.error('Error moving video:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to move video' }, { status })
  }
}
