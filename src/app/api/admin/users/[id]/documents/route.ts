import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: UserDocument } = await import('@/models/UserDocument')

    await connectDB()

    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const userId = params.id
    const documents = await UserDocument.find({ userId }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ success: true, documents })
  } catch (error) {
    console.error('Error fetching user documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}