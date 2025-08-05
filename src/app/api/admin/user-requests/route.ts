import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: UserRequest } = await import('@/models/UserRequest')
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

    const { requestId, status, notes, password } = await request.json()

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      )
    }

    const userRequest = await UserRequest.findById(requestId)
    if (!userRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    if (userRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    // Update the request
    userRequest.status = status
    userRequest.reviewedBy = adminUser._id
    userRequest.reviewedAt = new Date()
    userRequest.notes = notes || ''

    await userRequest.save()

    // If approved, create the user account
    if (status === 'approved') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required for approved requests' },
          { status: 400 }
        )
      }

      // Check if user already exists (shouldn't happen but just in case)
      const existingUser = await User.findOne({ email: userRequest.email })
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 400 }
        )
      }

      // Create new user
      const newUser = new User({
        email: userRequest.email,
        firstName: userRequest.firstName,
        lastName: userRequest.lastName,
        password: password,
        role: 'user',
        isActive: true
      })

      await newUser.save()
    }

    return NextResponse.json({
      message: `Request ${status} successfully`,
      request: userRequest
    })

  } catch (error: any) {
    console.error('Error updating user request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}