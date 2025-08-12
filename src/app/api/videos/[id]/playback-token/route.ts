import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import connectDB from '@/lib/mongodb'
import Video from '@/models/Video'
import { generateSignedPlaybackToken } from '@/lib/mux'
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

function signWithKey(playbackId: string, key: Buffer, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT', kid: process.env.MUX_SIGNING_KEY_ID }
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

    const kid = process.env.MUX_SIGNING_KEY_ID
    const secret = process.env.MUX_SIGNING_KEY_SECRET || ''
    if (!kid || !secret) {
      return NextResponse.json({ error: 'Mux signing keys not configured' }, { status: 500 })
    }

    const ttl = 120
    const playbackId = video.muxPlaybackId

    // First try base64-decoded secret (Mux default)
    const keyB64 = Buffer.from(secret, 'base64')
    let token = signWithKey(playbackId, keyB64, ttl)

    const testUrl = `https://stream.mux.com/${playbackId}.m3u8?token=${encodeURIComponent(token)}`
    let ok = false
    try {
      const head = await fetch(testUrl, { method: 'HEAD' })
      ok = head.ok
    } catch {}

    // Fallback: try raw utf8 secret if base64 variant fails
    if (!ok) {
      const keyRaw = Buffer.from(secret, 'utf8')
      token = signWithKey(playbackId, keyRaw, ttl)
    }

    return NextResponse.json({ token, playbackId, ttlSeconds: ttl })
  } catch (error) {
    console.error('Error generating playback token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}