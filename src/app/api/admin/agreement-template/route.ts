import { NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { getAgreementTemplate, saveAgreementTemplate } from '@/lib/agreement-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

export async function GET() {
  try {
    await assertAdminRequest()
    const template = await getAgreementTemplate()
    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error fetching agreement template:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch template' }, { status: getHttpStatus(error) })
  }
}

export async function PUT(request: Request) {
  try {
    await assertAdminRequest()
    const body = await request.json()
    const template = await saveAgreementTemplate({
      title: String(body.title || ''),
      text: String(body.text || ''),
    })
    return NextResponse.json({ success: true, template })
  } catch (error: any) {
    console.error('Error saving agreement template:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save template' }, { status: getHttpStatus(error) })
  }
}
