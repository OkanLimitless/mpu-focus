import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    // Disable in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Not available' }, { status: 404 })
    }

    // Require a strong install token
    const installToken = process.env.ADMIN_INSTALL_TOKEN
    const provided = request.headers.get('x-install-token') || ''
    if (!installToken || provided !== installToken) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

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