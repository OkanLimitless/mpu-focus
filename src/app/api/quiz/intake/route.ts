import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import UserIntake from '@/models/UserIntake'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const intake = await UserIntake.findOne({ userId: user._id }).lean()
    return NextResponse.json({ success: true, intake })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const body = await req.json()
    const incoming = body?.responses || {}
    const complete = !!body?.complete
    // Fetch existing for merge & timestamps
    const existing = await UserIntake.findOne({ userId: user._id })
    const prev = (existing?.responses || {}) as any

    // Deep merge helper: set leafs as { value, ts }
    const nowISO = new Date().toISOString()
    const merge = (oldVal: any, newVal: any): any => {
      // if newVal is undefined/null, keep old as-is
      if (newVal === undefined) return oldVal
      if (newVal === null) return { value: null, ts: nowISO }
      // primitives/arrays become { value, ts }
      if (typeof newVal !== 'object' || Array.isArray(newVal)) {
        // if old is object with value and value equals, preserve old ts
        if (oldVal && typeof oldVal === 'object' && 'value' in oldVal && JSON.stringify(oldVal.value) === JSON.stringify(newVal)) {
          return oldVal
        }
        return { value: newVal, ts: nowISO }
      }
      // objects: merge each key
      const out: any = Array.isArray(oldVal) ? {} : { ...(oldVal || {}) }
      for (const k of Object.keys(newVal)) {
        out[k] = merge(oldVal ? oldVal[k] : undefined, newVal[k])
      }
      return out
    }

    const merged = merge(prev, incoming)

    const update: any = { responses: merged }
    if (complete) update.completedAt = new Date()
    const doc = await UserIntake.findOneAndUpdate(
      { userId: user._id },
      { $set: update },
      { upsert: true, new: true }
    )
    return NextResponse.json({ success: true, intake: doc })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
