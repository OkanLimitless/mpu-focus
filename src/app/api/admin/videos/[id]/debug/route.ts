import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Video from '@/models/Video'
import User from '@/models/User'
import { getMuxAsset, generateSignedPlaybackToken } from '@/lib/mux'
import mongoose from 'mongoose'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid video id' }, { status: 400 })
    }

    const video = await Video.findById(params.id).select('title muxAssetId muxPlaybackId isActive')
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    let muxInfo: any = null
    if (video.muxAssetId) {
      muxInfo = await getMuxAsset(video.muxAssetId)
    }

    const playbackIds = muxInfo?.playbackIds || []
    const signed = playbackIds.find((p: any) => p.policy === 'signed')?.id || null
    const publicId = playbackIds.find((p: any) => p.policy === 'public')?.id || null

    // Create a short-lived test URL if we have a signed id
    let testUrl: string | null = null
    if (signed) {
      try {
        const token = generateSignedPlaybackToken(signed, 60)
        testUrl = `https://stream.mux.com/${signed}.m3u8?token=${token}`
      } catch {
        testUrl = null
      }
    }

    return NextResponse.json({
      video: {
        id: video._id,
        title: video.title,
        dbPlaybackId: video.muxPlaybackId || null,
        muxAssetId: video.muxAssetId || null,
        isActive: video.isActive,
      },
      muxAsset: {
        playbackIds,
        preferredSigned: signed,
        publicId,
      },
      mismatch: Boolean(signed && video.muxPlaybackId && video.muxPlaybackId !== signed),
      testUrl,
    })
  } catch (error) {
    console.error('Admin video debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}