import Mux from '@mux/mux-node'
import crypto from 'crypto'

// Lazy initialize Mux client to avoid throwing at import time
let muxClientSingleton: Mux | null = null

function getMuxClient(): Mux {
  if (!muxClientSingleton) {
    const tokenId = process.env.MUX_TOKEN_ID
    const tokenSecret = process.env.MUX_TOKEN_SECRET

    if (!tokenId || !tokenSecret) {
      throw new Error('Mux credentials are required. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET in your environment variables.')
    }

    muxClientSingleton = new Mux({ tokenId, tokenSecret })
  }

  return muxClientSingleton
}

// Helper functions for common Mux operations
export const createMuxAsset = async (input: string, options?: {
  playbackPolicy?: 'public' | 'signed'
  mp4Support?: 'standard' | 'none' | 'capped-1080p'
}) => {
  try {
    const mux = getMuxClient()
    const asset = await mux.video.assets.create({
      input: [{ url: input }],
      playback_policy: [options?.playbackPolicy || 'public'],
      mp4_support: options?.mp4Support || 'standard',
    })
    
    return {
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      status: asset.status,
      duration: asset.duration
    }
  } catch (error) {
    console.error('Error creating Mux asset:', error)
    throw error
  }
}

export const getMuxAsset = async (assetId: string) => {
  try {
    const mux = getMuxClient()
    const asset = await mux.video.assets.retrieve(assetId)
    return {
      assetId: asset.id,
      playbackId: asset.playback_ids?.[0]?.id,
      playbackIds: asset.playback_ids || [],
      status: asset.status,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      createdAt: asset.created_at
    }
  } catch (error) {
    console.error('Error retrieving Mux asset:', error)
    throw error
  }
}

export const createMuxDirectUpload = async () => {
  try {
    const mux = getMuxClient()
    const corsOrigin = process.env.MUX_UPLOAD_CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
      },
      cors_origin: corsOrigin,
    })
    
    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
    }
  } catch (error) {
    console.error('Error creating Mux direct upload:', error)
    throw error
  }
}

export const deleteMuxAsset = async (assetId: string) => {
  try {
    const mux = getMuxClient()
    await mux.video.assets.delete(assetId)
    return true
  } catch (error) {
    console.error('Error deleting Mux asset:', error)
    throw error
  }
}

// Verify Mux webhook using HMAC SHA256 with timestamp tolerance
export const verifyMuxWebhook = (rawBody: string, signatureHeader: string): boolean => {
  const secret = process.env.MUX_WEBHOOK_SECRET
  if (!secret) {
    console.warn('MUX_WEBHOOK_SECRET not set; rejecting webhook verification in production is recommended')
    // For safety, do not auto-approve; but return false only if running in production
    return process.env.NODE_ENV !== 'production'
  }

  try {
    // Header format: "t=timestamp, v1=signature" (may include multiple v1 values)
    const parts = signatureHeader.split(',').map(p => p.trim())
    const timestampPart = parts.find(p => p.startsWith('t='))
    const signatureParts = parts.filter(p => p.startsWith('v1='))

    if (!timestampPart || signatureParts.length === 0) {
      return false
    }

    const timestamp = parseInt(timestampPart.split('=')[1], 10)
    if (!Number.isFinite(timestamp)) return false

    // Enforce a 5-minute tolerance window
    const toleranceMs = 5 * 60 * 1000
    const now = Date.now()
    if (Math.abs(now - timestamp * 1000) > toleranceMs) {
      return false
    }

    const signedPayload = `${timestamp}.${rawBody}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex')

    // Compare against any provided v1 signature using constant-time compare
    const timingSafeEqual = (a: string, b: string): boolean => {
      const aBuf = Buffer.from(a, 'utf8')
      const bBuf = Buffer.from(b, 'utf8')
      if (aBuf.length !== bBuf.length) return false
      return crypto.timingSafeEqual(aBuf, bBuf)
    }

    return signatureParts.some(sig => {
      const provided = sig.split('=')[1]
      return provided ? timingSafeEqual(provided, expected) : false
    })
  } catch (err) {
    console.error('Error verifying Mux webhook signature:', err)
    return false
  }
}

// Generate short-lived signed playback token for a playbackId (kept for backward compatibility)
export function generateSignedPlaybackToken(playbackId: string, ttlSeconds: number = 120): string {
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID
  const signingKeySecret = process.env.MUX_SIGNING_KEY_SECRET
  if (!signingKeyId || !signingKeySecret) {
    throw new Error('Mux signing key envs are required: MUX_SIGNING_KEY_ID and MUX_SIGNING_KEY_SECRET')
  }

  const header = { alg: 'HS256', typ: 'JWT', kid: signingKeyId }
  const now = Math.floor(Date.now() / 1000)
  const payload: Record<string, any> = {
    aud: 'v',
    sub: playbackId,
    exp: now + ttlSeconds,
    iat: now,
  }

  const base64url = (input: Buffer | string) => Buffer.from(typeof input === 'string' ? input : input.toString('utf8'))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(payload))
  const toSign = `${encHeader}.${encPayload}`

  // Decode base64 secret if provided that way; fallback to raw utf8
  const tryKeys: Buffer[] = []
  tryKeys.push(Buffer.from(signingKeySecret, 'base64'))
  tryKeys.push(Buffer.from(signingKeySecret, 'utf8'))

  for (const key of tryKeys) {
    try {
      const signature = crypto
        .createHmac('sha256', key)
        .update(toSign)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      return `${toSign}.${signature}`
    } catch {}
  }

  throw new Error('Failed to sign playback token')
}

export const createPublicPlaybackId = async (assetId: string): Promise<string> => {
  const mux = getMuxClient()
  const playback = await mux.video.assets.createPlaybackId(assetId, { policy: 'public' })
  return playback.id
}