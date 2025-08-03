import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
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
    
    // Get pending users (not active)
    const pendingUsers = await User.find({ 
      isActive: false,
      role: 'user' // Don't include admin users
    }).sort({ createdAt: -1 })
    
    return NextResponse.json({ users: pendingUsers })
    
  } catch (error) {
    console.error('Error fetching pending users:', error)
    return NextResponse.json(
      { message: 'Failed to fetch pending users' },
      { status: 500 }
    )
  }
}