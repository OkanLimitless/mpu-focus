import { NextResponse } from 'next/server'
import { requireAcademyAccess } from '@/lib/auth-helpers'
import { listVideoProgressForProfile, listVideosPublic } from '@/lib/video-library'
import { buildSignedThumbnailUrl, generateSignedPlaybackTokens } from '@/lib/mux'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const access = await requireAcademyAccess()
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status })
        }

        const videos = await listVideosPublic()
        const progressByVideoId = await listVideoProgressForProfile(access.profile.id)
        const formattedVideos = videos.map(v => {
            const tokens = v.muxPlaybackId ? generateSignedPlaybackTokens(v.muxPlaybackId) : null
            return {
                id: v.id,
                title: v.title,
                description: v.description,
                videoUrl: v.videoUrl,
                thumbnailUrl: v.muxPlaybackId && tokens
                    ? buildSignedThumbnailUrl(v.muxPlaybackId, tokens.thumbnail)
                    : v.thumbnailUrl,
                durationSeconds: v.durationSeconds,
                category: v.category || 'Lektion 1',
                orderIndex: v.orderIndex,
                muxPlaybackId: v.muxPlaybackId,
                progress: progressByVideoId.get(v.id) || null,
            }
        })

        return NextResponse.json({ videos: formattedVideos })
    } catch (error: any) {
        console.error('Error fetching videos:', error)
        const status = error?.message?.toLowerCase?.().includes('unauthorized')
            ? 401
            : error?.message?.toLowerCase?.().includes('forbidden')
                ? 403
                : 500
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status })
    }
}
