import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import connectDB from '@/lib/mongodb'
import Video from '@/models/Video'
import mongoose from 'mongoose'
import crypto from 'crypto'

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8')
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signWithKey(playbackId: string, key: Buffer, kid: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT', kid }
  const payload: Record<string, any> = { aud: 'v', sub: playbackId, exp: now + ttlSeconds, iat: now }
  const encHeader = base64url(JSON.stringify(header))
  const encPayload = base64url(JSON.stringify(payload))
  const toSign = `${encHeader}.${encPayload}`
  const signature = crypto
    .createHmac('sha256', key)
    .update(toSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${toSign}.${signature}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limit: 60 per minute per IP (tokens are short-lived)
    const limited = await rateLimit({ request: req, limit: 60, windowMs: 60 * 1000, keyPrefix: 'mux-token' })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid video id' }, { status: 400 })
    }

    await connectDB()
    const video = await Video.findById(params.id)
      .select('muxPlaybackId isActive')

    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not available' }, { status: 404 })
    }

    if (!video.muxPlaybackId) {
      return NextResponse.json({ error: 'Playback not ready' }, { status: 409 })
    }

    const kid = process.env.MUX_SIGNING_KEY_ID || ''
    const secret = process.env.MUX_SIGNING_KEY_SECRET || ''
    if (!kid || !secret) {
      return NextResponse.json({ error: 'Mux signing keys not configured' }, { status: 500 })
    }

    const ttl = 120
    const playbackId = video.muxPlaybackId

    // Try base64-decoded secret first
    const keyB64 = Buffer.from(secret, 'base64')
    const tokenB64 = signWithKey(playbackId, keyB64, kid, ttl)
    let headOkB64 = false
    try {
      const head = await fetch(`https://stream.mux.com/${playbackId}.m3u8?token=${encodeURIComponent(tokenB64)}`, { method: 'HEAD' })
      headOkB64 = head.ok
    } catch {}

    // Fallback with raw utf8 if needed
    let token = tokenB64
    let headOkRaw = false
    if (!headOkB64) {
      const keyRaw = Buffer.from(secret, 'utf8')
      token = signWithKey(playbackId, keyRaw, kid, ttl)
      try {
        const head = await fetch(`https://stream.mux.com/${playbackId}.m3u8?token=${encodeURIComponent(token)}`, { method: 'HEAD' })
        headOkRaw = head.ok
      } catch {}
    }

    return NextResponse.json({ token, playbackId, ttlSeconds: ttl, kid, headOkB64, headOkRaw })
  } catch (error) {
    console.error('Error generating playback token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}