import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Lead from '@/models/Lead'
import User from '@/models/User'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const lead = await Lead.findById(params.id)
      .populate('contactedBy', 'firstName lastName email')
      .populate('convertedToUserId', 'firstName lastName email')

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ lead })

  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status, notes, contactedBy } = body

    const lead = await Lead.findById(params.id)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Update fields
    if (status) {
      lead.status = status
      
      // Set contacted timestamp if status is 'contacted'
      if (status === 'contacted' && lead.status !== 'contacted') {
        lead.contactedAt = new Date()
        if (contactedBy) {
          lead.contactedBy = contactedBy
        }
      }
    }

    if (notes !== undefined) {
      lead.notes = notes
    }

    await lead.save()

    // Populate references before returning
    await lead.populate([
      { path: 'contactedBy', select: 'firstName lastName email' },
      { path: 'convertedToUserId', select: 'firstName lastName email' }
    ])

    return NextResponse.json({
      success: true,
      lead
    })

  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, password } = body

    if (action !== 'convert-to-user') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const lead = await Lead.findById(params.id)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    if (lead.status === 'converted') {
      return NextResponse.json(
        { error: 'Lead already converted' },
        { status: 400 }
      )
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: lead.email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create user account
    const newUser = new User({
      email: lead.email,
      password: password, // Will be hashed by the User model pre-save hook
      firstName: lead.firstName,
      lastName: lead.lastName,
      role: 'user',
      isActive: true
    })

    await newUser.save()

    // Update lead status
    lead.status = 'converted'
    lead.convertedToUserId = newUser._id
    lead.convertedAt = new Date()
    await lead.save()

    // Populate references before returning
    await lead.populate([
      { path: 'contactedBy', select: 'firstName lastName email' },
      { path: 'convertedToUserId', select: 'firstName lastName email' }
    ])

    return NextResponse.json({
      success: true,
      message: 'Lead converted to user successfully',
      lead,
      user: {
        _id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    })

  } catch (error) {
    console.error('Error converting lead to user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}