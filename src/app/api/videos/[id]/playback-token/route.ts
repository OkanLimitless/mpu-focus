import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import connectDB from '@/lib/mongodb'
import Video from '@/models/Video'
import { generateSignedPlaybackToken } from '@/lib/mux'
import mongoose from 'mongoose'

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

    const token = generateSignedPlaybackToken(video.muxPlaybackId, 120)

    return NextResponse.json({ token, playbackId: video.muxPlaybackId, ttlSeconds: 120 })
  } catch (error) {
    console.error('Error generating playback token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}