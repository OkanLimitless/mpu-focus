import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { ensureSignedPlaybackId, getMuxAsset } from '@/lib/mux'
import { deleteVideoById, getVideoChapterById, updateVideoById } from '@/lib/video-library'
import { fetchYouTubeDurationSeconds, parseYouTubeVideoId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await assertAdminRequest()
        const { id } = params
        const body = await request.json()

        const patch: any = {}
        if (body.title !== undefined) patch.title = typeof body.title === 'string' ? body.title : ''
        if (body.description !== undefined) patch.description = body.description == null ? null : String(body.description)
        if (body.category !== undefined) patch.category = typeof body.category === 'string' ? body.category : ''
        if (body.chapterId !== undefined) {
            const chapterId = typeof body.chapterId === 'string' ? body.chapterId.trim() : ''
            const chapter = chapterId ? await getVideoChapterById(chapterId) : null
            patch.chapterId = chapter?.id || null
            patch.category = chapter?.slug || patch.category || 'general'
        }
        if (body.order !== undefined && Number.isFinite(Number(body.order))) patch.orderIndex = Number(body.order)
        if (body.orderIndex !== undefined && Number.isFinite(Number(body.orderIndex))) patch.orderIndex = Number(body.orderIndex)
        if (body.isPublished !== undefined) patch.isPublished = !!body.isPublished

        if (body.youtubeUrl !== undefined) {
            const youtubeInput = String(body.youtubeUrl || '').trim()
            if (youtubeInput) {
                const youtubeVideoId = parseYouTubeVideoId(youtubeInput)
                if (!youtubeVideoId) {
                    return NextResponse.json({ error: 'Ungültiger YouTube-Link. Bitte den vollständigen Link zum Video einfügen.' }, { status: 400 })
                }
                patch.provider = 'youtube'
                patch.youtubeVideoId = youtubeVideoId
                const durationSeconds = await fetchYouTubeDurationSeconds(youtubeVideoId)
                if (durationSeconds) patch.durationSeconds = durationSeconds
            }
        }

        if (body.muxAssetId !== undefined) {
            const muxAssetId = String(body.muxAssetId || '').trim()
            patch.muxAssetId = muxAssetId || null

            if (muxAssetId) {
                const asset = await getMuxAsset(muxAssetId)
                patch.durationSeconds = typeof asset.duration === 'number' ? Math.round(asset.duration) : null
                patch.muxStatus = asset.status || 'ready'
                patch.muxPlaybackId = await ensureSignedPlaybackId(muxAssetId, asset.playbackId || null)
            } else {
                patch.muxPlaybackId = null
                patch.muxStatus = null
            }
        }

        const video = await updateVideoById(id, patch)

        return NextResponse.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                description: video.description,
                category: video.category,
                categoryId: video.categoryId,
                categoryTitle: video.categoryTitle,
                categorySlug: video.categorySlug,
                chapterId: video.chapterId,
                chapterTitle: video.chapterTitle,
                chapterSlug: video.chapterSlug,
                chapter: { id: video.chapterId || video.category, title: video.chapterTitle || 'Modul ' + video.category },
                order: video.orderIndex,
                orderIndex: video.orderIndex,
                isPublished: video.isPublished,
                videoUrl: video.videoUrl,
                thumbnailUrl: video.thumbnailUrl,
                durationSeconds: video.durationSeconds,
                provider: video.provider,
                youtubeVideoId: video.youtubeVideoId,
                muxAssetId: video.muxAssetId,
                muxPlaybackId: video.muxPlaybackId,
                muxStatus: video.muxStatus,
            }
        })

    } catch (error: any) {
        console.error('Error updating video:', error)
        const status = error?.message?.toLowerCase?.().includes('unauthorized')
            ? 401
            : error?.message?.toLowerCase?.().includes('forbidden')
                ? 403
                : 500
        return NextResponse.json({ error: error?.message || 'Failed to update video' }, { status })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await assertAdminRequest()
        const { id } = params
        await deleteVideoById(id)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting video:', error)
        const status = error?.message?.toLowerCase?.().includes('unauthorized')
            ? 401
            : error?.message?.toLowerCase?.().includes('forbidden')
                ? 403
                : 500
        return NextResponse.json({ error: error?.message || 'Failed to delete video' }, { status })
    }
}
