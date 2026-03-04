import { NextResponse } from 'next/server'
import { listVideosPublic } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const videos = await listVideosPublic()
        const formattedVideos = videos.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
            category: v.category || 'Lektion 1',
            orderIndex: v.orderIndex
        }))

        return NextResponse.json({ videos: formattedVideos })
    } catch (error: any) {
        console.error('Error fetching videos:', error)
        return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }
}
