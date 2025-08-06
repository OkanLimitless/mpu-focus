import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { token, agreed } = body

    if (!token || !agreed) {
      return NextResponse.json(
        { error: 'Token and agreement confirmation are required' },
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

    if (user.verificationStatus === 'verified') {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      )
    }

    if (user.verificationStatus !== 'documents_uploaded') {
      return NextResponse.json(
        { error: 'Please upload your document first' },
        { status: 400 }
      )
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Update user with contract signing information
    user.contractSigned = {
      signedAt: new Date(),
      ipAddress: clientIP,
      userAgent: userAgent
    }
    user.verificationStatus = 'contract_signed'
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Contract signed successfully. Your account is now under review.',
      verificationStatus: user.verificationStatus
    })

  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}