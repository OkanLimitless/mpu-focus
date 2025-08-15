import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

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

    // Get all chapters with video counts
    const chapters = await Chapter.aggregate([
      { $match: { isActive: true } },
      { $sort: { order: 1, createdAt: -1 } },
      {
        $lookup: {
          from: 'videos',
          localField: '_id',
          foreignField: 'chapterId',
          as: 'videos'
        }
      },
      {
        $addFields: {
          videoCount: { $size: '$videos' }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          order: 1,
          isActive: 1,
          videoCount: 1,
          moduleKey: 1,
          createdAt: 1
        }
      }
    ])

    return NextResponse.json({
      chapters
    })

  } catch (error: any) {
    console.error('Error fetching chapters:', error)
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
    const { default: Chapter } = await import('@/models/Chapter')
    const { default: Course } = await import('@/models/Course')
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { title, description, order, moduleKey } = await request.json()

    if (!title || !description || !moduleKey) {
      return NextResponse.json(
        { error: 'Title, description and moduleKey are required' },
        { status: 400 }
      )
    }

    // Find or create default course
    let course = await Course.findOne({})
    if (!course) {
      course = new Course({
        title: 'Default Course',
        description: 'Default course for chapters'
      })
      await course.save()
    }

    // If order is not specified, get the next available order within module
    let chapterOrder = order
    if (!chapterOrder) {
      const lastChapter = await Chapter.findOne({ courseId: course._id, moduleKey }).sort({ order: -1 })
      chapterOrder = lastChapter ? lastChapter.order + 1 : 1
    }

    // Create new chapter
    const chapter = new Chapter({
      courseId: course._id,
      moduleKey,
      title: title.trim(),
      description: description.trim(),
      order: chapterOrder,
      isActive: true
    })

    await chapter.save()

    return NextResponse.json({
      message: 'Chapter created successfully',
      chapter: chapter.toObject()
    })

  } catch (error: any) {
    console.error('Error creating chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}