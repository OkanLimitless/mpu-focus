import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'
import { listVideosAdmin } from '@/lib/video-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  if (message.includes('not configured')) return 503
  return 500
}

function isMissingRelation(error: any, relation: string) {
  if (!error) return false
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  return error?.code === '42P01' || message.includes(relation.toLowerCase()) || details.includes(relation.toLowerCase())
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

type ProgressSummary = {
  completedVideos: number
  touchedVideos: number
  totalVideos: number
  averageProgress: number
  lastActivity: string | null
}

export async function GET(request: NextRequest) {
  try {
    await assertAdminRequest()

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const supabaseAdmin = createSupabaseAdmin()

    const profilesPromise = supabaseAdmin
      .from('mpu_profiles')
      .select('id,email,first_name,last_name,role,is_active,academy_access_enabled,created_at,updated_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    const videosPromise = (async () => {
      try {
        return await listVideosAdmin()
      } catch (error: any) {
        if (isMissingRelation(error, 'mpu_video_library') || isMissingRelation(error, 'video_assets')) {
          return []
        }
        throw error
      }
    })()

    const progressPromise = (async () => {
      try {
        const result = await supabaseAdmin
          .from('mpu_video_progress')
          .select('*')

        if (result.error) throw result.error
        return result.data || []
      } catch (error: any) {
        if (isMissingRelation(error, 'mpu_video_progress')) {
          return []
        }
        throw error
      }
    })()

    const [{ data: profiles, error: profilesError }, videos, progressRows] = await Promise.all([
      profilesPromise,
      videosPromise,
      progressPromise,
    ])

    if (profilesError) throw profilesError

    const publishedVideos = videos.filter((video) => video.isPublished)
    const totalPublishedVideos = publishedVideos.length

    const progressByProfile = new Map<string, ProgressSummary>()

    for (const row of progressRows || []) {
      const profileId = String(row.profile_id || '')
      if (!profileId) continue

      const previous = progressByProfile.get(profileId) || {
        completedVideos: 0,
        touchedVideos: 0,
        totalVideos: totalPublishedVideos,
        averageProgress: 0,
        lastActivity: null,
      }

      const completion = Number(row.completion_percentage ?? 0)
      const isCompleted = row.is_completed === true
      const updatedAt = typeof row.updated_at === 'string'
        ? row.updated_at
        : typeof row.created_at === 'string'
          ? row.created_at
          : null

      const nextLastActivity = previous.lastActivity && updatedAt
        ? (new Date(previous.lastActivity) > new Date(updatedAt) ? previous.lastActivity : updatedAt)
        : (previous.lastActivity || updatedAt)

      progressByProfile.set(profileId, {
        completedVideos: previous.completedVideos + (isCompleted ? 1 : 0),
        touchedVideos: previous.touchedVideos + 1,
        totalVideos: totalPublishedVideos,
        averageProgress: previous.averageProgress + completion,
        lastActivity: nextLastActivity,
      })
    }

    const participants = (profiles || [])
      .map((profile: any) => {
        const rawProgress = progressByProfile.get(profile.id)

        return {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          isActive: profile.is_active === true,
          academyAccessEnabled: profile.academy_access_enabled === true,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          progress: {
            totalVideos: totalPublishedVideos,
            completedVideos: rawProgress?.completedVideos || 0,
            averageProgress: rawProgress && rawProgress.touchedVideos > 0
              ? Math.round(rawProgress.averageProgress / rawProgress.touchedVideos)
              : 0,
            lastActivity: rawProgress?.lastActivity || null,
          },
        }
      })
      .filter((participant) => {
        if (!search) return true
        const haystack = `${participant.firstName} ${participant.lastName} ${participant.email}`.toLowerCase()
        return haystack.includes(search)
      })

    const activeParticipants = participants.filter((participant) => participant.isActive)
    const academyEnabledParticipants = participants.filter((participant) => participant.isActive && participant.academyAccessEnabled)
    const recentlyActiveParticipants = participants.filter((participant) => {
      if (!participant.progress.lastActivity) return false
      const diffMs = Date.now() - new Date(participant.progress.lastActivity).getTime()
      return diffMs <= 7 * 24 * 60 * 60 * 1000
    })

    return NextResponse.json({
      participants,
      stats: {
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        academyEnabledParticipants: academyEnabledParticipants.length,
        recentlyActiveParticipants: recentlyActiveParticipants.length,
        publishedVideos: totalPublishedVideos,
      },
    })
  } catch (error: any) {
    console.error('Error fetching participants:', error)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: getHttpStatus(error) })
  }
}
