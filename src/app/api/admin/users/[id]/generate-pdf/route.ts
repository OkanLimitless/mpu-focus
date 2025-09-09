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

    // Get user with document processing data
    const user = await User.findById(params.id).select('documentProcessing firstName lastName')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.documentProcessing?.extractedData) {
      return NextResponse.json(
        { error: 'No extracted data found for this user' },
        { status: 400 }
      )
    }

    // Delegate to the shared document-processor PDF generator
    const baseOrigin = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin)

    const dpResp = await fetch(`${baseOrigin}/api/document-processor/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractedData: user.documentProcessing.extractedData,
        fileName: user.documentProcessing.fileName || 'MPU_Document'
      })
    })

    if (!dpResp.ok) {
      const err = await dpResp.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to generate PDF', details: err || `Status ${dpResp.status}` },
        { status: 500 }
      )
    }

    const payload = await dpResp.json()
    return NextResponse.json({
      ...payload,
      userName: `${user.firstName} ${user.lastName}`
    })

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
