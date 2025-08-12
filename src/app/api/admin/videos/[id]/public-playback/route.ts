import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Video from '@/models/Video'
import { createPublicPlaybackId, getMuxAsset } from '@/lib/mux'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const video = await Video.findById(params.id)
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    if (!video.muxAssetId) {
      return NextResponse.json({ error: 'Video has no Mux asset' }, { status: 400 })
    }

    // Check if a public ID already exists
    const asset = await getMuxAsset(video.muxAssetId)
    const existingPublic = (asset.playbackIds || []).find((p: any) => p.policy === 'public')?.id

    const publicId = existingPublic || await createPublicPlaybackId(video.muxAssetId)
    video.muxPlaybackId = publicId
    await video.save()

    return NextResponse.json({ success: true, playbackId: publicId })
  } catch (error) {
    console.error('create public playback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}