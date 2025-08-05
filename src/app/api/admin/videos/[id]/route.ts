import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Validate video ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      )
    }

    // Find the video to update
    const existingVideo = await Video.findById(params.id)
    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // If Mux Asset ID is provided, fetch details from Mux
    let muxPlaybackId = existingVideo.muxPlaybackId
    let duration = existingVideo.duration
    let status = 'unknown'

    if (muxAssetId && muxAssetId !== existingVideo.muxAssetId) {
      try {
        const muxAsset = await getMuxAsset(muxAssetId)
        muxPlaybackId = muxAsset.playbackId || ''
        duration = muxAsset.duration || 0
        status = muxAsset.status || 'unknown'
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

    // Update video
    const updatedVideo = await Video.findByIdAndUpdate(
      params.id,
      {
        title,
        description: description.trim(),
        muxAssetId: muxAssetId || undefined,
        muxPlaybackId: muxPlaybackId || undefined,
        duration,
        order: order || 1,
        chapterId: chapter._id
      },
      { new: true }
    )

    return NextResponse.json({
      message: 'Video updated successfully',
      video: {
        ...updatedVideo.toObject(),
        status
      }
    })

  } catch (error: any) {
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Find and delete the video
    const deletedVideo = await Video.findByIdAndDelete(params.id)
    if (!deletedVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Video deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}