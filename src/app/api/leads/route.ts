import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Lead from '@/models/Lead'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    
    // Validate required fields
    const {
      firstName,
      lastName,
      email,
      phone,
      timeframe,
      reason,
      jobLoss,
      mpuChallenges,
      concerns,
      availability
    } = body

    if (!firstName || !lastName || !email || !phone || !timeframe || !reason || 
        jobLoss === undefined || !mpuChallenges || !concerns || !availability) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if lead with this email already exists
    const existingLead = await Lead.findOne({ email: email.toLowerCase() })
    if (existingLead) {
      return NextResponse.json(
        { error: 'A lead with this email already exists' },
        { status: 409 }
      )
    }

    // Create new lead
    const newLead = new Lead({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      timeframe,
      reason,
      jobLoss,
      mpuChallenges: Array.isArray(mpuChallenges) ? mpuChallenges : [],
      concerns: Array.isArray(concerns) ? concerns : [],
      availability: Array.isArray(availability) ? availability : [],
      status: 'new'
    })

    await newLead.save()

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      leadId: newLead._id
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''

    // Build query
    const query: any = {}
    
    if (status !== 'all') {
      query.status = status
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    // Get total count
    const total = await Lead.countDocuments(query)

    // Get leads with pagination
    const leads = await Lead.find(query)
      .populate('contactedBy', 'firstName lastName email')
      .populate('convertedToUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    // Get statistics
    const stats = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const statusCounts = {
      new: 0,
      contacted: 0,
      converted: 0,
      closed: 0
    }

    stats.forEach(stat => {
      statusCounts[stat._id as keyof typeof statusCounts] = stat.count
    })

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: statusCounts
    })

  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}