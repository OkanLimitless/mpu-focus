import { NextRequest, NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin-auth'
import { supabaseCount } from '@/lib/supabase-rest'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await assertAdminRequest()

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      enrolledLeads,
      closedLeads,
      totalVideos,
      publishedVideos,
    ] = await Promise.all([
      supabaseCount({ path: 'mpu_signups', useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.new' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.contacted' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.enrolled' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_signups', query: { status: 'eq.closed' }, useServiceRole: true }),
      supabaseCount({ path: 'mpu_video_library', useServiceRole: true }),
      supabaseCount({ path: 'mpu_video_library', query: { is_published: 'eq.true' }, useServiceRole: true }),
    ])

    return NextResponse.json({
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        enrolledLeads,
        closedLeads,
        totalVideos,
        publishedVideos,
      },
    })
  } catch (error: any) {
    if (String(error?.message) === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (String(error?.message) === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
