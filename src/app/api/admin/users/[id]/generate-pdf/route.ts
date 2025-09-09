import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generatePdfFromExtractedData, convertHtmlToPdf } from '@/lib/pdf-generator'


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

    // If we already have a cached PDF URL, return it immediately
    if (user.documentProcessing?.pdfUrl) {
      return NextResponse.json({
        success: true,
        htmlContent: undefined,
        pdfUrl: user.documentProcessing.pdfUrl,
        fileName: user.documentProcessing.fileName || 'MPU_Document',
        userName: `${user.firstName} ${user.lastName}`,
        generatedAt: new Date().toISOString()
      })
    }

    let html = user.documentProcessing.htmlContent
    let pdfUrl = user.documentProcessing.pdfUrl

    // If HTML not cached yet, generate once with GPT
    if (!html) {
      const gen = await generatePdfFromExtractedData({
        extractedData: user.documentProcessing.extractedData,
        fileName: user.documentProcessing.fileName || 'MPU_Document',
        userName: `${user.firstName} ${user.lastName}`
      })
      html = gen.htmlContent
      pdfUrl = gen.pdfUrl || pdfUrl
    } else if (!pdfUrl) {
      // If we have HTML but no PDF yet, convert HTML to PDF via CloudConvert
      const conv = await convertHtmlToPdf({ htmlContent: html, fileName: user.documentProcessing.fileName || 'MPU_Document', userName: `${user.firstName} ${user.lastName}` })
      if (conv.success && conv.pdfUrl) {
        pdfUrl = conv.pdfUrl
      }
    }

    // Persist html and pdfUrl for future reuse (avoid regenerating)
    user.documentProcessing.htmlContent = html || user.documentProcessing.htmlContent
    user.documentProcessing.pdfUrl = pdfUrl || user.documentProcessing.pdfUrl
    await user.save()

    return NextResponse.json({
      success: true,
      htmlContent: html,
      pdfUrl,
      fileName: user.documentProcessing.fileName || 'MPU_Document',
      userName: `${user.firstName} ${user.lastName}`,
      generatedAt: new Date().toISOString()
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
