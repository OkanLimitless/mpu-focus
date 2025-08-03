import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const { userId, approve } = await request.json()
    
    if (!userId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { message: 'User ID and approval status are required' },
        { status: 400 }
      )
    }
    
    if (approve) {
      // Approve user - set isActive to true
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true },
        { new: true }
      )
      
      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        )
      }
      
      console.log('✅ User approved:', {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      })
      
      return NextResponse.json({
        message: 'User approved successfully',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        }
      })
    } else {
      // Reject user - delete the user record
      const user = await User.findByIdAndDelete(userId)
      
      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        )
      }
      
      console.log('❌ User rejected and deleted:', {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      })
      
      return NextResponse.json({
        message: 'User rejected and removed from system'
      })
    }
    
  } catch (error) {
    console.error('Error updating user approval status:', error)
    return NextResponse.json(
      { message: 'Failed to update user status' },
      { status: 500 }
    )
  }
}