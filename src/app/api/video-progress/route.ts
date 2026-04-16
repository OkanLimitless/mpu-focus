import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { getVideoById, upsertVideoProgress } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

function clampNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.min(max, Math.max(min, parsed))
}

export async function POST(request: Request) {
  try {
    const access = await requireAcademyAccess()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const body = await request.json()
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : ''
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const video = await getVideoById(videoId)
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    if (access.profile.role !== 'admin' && !video.isPublished) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const totalDuration = Math.max(1, clampNumber(body.totalDuration, 1, 24 * 60 * 60))
    const currentTime = clampNumber(body.currentTime, 0, totalDuration)
    const watchedDuration = clampNumber(body.watchedDuration ?? currentTime, 0, totalDuration)
    const completionPercentage = clampNumber(
      Math.round((Math.max(currentTime, watchedDuration) / totalDuration) * 100),
      0,
      100,
    )
    const isCompleted = body.isCompleted === true || completionPercentage >= 90

    const progress = await upsertVideoProgress({
      profileId: access.profile.id,
      videoId,
      currentTime: Math.round(currentTime),
      watchedDuration: Math.round(Math.max(currentTime, watchedDuration)),
      completionPercentage,
      isCompleted,
    })

    return NextResponse.json({ progress })
  } catch (error: any) {
    console.error('Error saving video progress:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to save video progress' }, { status })
  }
}
