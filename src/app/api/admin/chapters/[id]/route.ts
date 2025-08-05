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

    const { title, description, order } = await request.json()

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    // Update chapter
    const updatedChapter = await Chapter.findByIdAndUpdate(
      params.id,
      {
        title: title.trim(),
        description: description.trim(),
        order: order || 1
      },
      { new: true }
    )

    if (!updatedChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Chapter updated successfully',
      chapter: updatedChapter.toObject()
    })

  } catch (error: any) {
    console.error('Error updating chapter:', error)
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
    const { default: Chapter } = await import('@/models/Chapter')
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

    // Validate chapter ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: 'Invalid chapter ID' },
        { status: 400 }
      )
    }

    // Check if chapter has videos
    const videoCount = await Video.countDocuments({ chapterId: params.id })
    if (videoCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete chapter with ${videoCount} videos. Please reassign or delete the videos first.` },
        { status: 400 }
      )
    }

    // Delete chapter
    const deletedChapter = await Chapter.findByIdAndDelete(params.id)
    if (!deletedChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Chapter deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}