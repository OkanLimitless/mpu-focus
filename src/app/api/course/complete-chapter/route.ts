import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

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
    const { default: User } = await import('@/models/User')
    const { default: UserCourseProgress } = await import('@/models/UserCourseProgress')
    const { default: Chapter } = await import('@/models/Chapter')
    
    await connectDB()

    // Get user
    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { chapterOrder, courseId } = await request.json()

    if (!chapterOrder || !courseId) {
      return NextResponse.json(
        { error: 'Chapter order and course ID are required' },
        { status: 400 }
      )
    }

    // Get user's progress
    const userProgress = await UserCourseProgress.findOne({
      userId: user._id,
      courseId
    })

    if (!userProgress) {
      return NextResponse.json(
        { error: 'User progress not found' },
        { status: 404 }
      )
    }

    // Verify user can complete this chapter (must be current or earlier)
    if (chapterOrder > userProgress.currentChapterOrder) {
      return NextResponse.json(
        { error: 'Cannot complete a chapter that is not yet unlocked' },
        { status: 400 }
      )
    }

    // Mark chapter as completed if not already
    if (!userProgress.completedChapters.includes(chapterOrder)) {
      userProgress.completedChapters.push(chapterOrder)
    }

    // Advance to next chapter if completing current chapter
    if (chapterOrder === userProgress.currentChapterOrder) {
      const maxChapter = await Chapter.countDocuments({ isActive: true })
      if (userProgress.currentChapterOrder < maxChapter) {
        userProgress.currentChapterOrder += 1
      }
    }

    userProgress.lastAccessedAt = new Date()
    await userProgress.save()

    return NextResponse.json({
      message: 'Chapter completed successfully',
      currentChapterOrder: userProgress.currentChapterOrder,
      completedChapters: userProgress.completedChapters
    })

  } catch (error: any) {
    console.error('Error completing chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}