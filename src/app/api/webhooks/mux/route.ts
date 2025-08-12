import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Basic burst limit to avoid abuse: 60 requests per minute per IP
    const limited = await rateLimit({ request, limit: 60, windowMs: 60 * 1000, keyPrefix: 'mux-webhook' })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { default: connectDB } = await import('@/lib/mongodb')
    const { ensureModelsRegistered } = await import('@/lib/models')
    const { verifyMuxWebhook } = await import('@/lib/mux')
    
    await connectDB()
    const { Video } = ensureModelsRegistered()

    // Get the raw body and signature
    const body = await request.text()
    const signature = request.headers.get('mux-signature') || ''

    // Verify the webhook signature (optional but recommended)
    if (!verifyMuxWebhook(body, signature)) {
      console.error('Invalid Mux webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    const event = JSON.parse(body)
    
    console.log('Mux webhook received:', event.type, event.data?.id)

    // Handle different event types
    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event.data, Video)
        break
      
      case 'video.asset.errored':
        await handleAssetErrored(event.data, Video)
        break
      
      case 'video.asset.deleted':
        await handleAssetDeleted(event.data, Video)
        break
      
      default:
        console.log('Unhandled Mux event type:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing Mux webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle when a video asset is ready
async function handleAssetReady(assetData: any, Video: any) {
  try {
    const assetId = assetData.id
    const playbackIds = assetData.playback_ids || []
    const duration = assetData.duration || 0
    const status = assetData.status

    // Prefer a signed playback ID if available
    const signedPlayback = playbackIds.find((p: any) => p.policy === 'signed')
    const selectedPlaybackId = (signedPlayback?.id) || playbackIds[0]?.id || ''

    // Find and update the video in our database
    const video = await Video.findOne({ muxAssetId: assetId })
    
    if (video) {
      video.muxPlaybackId = selectedPlaybackId
      video.duration = duration
      video.status = status
      await video.save()
      
      console.log(`Updated video ${video.title} - Asset ${assetId} is ready (playbackId=${selectedPlaybackId})`)
    } else {
      console.log(`No video found for Mux Asset ID: ${assetId}`)
    }
  } catch (error) {
    console.error('Error handling asset ready:', error)
  }
}

// Handle when a video asset has an error
async function handleAssetErrored(assetData: any, Video: any) {
  try {
    const assetId = assetData.id
    const errors = assetData.errors || []
    
    // Find and update the video in our database
    const video = await Video.findOne({ muxAssetId: assetId })
    
    if (video) {
      video.status = 'errored'
      await video.save()
      
      console.error(`Video ${video.title} - Asset ${assetId} errored:`, errors)
    }
  } catch (error) {
    console.error('Error handling asset error:', error)
  }
}

// Handle when a video asset is deleted
async function handleAssetDeleted(assetData: any, Video: any) {
  try {
    const assetId = assetData.id
    
    // Find and update the video in our database
    const video = await Video.findOne({ muxAssetId: assetId })
    
    if (video) {
      video.muxAssetId = undefined
      video.muxPlaybackId = undefined
      video.status = 'deleted'
      await video.save()
      
      console.log(`Video ${video.title} - Asset ${assetId} was deleted`)
    }
  } catch (error) {
    console.error('Error handling asset deletion:', error)
  }
}