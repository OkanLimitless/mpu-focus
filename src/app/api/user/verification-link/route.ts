import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import crypto from 'crypto'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    const user = await User.findOne({ email: session.user.email })
      .select('verificationStatus verificationToken')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Ensure a verification token exists
    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(32).toString('hex')
      await user.save()
    }

    const baseUrl = process.env.NEXTAUTH_URL || ''
    const verificationUrl = `${baseUrl}/verification/${user.verificationToken}`

    return NextResponse.json({
      success: true,
      token: user.verificationToken,
      verificationUrl
    })

  } catch (error) {
    console.error('Error getting verification link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}