import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: User } = await import('@/models/User')
    const { default: Video } = await import('@/models/Video')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { 
      videoId, 
      chapterId, 
      courseId, 
      currentTime, 
      watchedDuration, 
      totalDuration 
    } = await request.json()

    // Validate required fields
    if (!videoId || !chapterId || currentTime === undefined || watchedDuration === undefined || totalDuration === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify video exists
    const video = await Video.findById(videoId)
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Update or create progress record
    const progressData = {
      userId: user._id,
      videoId,
      chapterId,
      courseId: courseId || video.courseId,
      currentTime: Math.max(0, currentTime),
      watchedDuration: Math.max(0, watchedDuration),
      totalDuration: Math.max(0, totalDuration),
      lastWatchedAt: new Date(),
    }

    const progress = await VideoProgress.findOneAndUpdate(
      { userId: user._id, videoId },
      progressData,
      { upsert: true, new: true, runValidators: true }
    )

    return NextResponse.json({
      message: 'Progress saved successfully',
      progress: {
        ...progress.toObject(),
        completionPercentage: progress.completionPercentage
      }
    })

  } catch (error: any) {
    console.error('Error saving video progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: User } = await import('@/models/User')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const courseId = searchParams.get('courseId')
    const chapterId = searchParams.get('chapterId')

    let query: any = { userId: user._id }

    if (videoId) {
      query.videoId = videoId
    }
    if (courseId) {
      query.courseId = courseId
    }
    if (chapterId) {
      query.chapterId = chapterId
    }

    const progressRecords = await VideoProgress.find(query)
      .populate('videoId', 'title description muxPlaybackId duration')
      .sort({ lastWatchedAt: -1 })

    return NextResponse.json({
      progress: progressRecords.map(record => ({
        ...record.toObject(),
        completionPercentage: record.completionPercentage
      }))
    })

  } catch (error: any) {
    console.error('Error fetching video progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}