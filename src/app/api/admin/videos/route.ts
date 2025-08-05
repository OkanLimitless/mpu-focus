import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

export async function GET() {
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

    const { title, description, muxAssetId, order, chapterName } = await request.json()

    if (!title || !chapterName) {
      return NextResponse.json(
        { error: 'Title and Chapter Name are required' },
        { status: 400 }
      )
    }

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Validate that chapterName is a valid string
    if (typeof chapterName !== 'string' || chapterName.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid Chapter Name format' },
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
        muxPlaybackId = muxAsset.playbackId || ''
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

    // Find or create default course
    let course = await Course.findOne({})
    if (!course) {
      course = new Course({
        title: 'Default Course',
        description: 'Default course for videos'
      })
      await course.save()
    }

    // Find or create chapter by name
    let chapter = await Chapter.findOne({ title: chapterName.trim() })
    if (!chapter) {
      // Get the next order number for this course
      const lastChapter = await Chapter.findOne({ courseId: course._id }).sort({ order: -1 })
      const nextOrder = lastChapter ? lastChapter.order + 1 : 1
      
      chapter = new Chapter({
        courseId: course._id,
        title: chapterName.trim(),
        description: `Chapter: ${chapterName.trim()}`,
        order: nextOrder
      })
      await chapter.save()
    }

    // Create new video
    const video = new Video({
      title,
      description: description.trim(),
      muxAssetId: muxAssetId || undefined,
      muxPlaybackId: muxPlaybackId || undefined,
      duration,
      order: order || 1,
      chapterId: chapter._id, // Use the found/created chapter's ID
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