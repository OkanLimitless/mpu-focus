import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mpu-focus.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    
    if (existingAdmin) {
      return NextResponse.json(
        { message: 'Admin user already exists' },
        { status: 400 }
      )
    }

    // Create admin user
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    })

    await adminUser.save()

    return NextResponse.json(
      { 
        message: 'Admin user created successfully',
        email: adminEmail 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { message: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}