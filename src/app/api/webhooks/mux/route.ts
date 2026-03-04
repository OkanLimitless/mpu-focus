import { NextResponse } from 'next/server'
import { verifyMuxWebhook } from '@/lib/mux'
import { updateVideoByMuxAssetId } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('mux-signature') || ''

  // In production, this should always validate if MUX_WEBHOOK_SECRET is configured.
  const isValid = verifyMuxWebhook(rawBody, signature)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  try {
    const event = JSON.parse(rawBody)
    const eventType = String(event?.type || '')
    const asset = event?.data || {}
    const assetId = typeof asset?.id === 'string' ? asset.id : ''

    if (!assetId || !eventType.startsWith('video.asset.')) {
      return NextResponse.json({ ok: true })
    }

    const playbackId = Array.isArray(asset.playback_ids) ? asset.playback_ids[0]?.id || null : null
    const durationSeconds = typeof asset.duration === 'number' ? Math.round(asset.duration) : undefined
    const status = typeof asset.status === 'string' ? asset.status : null

    await updateVideoByMuxAssetId(assetId, {
      muxPlaybackId: playbackId,
      muxStatus: status,
      durationSeconds,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Mux webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
