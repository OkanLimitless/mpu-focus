import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { rateLimit } from '@/lib/rate-limit'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Rate limit: 20 requests per 5 minutes per IP
    const limited = await rateLimit({ request, limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'verify-doc' })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    await connectDB()

    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const user = await User.findOne({ verificationToken: token })
      .select('passportDocument')
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    if (!user.passportDocument?.filename) {
      return NextResponse.json(
        { error: 'No document found for this user' },
        { status: 404 }
      )
    }

    // Get the document URL - prioritize stored URL, then try v7 pattern, then legacy
    let documentUrl = user.passportDocument.url
    
    // If no stored URL, try to construct one using v7 pattern first
    if (!documentUrl && user.passportDocument.filename) {
      // Try v7 pattern first: https://<APP_ID>.ufs.sh/f/<FILE_KEY>
      // Note: Replace 'app' with your actual app ID from UploadThing dashboard
      const v7Url = `https://app.ufs.sh/f/${user.passportDocument.filename}`
      
      // Test if v7 URL works
      try {
        const testResponse = await fetch(v7Url, { method: 'HEAD' })
        if (testResponse.ok) {
          documentUrl = v7Url
          // Update the database with the working URL
          await User.findByIdAndUpdate(user._id, {
            'passportDocument.url': v7Url
          })
        }
      } catch (error) {
        // v7 URL doesn't work, try legacy
      }
      
      // If v7 doesn't work, try legacy pattern
      if (!documentUrl) {
        const legacyUrl = `https://utfs.io/f/${user.passportDocument.filename}`
        try {
          const testResponse = await fetch(legacyUrl, { method: 'HEAD' })
          if (testResponse.ok) {
            documentUrl = legacyUrl
            // Update the database with the working URL
            await User.findByIdAndUpdate(user._id, {
              'passportDocument.url': legacyUrl
            })
          }
        } catch (error) {
          // Neither URL works - file might be missing
        }
      }
    }

    // Create proxied URL to bypass CORS
    const proxiedUrl = documentUrl
      ? `/api/documents/proxy?url=${encodeURIComponent(documentUrl)}`
      : null

    if (!proxiedUrl) {
      return NextResponse.json(
        { 
          error: 'Document URL not available', 
          details: 'Document may have been uploaded before URL storage was implemented or the file may no longer exist.',
          filename: user.passportDocument.filename
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document: {
        filename: user.passportDocument.filename,
        url: proxiedUrl,
        originalUrl: documentUrl, // Keep original for reference
        uploadedAt: user.passportDocument.uploadedAt,
        status: user.passportDocument.status,
        rejectionReason: user.passportDocument.rejectionReason
      }
    })

  } catch (error: any) {
    console.error('Error retrieving document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}