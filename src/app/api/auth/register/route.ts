import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { email, password, firstName, lastName } = await request.json()
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 400 }
      )
    }
    
    // Create new user with pending status
    const newUser = new User({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'user',
      isActive: false, // Pending admin approval
    })
    
    await newUser.save()
    
    console.log('✅ New user registered:', {
      email: newUser.email,
      name: `${newUser.firstName} ${newUser.lastName}`,
      status: 'pending approval'
    })
    
    return NextResponse.json(
      { 
        message: 'Registration successful. Your account is pending admin approval.',
        email: newUser.email
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('💥 Registration error:', error)
    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}