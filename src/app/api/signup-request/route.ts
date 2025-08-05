import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import UserRequest from '@/models/UserRequest'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { firstName, lastName, email, reason } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

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
    await connectToDatabase()
    
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