import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { note, isPrivate = false } = await request.json()

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Add note to user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        $push: {
          adminNotes: {
            note: note.trim(),
            createdBy: adminUser._id,
            createdAt: new Date(),
            isPrivate: Boolean(isPrivate)
          }
        }
      },
      { new: true }
    ).populate('adminNotes.createdBy', 'firstName lastName email')

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
      adminNotes: updatedUser.adminNotes
    })

  } catch (error) {
    console.error('Error adding admin note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      )
    }

    // Remove note from user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        $pull: {
          adminNotes: { _id: noteId }
        }
      },
      { new: true }
    ).populate('adminNotes.createdBy', 'firstName lastName email')

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
      adminNotes: updatedUser.adminNotes
    })

  } catch (error) {
    console.error('Error deleting admin note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}