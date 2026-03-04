import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { createMuxDirectUpload } from '@/lib/mux'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const category = typeof body?.category === 'string' ? body.category.trim() : ''

    const passthrough = JSON.stringify({
      title: title || null,
      category: category || null,
      source: 'admin-video-upload',
      createdAt: new Date().toISOString(),
    })

    const upload = await createMuxDirectUpload({
      playbackPolicy: 'public',
      mp4Support: 'standard',
      passthrough,
    })

    return NextResponse.json({
      uploadId: upload.uploadId,
      uploadUrl: upload.uploadUrl,
    })
  } catch (error: any) {
    console.error('Error creating Mux upload URL:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to create upload URL' }, { status })
  }
}
