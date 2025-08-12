import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: Video } = await import('@/models/Video')
    const { getMuxAsset } = await import('@/lib/mux')
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Validate video ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      )
    }

    // Find the video
    const video = await Video.findById(params.id)
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Check if video has a Mux Asset ID
    if (!video.muxAssetId) {
      return NextResponse.json(
        { error: 'Video does not have a Mux Asset ID' },
        { status: 400 }
      )
    }

    // Fetch latest information from Mux
    try {
      const muxAsset = await getMuxAsset(video.muxAssetId)

      // Prefer a signed playback ID if available
      const signed = (muxAsset.playbackIds || []).find((p: any) => p.policy === 'signed')
      const selectedPlaybackId = (signed?.id) || muxAsset.playbackId || ''
      
      // Update video with latest Mux information
      const updatedVideo = await Video.findByIdAndUpdate(
        params.id,
        {
          muxPlaybackId: selectedPlaybackId,
          duration: muxAsset.duration || video.duration,
          status: muxAsset.status || video.status
        },
        { new: true }
      )

      return NextResponse.json({
        message: 'Mux asset synced successfully',
        video: updatedVideo,
        muxAsset: {
          status: muxAsset.status,
          duration: muxAsset.duration,
          playbackId: selectedPlaybackId
        }
      })

    } catch (muxError) {
      console.error('Error fetching Mux asset:', muxError)
      return NextResponse.json(
        { error: 'Failed to fetch Mux asset information' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Error syncing Mux asset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}