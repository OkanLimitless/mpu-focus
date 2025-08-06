import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

interface DocumentError {
  userId: string
  email: string
  filename?: string
  testedUrls?: string[]
  error?: string
}

interface VerificationResults {
  total: number
  verified: number
  missing: number
  fixed: number
  errors: DocumentError[]
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Find all users with passport documents
    const usersWithDocuments = await User.find({
      'passportDocument.filename': { $exists: true, $ne: null }
    }).select('_id email passportDocument')

    const results: VerificationResults = {
      total: usersWithDocuments.length,
      verified: 0,
      missing: 0,
      fixed: 0,
      errors: []
    }

    for (const user of usersWithDocuments) {
      try {
        if (!user.passportDocument?.filename) continue

        // Try the current URL first
        let documentUrl = user.passportDocument.url
        let isValid = false

        if (documentUrl) {
          // Test existing URL
          try {
            const response = await fetch(documentUrl, { method: 'HEAD' })
            if (response.ok) {
              isValid = true
              results.verified++
            }
          } catch (error) {
            // URL is invalid, try to construct new one
          }
        }

        if (!isValid) {
          // Try constructed URL from filename
          const constructedUrl = `https://utfs.io/f/${user.passportDocument.filename}`
          
          try {
            const response = await fetch(constructedUrl, { method: 'HEAD' })
            if (response.ok) {
              // Update the user with the correct URL
              await User.findByIdAndUpdate(user._id, {
                'passportDocument.url': constructedUrl
              })
              
              results.fixed++
              isValid = true
            }
          } catch (error) {
            // File doesn't exist at constructed URL either
          }
        }

        if (!isValid) {
          results.missing++
          const errorInfo: DocumentError = {
            userId: user._id.toString(),
            email: user.email,
            filename: user.passportDocument.filename,
            testedUrls: [
              user.passportDocument.url,
              `https://utfs.io/f/${user.passportDocument.filename}`
            ].filter(Boolean)
          }
          results.errors.push(errorInfo)
        }

      } catch (error: any) {
        const errorInfo: DocumentError = {
          userId: user._id.toString(),
          email: user.email,
          error: error.message
        }
        results.errors.push(errorInfo)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document verification completed',
      results
    })

  } catch (error: any) {
    console.error('Error verifying documents:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check specific document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const user = await User.findById(userId).select('passportDocument')
    
    if (!user || !user.passportDocument?.filename) {
      return NextResponse.json(
        { error: 'User or document not found' },
        { status: 404 }
      )
    }

    const document = user.passportDocument
    const testUrls = []

    // Test current URL if exists
    if (document.url) {
      try {
        const response = await fetch(document.url, { method: 'HEAD' })
        testUrls.push({
          url: document.url,
          status: response.status,
          exists: response.ok
        })
      } catch (error: any) {
        testUrls.push({
          url: document.url,
          status: 'error',
          exists: false,
          error: error.message
        })
      }
    }

    // Test constructed URL
    const constructedUrl = `https://utfs.io/f/${document.filename}`
    try {
      const response = await fetch(constructedUrl, { method: 'HEAD' })
      testUrls.push({
        url: constructedUrl,
        status: response.status,
        exists: response.ok
      })
    } catch (error: any) {
      testUrls.push({
        url: constructedUrl,
        status: 'error',
        exists: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      document: {
        filename: document.filename,
        currentUrl: document.url,
        uploadedAt: document.uploadedAt
      },
      testResults: testUrls
    })

  } catch (error: any) {
    console.error('Error checking document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}