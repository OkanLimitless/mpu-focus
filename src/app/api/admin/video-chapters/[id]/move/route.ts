import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { moveVideoChapter } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const direction = body.direction === 'up' ? 'up' : 'down'
    const chapter = await moveVideoChapter(params.id, direction)
    return NextResponse.json({ success: true, chapter })
  } catch (error: any) {
    console.error('Error moving video chapter:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to move chapter' }, { status })
  }
}
