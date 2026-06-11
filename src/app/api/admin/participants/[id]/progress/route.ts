import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdminRequest } from '@/lib/admin-auth'
import { listVideosAdmin } from '@/lib/video-library'
import { listAttemptsForProfile, listQuizzesAdmin } from '@/lib/quiz-library'
import { listPaymentsForProfile } from '@/lib/finance-library'
import { getAgreementForProfile } from '@/lib/agreement-library'

export const dynamic = 'force-dynamic'

function getHttpStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('unauthorized')) return 401
  if (message.includes('forbidden')) return 403
  return 500
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials missing')
  }
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await assertAdminRequest()
    const supabaseAdmin = createSupabaseAdmin()

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('mpu_profiles')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return NextResponse.json({ error: 'Teilnehmer nicht gefunden.' }, { status: 404 })
    }

    const [videos, progressResult, quizzes, attempts, payments, agreement] = await Promise.all([
      listVideosAdmin().catch(() => []),
      supabaseAdmin.from('mpu_video_progress').select('*').eq('profile_id', params.id),
      listQuizzesAdmin().catch(() => []),
      listAttemptsForProfile(params.id).catch(() => []),
      listPaymentsForProfile(params.id).catch(() => []),
      getAgreementForProfile(params.id).catch(() => null),
    ])

    if (progressResult.error) throw progressResult.error
    const progressByVideo = new Map(
      (progressResult.data || []).map((row: any) => [row.video_id, row]),
    )

    const publishedVideos = videos.filter((video) => video.isPublished)
    const videoProgress = publishedVideos.map((video) => {
      const row = progressByVideo.get(video.id)
      return {
        videoId: video.id,
        title: video.title,
        chapterTitle: video.chapterTitle,
        categoryTitle: video.categoryTitle,
        durationSeconds: video.durationSeconds,
        completionPercentage: Number(row?.completion_percentage ?? 0),
        isCompleted: row?.is_completed === true,
        lastPositionSeconds: Number(row?.last_position_seconds ?? 0),
        lastActivityAt: row?.updated_at ?? row?.created_at ?? null,
      }
    })

    const quizzesById = new Map(quizzes.map((quiz) => [quiz.id, quiz]))
    const quizAttempts = attempts.map((attempt) => ({
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: quizzesById.get(attempt.quizId)?.title || 'Quiz wurde entfernt',
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      needsReview: attempt.needsReview,
      completedAt: attempt.completedAt,
    }))

    const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0)
    const packagePriceCents = profile.package_price_cents ?? null

    return NextResponse.json({
      participant: {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        isActive: profile.is_active === true,
        academyAccessEnabled: profile.academy_access_enabled === true,
        createdAt: profile.created_at,
      },
      videoProgress: {
        totalVideos: publishedVideos.length,
        completedVideos: videoProgress.filter((video) => video.isCompleted).length,
        videos: videoProgress,
      },
      quizProgress: {
        totalQuizzes: quizzes.filter((quiz) => quiz.isPublished).length,
        passedQuizzes: new Set(attempts.filter((attempt) => attempt.passed === true).map((attempt) => attempt.quizId)).size,
        attempts: quizAttempts,
      },
      finance: {
        packagePriceCents,
        paidCents,
        outstandingCents: packagePriceCents != null ? Math.max(0, packagePriceCents - paidCents) : 0,
        financeNotes: profile.finance_notes ?? null,
        payments: payments.map((payment) => ({
          id: payment.id,
          amountCents: payment.amountCents,
          method: payment.method,
          note: payment.note,
          paidAt: payment.paidAt,
        })),
      },
      agreement: agreement
        ? {
            id: agreement.id,
            status: agreement.status,
            fullName: agreement.fullName,
            birthDate: agreement.birthDate,
            address: agreement.address,
            signedAt: agreement.signedAt,
            signedIp: agreement.signedIp,
            signatureData: agreement.signatureData,
            idDocumentUrl: agreement.idDocumentUrl,
            idDocumentName: agreement.idDocumentName,
            contractVersion: agreement.contractVersion,
            contractText: agreement.contractText,
            rejectionReason: agreement.rejectionReason,
            reviewedAt: agreement.reviewedAt,
          }
        : null,
    })
  } catch (error: any) {
    console.error('Error fetching participant progress:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch participant progress' }, { status: getHttpStatus(error) })
  }
}
