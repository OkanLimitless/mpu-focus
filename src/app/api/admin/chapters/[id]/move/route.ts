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

    // Validate chapter ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid chapter ID' },
        { status: 400 }
      )
    }

    const { direction } = await request.json()

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json(
        { error: 'Direction must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Find the chapter to move
    const chapter = await Chapter.findById(params.id)
    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    const currentOrder = chapter.order
    let targetOrder: number

    if (direction === 'up') {
      targetOrder = currentOrder - 1
      if (targetOrder < 1) {
        return NextResponse.json(
          { error: 'Chapter is already at the top' },
          { status: 400 }
        )
      }
    } else {
      targetOrder = currentOrder + 1
      const maxOrder = await Chapter.countDocuments({ courseId: chapter.courseId })
      if (targetOrder > maxOrder) {
        return NextResponse.json(
          { error: 'Chapter is already at the bottom' },
          { status: 400 }
        )
      }
    }

    // Find the chapter at the target position
    const targetChapter = await Chapter.findOne({ 
      courseId: chapter.courseId, 
      order: targetOrder 
    })

    if (!targetChapter) {
      return NextResponse.json(
        { error: 'No chapter found at target position' },
        { status: 400 }
      )
    }

    // Swap the orders
    await Chapter.findByIdAndUpdate(chapter._id, { order: targetOrder })
    await Chapter.findByIdAndUpdate(targetChapter._id, { order: currentOrder })

    return NextResponse.json({
      message: 'Chapter order updated successfully'
    })

  } catch (error: any) {
    console.error('Error moving chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}