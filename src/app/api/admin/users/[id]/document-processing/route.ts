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

    const { extractedData, fileName, totalPages, processingMethod, processingNotes } = await request.json()

    if (!extractedData || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: extractedData and fileName' },
        { status: 400 }
      )
    }

    // Update user with document processing results
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        documentProcessing: {
          extractedData,
          fileName,
          totalPages: totalPages || 0,
          processedAt: new Date(),
          processingMethod: processingMethod || 'Manual Upload',
          processingNotes: processingNotes || ''
        }
      },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document processing results saved successfully',
      documentProcessing: updatedUser.documentProcessing
    })

  } catch (error) {
    console.error('Error saving document processing results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
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

    // Get user with document processing data
    const user = await User.findById(params.id)
      .select('documentProcessing adminNotes firstName lastName email')
      .populate('adminNotes.createdBy', 'firstName lastName email')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        documentProcessing: user.documentProcessing,
        adminNotes: user.adminNotes
      }
    })

  } catch (error) {
    console.error('Error fetching document processing data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}