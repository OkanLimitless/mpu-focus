import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { token, agreed, signatureData, signatureMethod = 'digital_signature' } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!agreed) {
      return NextResponse.json(
        { error: 'You must agree to the terms and conditions' },
        { status: 400 }
      )
    }

    // Only allow digital signature method
    if (signatureMethod !== 'digital_signature') {
      return NextResponse.json(
        { error: 'Only digital signature method is allowed' },
        { status: 400 }
      )
    }
    // For digital signatures, signature data is required
    if (!signatureData) {
      return NextResponse.json(
        { error: 'Digital signature is required' },
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

    if (user.verificationStatus !== 'documents_uploaded') {
      return NextResponse.json(
        { error: 'Please upload your documents first' },
        { status: 400 }
      )
    }

    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Update user with contract signing information
    user.contractSigned = {
      signedAt: new Date(),
      ipAddress: clientIP,
      userAgent: userAgent,
      signatureData: signatureData || null,
      signatureMethod: signatureMethod
    }
    user.verificationStatus = 'contract_signed'

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Contract signed successfully. All steps completed — ready for admin review.',
    })

  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}