import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: UserProcessedDocument } = await import('@/models/UserProcessedDocument')

    await connectDB()

    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const userId = params.id
    const docs = await UserProcessedDocument.find({ userId }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ success: true, documents: docs })
  } catch (error) {
    console.error('Error fetching processed documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { default: connectDB } = await import('@/lib/mongodb')
    const { default: User } = await import('@/models/User')
    const { default: UserProcessedDocument } = await import('@/models/UserProcessedDocument')

    await connectDB()

    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const userId = params.id
    const body = await request.json()
    const { fileName, extractedData, totalPages, processingMethod, processingNotes } = body

    if (!fileName || !extractedData) {
      return NextResponse.json({ error: 'fileName and extractedData are required' }, { status: 400 })
    }

    const created = await UserProcessedDocument.create({
      userId,
      fileName,
      extractedData,
      totalPages,
      processingMethod,
      processingNotes,
    })

    return NextResponse.json({ success: true, document: created })
  } catch (error) {
    console.error('Error creating processed document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}