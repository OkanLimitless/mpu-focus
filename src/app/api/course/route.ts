import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

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
    const { default: Course } = await import('@/models/Course')
    const { default: VideoProgress } = await import('@/models/VideoProgress')
    const { default: ChapterProgress } = await import('@/models/ChapterProgress')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get the course (for now, get the first/default course)
    const course = await Course.findOne({ isActive: true })
    if (!course) {
      return NextResponse.json({
        course: null,
        chapters: [],
        message: 'No course available'
      })
    }

    // Get all chapters for this course
    const chapters = await Chapter.find({ 
      courseId: course._id, 
      isActive: true 
    }).sort({ order: 1 }).lean()

    // Get all videos for these chapters
    const videos = await Video.find({ 
      chapterId: { $in: chapters.map((c: any) => c._id) }, 
      isActive: true 
    }).sort({ order: 1 }).lean()

    // Get user's video progress
    const progressRecords = await VideoProgress.find({ 
      userId: user._id,
      videoId: { $in: videos.map((v: any) => v._id) }
    }).lean()

    // Create progress lookup
    const progressLookup = progressRecords.reduce((acc, progress) => {
      acc[(progress.videoId as any).toString()] = progress
      return acc
    }, {} as any)

    // Get or create chapter progress records
    const chapterProgressRecords = await ChapterProgress.find({
      userId: user._id,
      courseId: course._id
    }).lean()

    // Create chapter progress lookup
    const chapterProgressLookup = chapterProgressRecords.reduce((acc, progress) => {
      acc[(progress.chapterId as any).toString()] = progress
      return acc
    }, {} as any)

    // Calculate and update chapter progress for each chapter
    for (const chapter of chapters) {
      const chapterVideos = videos.filter(video => 
        video.chapterId.toString() === (chapter._id as any).toString()
      )
      const completedVideos = chapterVideos.filter(video => 
        progressLookup[(video._id as any).toString()]?.isCompleted
      ).length

      // Update or create chapter progress
      await ChapterProgress.findOneAndUpdate(
        { userId: user._id, chapterId: chapter._id },
        {
          userId: user._id,
          chapterId: chapter._id,
          courseId: course._id,
          totalVideos: chapterVideos.length,
          completedVideos: completedVideos
        },
        { upsert: true, new: true }
      )
    }

    // Refresh chapter progress after updates
    const updatedChapterProgress = await ChapterProgress.find({
      userId: user._id,
      courseId: course._id
    }).lean()

    const updatedChapterProgressLookup = updatedChapterProgress.reduce((acc, progress) => {
      acc[(progress.chapterId as any).toString()] = progress
      return acc
    }, {} as any)

    // Determine unlock status for each chapter
    const getChapterUnlockStatus = (chapterOrder: number) => {
      if (chapterOrder === 1) return true // First chapter is always unlocked
      
      // Check if previous chapter is completed
      const previousChapter = chapters.find((c: any) => c.order === chapterOrder - 1)
      if (!previousChapter) return false
      
      const previousProgress = updatedChapterProgressLookup[(previousChapter._id as any).toString()]
      return previousProgress?.isCompleted || false
    }

    // Structure the course data
    const courseData = {
      course: {
        _id: course._id,
        title: course.title,
        description: course.description
      },
      chapters: chapters.map((chapter: any) => {
        const chapterProgress = updatedChapterProgressLookup[(chapter._id as any).toString()]
        const isUnlocked = getChapterUnlockStatus(chapter.order)
        
        return {
          _id: chapter._id,
          title: chapter.title,
          description: chapter.description,
          order: chapter.order,
          isUnlocked,
          isCompleted: chapterProgress?.isCompleted || false,
          progressPercentage: chapterProgress?.progressPercentage || 0,
          totalVideos: chapterProgress?.totalVideos || 0,
          completedVideos: chapterProgress?.completedVideos || 0,
          videos: videos
            .filter(video => video.chapterId.toString() === (chapter._id as any).toString())
            .map(video => ({
              _id: video._id,
              title: video.title,
              description: video.description,
              duration: video.duration,
              order: video.order,
              muxPlaybackId: video.muxPlaybackId,
              status: video.status,
              isAccessible: isUnlocked, // Videos are only accessible if chapter is unlocked
              progress: progressLookup[(video._id as any).toString()] || null
            }))
        }
      })
    }

    return NextResponse.json(courseData)

  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}