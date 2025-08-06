import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
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
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    // Check if user has uploaded a document
    if (!user.passportDocument || !user.passportDocument.filename) {
      return NextResponse.json(
        { error: 'No document found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document: {
        filename: user.passportDocument.filename,
        url: user.passportDocument.url,
        uploadedAt: user.passportDocument.uploadedAt,
        status: user.passportDocument.status
      }
    })

  } catch (error) {
    console.error('Error retrieving document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}