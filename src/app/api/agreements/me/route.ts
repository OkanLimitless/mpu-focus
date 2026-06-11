import { NextResponse } from 'next/server'
import { requireActiveProfile } from '@/lib/auth-helpers'
import { getAgreementForProfile, getAgreementTemplate, submitAgreement } from '@/lib/agreement-library'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const access = await requireActiveProfile()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const [agreement, template] = await Promise.all([
      getAgreementForProfile(access.profile.id),
      getAgreementTemplate(),
    ])

    return NextResponse.json({
      agreement: agreement
        ? {
            status: agreement.status,
            contractVersion: agreement.contractVersion,
            fullName: agreement.fullName,
            signedAt: agreement.signedAt,
            rejectionReason: agreement.rejectionReason,
            idDocumentName: agreement.idDocumentName,
          }
        : null,
      template: { title: template.title, text: template.text, version: template.version },
      isAdmin: access.profile.role === 'admin',
    })
  } catch (error: any) {
    console.error('Error fetching agreement:', error)
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireActiveProfile()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const existing = await getAgreementForProfile(access.profile.id)
    if (existing && (existing.status === 'submitted' || existing.status === 'approved')) {
      return NextResponse.json({ error: 'Die Vereinbarung wurde bereits unterzeichnet.' }, { status: 409 })
    }

    const body = await request.json()
    const forwardedFor = request.headers.get('x-forwarded-for')
    const signedIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null

    const agreement = await submitAgreement({
      profileId: access.profile.id,
      fullName: String(body.fullName || ''),
      birthDate: typeof body.birthDate === 'string' && body.birthDate ? body.birthDate : null,
      address: typeof body.address === 'string' ? body.address : null,
      signatureData: String(body.signatureData || ''),
      idDocumentUrl: String(body.idDocumentUrl || ''),
      idDocumentName: typeof body.idDocumentName === 'string' ? body.idDocumentName.slice(0, 300) : null,
      signedIp,
      signedUserAgent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
    })

    return NextResponse.json({
      success: true,
      agreement: { status: agreement.status, signedAt: agreement.signedAt },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error submitting agreement:', error)
    return NextResponse.json({ error: error?.message || 'Failed to submit agreement' }, { status: 500 })
  }
}
