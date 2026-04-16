import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { ensureSignedPlaybackId, generateSignedPlaybackTokens } from '@/lib/mux'
import { getVideoById, updateVideoById } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireAcademyAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const video = await getVideoById(params.id)
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const isAdmin = access.profile.role === 'admin'
    if (!isAdmin && !video.isPublished) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let playbackId = video.muxPlaybackId
    if (video.muxAssetId) {
      playbackId = await ensureSignedPlaybackId(video.muxAssetId, video.muxPlaybackId)
      if (playbackId !== video.muxPlaybackId) {
        await updateVideoById(video.id, { muxPlaybackId: playbackId })
      }
    }

    if (!playbackId) {
      return NextResponse.json({ error: 'Playback unavailable' }, { status: 409 })
    }

    return NextResponse.json({
      playbackId,
      tokens: generateSignedPlaybackTokens(playbackId),
    })
  } catch (error: any) {
    console.error('Error creating signed playback response:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to create playback response' }, { status })
  }
}
