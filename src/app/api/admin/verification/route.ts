import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''

    // Build query
    const query: any = { role: 'user' }
    
    if (status !== 'all') {
      query.verificationStatus = status
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Get paginated users
    const skip = (page - 1) * limit
    const users = await User.find(query)
      .select('firstName lastName email verificationStatus passportDocument contractSigned verifiedAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await User.countDocuments(query)
    const pages = Math.ceil(total / limit)

    // Calculate stats
    const stats = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ])

    const statsObj = {
      pending: 0,
      documentsUploaded: 0,
      contractSigned: 0,
      verified: 0,
      rejected: 0
    }

    stats.forEach(stat => {
      if (stat._id === 'pending') statsObj.pending = stat.count
      if (stat._id === 'documents_uploaded') statsObj.documentsUploaded = stat.count
      if (stat._id === 'contract_signed') statsObj.contractSigned = stat.count
      if (stat._id === 'verified') statsObj.verified = stat.count
      if (stat._id === 'rejected') statsObj.rejected = stat.count
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages
      },
      stats: statsObj
    })

  } catch (error) {
    console.error('Error fetching verification users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}