import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
    const { default: Chapter } = await import('@/models/Chapter')
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get all videos with chapter information
    const videos = await Video.find()
      .populate('chapterId', 'title')
      .sort({ order: 1, createdAt: -1 })
      .lean()

    return NextResponse.json({
      videos: videos.map(video => ({
        ...video,
        chapterTitle: video.chapterId?.title || 'No Chapter'
      }))
    })

  } catch (error: any) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
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

    const { title, description, muxAssetId, order, chapterId } = await request.json()

    if (!title || !chapterId) {
      return NextResponse.json(
        { error: 'Title and Chapter are required' },
        { status: 400 }
      )
    }

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Validate that chapterId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return NextResponse.json(
        { error: 'Invalid Chapter ID format' },
        { status: 400 }
      )
    }

    // If Mux Asset ID is provided, fetch details from Mux
    let muxPlaybackId = ''
    let duration = 0
    let status = 'ready' // Default to ready for videos without Mux

    if (muxAssetId) {
      try {
        const muxAsset = await getMuxAsset(muxAssetId)
        // Prefer signed playback id
        const signed = (muxAsset.playbackIds || []).find((p: any) => p.policy === 'signed')
        muxPlaybackId = (signed?.id) || muxAsset.playbackId || ''
        duration = muxAsset.duration || 0
        status = muxAsset.status || 'preparing'
      } catch (error) {
        console.error('Error fetching Mux asset:', error)
        return NextResponse.json(
          { error: 'Invalid Mux Asset ID or unable to fetch asset details' },
          { status: 400 }
        )
      }
    }

    // Verify chapter exists
    const chapter = await Chapter.findById(chapterId)
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Create new video
    const video = new Video({
      title,
      description: description.trim(),
      muxAssetId: muxAssetId || undefined,
      muxPlaybackId: muxPlaybackId || undefined,
      duration,
      order: order || 1,
      chapterId: new mongoose.Types.ObjectId(chapterId),
      status: status,
      isActive: true
    })

    await video.save()

    return NextResponse.json({
      message: 'Video created successfully',
      video: {
        ...video.toObject(),
        status
      }
    })

  } catch (error: any) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}