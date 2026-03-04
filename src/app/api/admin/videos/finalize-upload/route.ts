import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { createPublicPlaybackId, getMuxAsset, getMuxUpload } from '@/lib/mux'
import { createVideoFromMux, findVideoByMuxAssetId, findVideoByPlaybackId, updateVideoById } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()

    const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : 'general'
    const orderIndex = Number.isFinite(body.orderIndex) ? Number(body.orderIndex) : 1
    const isPublished = body.isPublished === true

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'Titel ist erforderlich.' }, { status: 400 })
    }

    const upload = await getMuxUpload(uploadId)
    if (!upload.assetId) {
      return NextResponse.json({
        ready: false,
        status: upload.status || 'waiting_for_upload',
      }, { status: 202 })
    }

    const asset = await getMuxAsset(upload.assetId)
    let playbackId = asset.playbackId || null
    if (!playbackId) {
      playbackId = await createPublicPlaybackId(upload.assetId)
    }

    const existing = (await findVideoByMuxAssetId(upload.assetId))
      || (playbackId ? await findVideoByPlaybackId(playbackId) : null)
    const durationSeconds = typeof asset.duration === 'number' ? Math.round(asset.duration) : null

    const video = existing
      ? await updateVideoById(existing.id, {
        title,
        description,
        category,
        orderIndex,
        isPublished,
        muxAssetId: upload.assetId,
        muxPlaybackId: playbackId,
        muxStatus: asset.status || 'ready',
        durationSeconds,
      })
      : await createVideoFromMux({
        title,
        description,
        category,
        orderIndex,
        isPublished,
        muxAssetId: upload.assetId,
        muxPlaybackId: playbackId,
        muxStatus: asset.status || 'ready',
        durationSeconds,
      })

    return NextResponse.json({
      ready: true,
      video,
    })
  } catch (error: any) {
    console.error('Error finalizing video upload:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to finalize upload' }, { status })
  }
}
