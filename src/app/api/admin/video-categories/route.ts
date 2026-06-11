import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { createVideoCategory, listVideoCategoriesAdmin, listVideoChaptersAdmin } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await assertAdminRequest()
    const [categories, chapters] = await Promise.all([
      listVideoCategoriesAdmin(),
      listVideoChaptersAdmin(),
    ])

    return NextResponse.json({
      categories: categories.map((category) => ({
        ...category,
        chapters: chapters.filter((chapter) => chapter.categoryId === category.id),
      })),
    })
  } catch (error: any) {
    console.error('Error loading video categories:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to load categories' }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const existing = await listVideoCategoriesAdmin()
    const category = await createVideoCategory({
      name: typeof body.name === 'string' ? body.name : '',
      description: body.description == null ? null : String(body.description),
      orderIndex: Number.isFinite(Number(body.orderIndex)) ? Number(body.orderIndex) : existing.length + 1,
    })

    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating video category:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to create category' }, { status })
  }
}
