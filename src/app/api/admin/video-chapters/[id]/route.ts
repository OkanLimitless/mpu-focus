import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { deleteVideoChapter, updateVideoChapter } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const chapter = await updateVideoChapter(params.id, {
      categoryId: body.categoryId === undefined ? undefined : String(body.categoryId),
      title: body.title === undefined ? undefined : String(body.title),
      description: body.description === undefined ? undefined : body.description == null ? null : String(body.description),
      orderIndex: body.orderIndex === undefined ? undefined : Number(body.orderIndex),
      isActive: body.isActive === undefined ? undefined : !!body.isActive,
    })

    return NextResponse.json({ success: true, chapter })
  } catch (error: any) {
    console.error('Error updating video chapter:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to update chapter' }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await assertAdminRequest()
    await deleteVideoChapter(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting video chapter:', error)
    const status = error?.message?.toLowerCase?.().includes('unauthorized')
      ? 401
      : error?.message?.toLowerCase?.().includes('forbidden')
        ? 403
        : 500
    return NextResponse.json({ error: error?.message || 'Failed to delete chapter' }, { status })
  }
}
