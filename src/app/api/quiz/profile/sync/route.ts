import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import UserCaseProfile from '@/models/UserCaseProfile'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashString(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function normalizeFacts(extractedData?: string) {
  const text = (extractedData || '').toLowerCase()
  const facts: any = {}
  const riskFlags: string[] = []
  if (/alkohol|promill|bak|‰/.test(text)) riskFlags.push('alcohol_case')
  if (/cannabis|thc|trennungsvermögen|joint/.test(text)) riskFlags.push('cannabis_case')
  if (/punkte|flensburg/.test(text)) riskFlags.push('points_case')
  if (/1,1‰|1\.1‰/.test(text)) facts.reference_bac_1_1 = true
  return { facts: { summary: extractedData?.slice(0, 2000) || '', hints: facts }, riskFlags }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await User.findOne({ email: session.user.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const extracted = user.documentProcessing?.extractedData || ''
    const sourceHash = hashString(extracted)
    const { facts, riskFlags } = normalizeFacts(extracted)

    const existing = await UserCaseProfile.findOne({ userId: user._id, sourceHash })
    if (existing) return NextResponse.json({ success: true, profile: existing })

    const profile = await UserCaseProfile.create({ userId: user._id, sourceHash, facts, riskFlags })
    return NextResponse.json({ success: true, profile })
  } catch (e) {
    console.error('profile/sync error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

