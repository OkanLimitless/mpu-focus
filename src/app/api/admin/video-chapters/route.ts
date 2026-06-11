import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { createVideoChapter, listVideoChaptersAdmin } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await assertAdminRequest()
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const chapters = await listVideoChaptersAdmin(categoryId)
    return NextResponse.json({ chapters })
  } catch (error: any) {
    console.error('Error loading video chapters:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to load chapters' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId : ''
    const existing = await listVideoChaptersAdmin(categoryId)
    const chapter = await createVideoChapter({
      categoryId,
      title: typeof body.title === 'string' ? body.title : '',
      description: body.description == null ? null : String(body.description),
      orderIndex: Number.isFinite(Number(body.orderIndex)) ? Number(body.orderIndex) : existing.length + 1,
    })

    return NextResponse.json({ success: true, chapter }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating video chapter:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to create chapter' }, { status })
  }
}
