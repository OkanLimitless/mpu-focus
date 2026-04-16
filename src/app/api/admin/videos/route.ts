import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { buildSignedThumbnailUrl, ensureSignedPlaybackId, generateSignedPlaybackTokens, getMuxAsset } from '@/lib/mux'
import { createVideoFromMux, listVideosAdmin } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        await assertAdminRequest()

        const videos = await listVideosAdmin()
        const formattedVideos = videos.map(v => {
            const tokens = v.muxPlaybackId ? generateSignedPlaybackTokens(v.muxPlaybackId) : null
            return {
            // New shape for /admin/videos page
            id: v.id,
            title: v.title,
            description: v.description,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.muxPlaybackId && tokens
                ? buildSignedThumbnailUrl(v.muxPlaybackId, tokens.thumbnail)
                : v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
            category: v.category,
            orderIndex: v.orderIndex,
            isPublished: v.isPublished,
            muxAssetId: v.muxAssetId,
            muxPlaybackId: v.muxPlaybackId,
            muxStatus: v.muxStatus,
            createdAt: v.createdAt,

            // Backward-compatible shape for old admin components
            _id: v.id,
            chapterId: v.category,
            chapter: { id: v.category, title: `Modul ${v.category}` },
            order: v.orderIndex,
            duration: v.durationSeconds || 0,
            isActive: v.isPublished,
            status: v.muxStatus || 'unknown',
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

export async function POST(request: Request) {
    try {
        await assertAdminRequest()
        const body = await request.json()

        const title = typeof body.title === 'string' ? body.title.trim() : ''
        const description = typeof body.description === 'string' ? body.description.trim() : ''
        const category = typeof body.category === 'string' ? body.category.trim() : 'general'
        const orderIndex = Number.isFinite(body.orderIndex) ? Number(body.orderIndex) : 1
        const isPublished = body.isPublished === true

        if (!title) {
            return NextResponse.json({ error: 'Titel ist erforderlich.' }, { status: 400 })
        }

        let muxAssetId = typeof body.muxAssetId === 'string' ? body.muxAssetId.trim() : ''
        let muxPlaybackId = typeof body.muxPlaybackId === 'string' ? body.muxPlaybackId.trim() : ''
        let durationSeconds: number | null = null
        let muxStatus = 'ready'

        if (muxAssetId && !muxPlaybackId) {
            const asset = await getMuxAsset(muxAssetId)
            durationSeconds = typeof asset.duration === 'number' ? Math.round(asset.duration) : null
            muxStatus = asset.status || 'ready'
            muxPlaybackId = await ensureSignedPlaybackId(muxAssetId, asset.playbackId || '')
        }

        const video = await createVideoFromMux({
            title,
            description,
            category,
            orderIndex,
            isPublished,
            muxAssetId: muxAssetId || null,
            muxPlaybackId: muxPlaybackId || null,
            durationSeconds,
            muxStatus,
        })

        return NextResponse.json({ success: true, video }, { status: 201 })
    } catch (error: any) {
        console.error('Error creating video:', error)
        const status = error?.message?.toLowerCase?.().includes('unauthorized')
            ? 401
            : error?.message?.toLowerCase?.().includes('forbidden')
                ? 403
                : 500
        return NextResponse.json({ error: error?.message || 'Failed to create video' }, { status })
    }
}
