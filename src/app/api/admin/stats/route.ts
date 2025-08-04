import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    // Get user statistics
    const [totalUsers, activeUsers, pendingUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false })
    ])
    
    // Placeholder for future features
    const stats = {
      totalUsers,
      activeUsers,
      pendingUsers,
      totalCourses: 0,
      totalDocuments: 0,
      pendingDocuments: 0
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { message: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}