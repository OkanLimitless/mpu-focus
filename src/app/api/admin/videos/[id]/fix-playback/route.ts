import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Video from '@/models/Video'
import User from '@/models/User'
import { getMuxAsset } from '@/lib/mux'
import mongoose from 'mongoose'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid video id' }, { status: 400 })
    }

    const video = await Video.findById(params.id)
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.muxAssetId) {
      return NextResponse.json({ error: 'Video has no muxAssetId' }, { status: 400 })
    }

    const muxAsset = await getMuxAsset(video.muxAssetId)
    const signed = (muxAsset.playbackIds || []).find((p: any) => p.policy === 'signed')?.id

    if (!signed) {
      return NextResponse.json({ error: 'No signed playback ID on Mux asset' }, { status: 400 })
    }

    video.muxPlaybackId = signed
    await video.save()

    return NextResponse.json({ success: true, playbackId: signed })
  } catch (error) {
    console.error('Admin video fix-playback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}