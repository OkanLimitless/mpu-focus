import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const signupSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  reason: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per 10 minutes per IP
    const limited = await rateLimit({ request, limit: 10, windowMs: 10 * 60 * 1000, keyPrefix: 'signup' })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { ensureModelsRegistered } = await import('@/lib/models')
    
    await connectDB()
    const { UserRequest, User } = ensureModelsRegistered()
    
    const body = await request.json()
    const parseResult = signupSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.flatten() }, { status: 400 })
    }

    const { firstName, lastName, email, reason } = parseResult.data

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if there's already a pending request for this email
    const existingRequest = await UserRequest.findOne({ 
      email: email.toLowerCase(),
      status: 'pending'
    })
    if (existingRequest) {
      return NextResponse.json(
        { error: 'A pending request for this email already exists' },
        { status: 400 }
      )
    }

    // Create new user request
    const userRequest = new UserRequest({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      reason: reason?.trim() || '',
      status: 'pending'
    })

    await userRequest.save()

    return NextResponse.json(
      { 
        message: 'Request submitted successfully',
        requestId: userRequest._id
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Error creating user request:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A request with this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { default: connectDB } = await import('@/lib/mongodb')
    const { ensureModelsRegistered } = await import('@/lib/models')
    
    await connectDB()
    const { UserRequest, User } = ensureModelsRegistered()
    
    const requests = await UserRequest.find()
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching user requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}