import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking authentication setup...')
    
    // Check environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mpu-focus.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    const mongoUri = process.env.MONGODB_URI
    
    console.log('📋 Environment variables:')
    console.log('- ADMIN_EMAIL:', adminEmail)
    console.log('- ADMIN_PASSWORD exists:', !!adminPassword)
    console.log('- NEXTAUTH_SECRET exists:', !!nextAuthSecret)
    console.log('- MONGODB_URI exists:', !!mongoUri)
    
    // Test database connection
    console.log('🔌 Testing database connection...')
    await connectDB()
    console.log('✅ Database connected successfully')
    
    // Check if admin user exists
    console.log('👤 Looking for admin user...')
    const adminUser = await User.findOne({ email: adminEmail }).select('+password')
    
    if (!adminUser) {
      console.log('❌ Admin user not found, attempting to create...')
      
      // Create admin user
      const newAdmin = new User({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
      })
      
      await newAdmin.save()
      console.log('✅ Admin user created successfully')
      
      return NextResponse.json({
        status: 'success',
        message: 'Admin user created',
        data: {
          adminExists: false,
          adminCreated: true,
          email: adminEmail,
          envVarsOk: !!nextAuthSecret && !!mongoUri,
          dbConnected: true
        }
      })
    }
    
    console.log('✅ Admin user found')
    console.log('📋 Admin details:', {
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      hasPassword: !!adminUser.password
    })
    
    // Test password comparison
    console.log('🔐 Testing password comparison...')
    const passwordMatch = await adminUser.comparePassword(adminPassword)
    console.log('🔑 Password matches:', passwordMatch)
    
    // Also test bcrypt directly
    console.log('🧪 Testing bcrypt directly...')
    const directBcryptTest = await bcrypt.compare(adminPassword, adminUser.password)
    console.log('🔑 Direct bcrypt test:', directBcryptTest)
    
    return NextResponse.json({
      status: 'success',
      message: 'Authentication debug completed',
      data: {
        adminExists: true,
        adminCreated: false,
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive,
        passwordMatch,
        directBcryptTest,
        envVarsOk: !!nextAuthSecret && !!mongoUri,
        dbConnected: true
      }
    })
    
  } catch (error) {
    console.error('💥 Debug error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Debug failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}