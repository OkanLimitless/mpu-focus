import { createClient } from '@supabase/supabase-js'

export type VideoTable = 'video_assets' | 'mpu_video_library'

export type VideoRecord = {
  id: string
  title: string
  description: string | null
  orderIndex: number
  durationSeconds: number | null
  isPublished: boolean
  category: string
  videoUrl: string
  thumbnailUrl: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  muxStatus: string | null
  createdAt: string | null
}

type VideoContext = {
  table: VideoTable
  columns: Set<string>
}

type UpsertVideoInput = {
  title?: string
  description?: string | null
  orderIndex?: number | null
  durationSeconds?: number | null
  isPublished?: boolean
  category?: string | null
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxStatus?: string | null
  videoUrl?: string | null
  thumbnailUrl?: string | null
}

let cachedContext: VideoContext | null = null

function isMissingRelation(error: any, relation: string): boolean {
  if (!error) return false
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  return error?.code === '42P01' || message.includes(relation.toLowerCase()) || details.includes(relation.toLowerCase())
}

function parseMuxPlaybackIdFromUrl(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/stream\.mux\.com\/([a-zA-Z0-9]+)(?:\.m3u8)?/)
  return match?.[1] || null
}

function muxStreamUrl(playbackId?: string | null): string {
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : ''
}

function muxThumbnailUrl(playbackId?: string | null): string | null {
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0` : null
}

function toVideoRecord(row: any, table: VideoTable): VideoRecord {
  if (table === 'video_assets') {
    const muxPlaybackId = row.mux_playback_id || parseMuxPlaybackIdFromUrl(row.video_url)
    const videoUrl = row.video_url || muxStreamUrl(muxPlaybackId)
    const categoryRaw = row.category ?? row.chapter_id
    const category = categoryRaw ? String(categoryRaw) : 'general'

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      orderIndex: row.order_index ?? 0,
      durationSeconds: row.duration_seconds ?? null,
      isPublished: row.is_published ?? row.is_active ?? true,
      category,
      videoUrl,
      thumbnailUrl: row.thumbnail_url || muxThumbnailUrl(muxPlaybackId),
      muxAssetId: row.mux_asset_id ?? null,
      muxPlaybackId: muxPlaybackId ?? null,
      muxStatus: row.mux_status ?? null,
      createdAt: row.created_at ?? null,
    }
  }

  const muxPlaybackId = row.mux_playback_id || parseMuxPlaybackIdFromUrl(row.video_url)
  const videoUrl = row.video_url || muxStreamUrl(muxPlaybackId)

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    orderIndex: row.order_index ?? 0,
    durationSeconds: row.duration_seconds ?? null,
    isPublished: row.is_published ?? true,
    category: row.category || 'general',
    videoUrl,
    thumbnailUrl: row.thumbnail_url || muxThumbnailUrl(muxPlaybackId),
    muxAssetId: row.mux_asset_id ?? null,
    muxPlaybackId: muxPlaybackId ?? null,
    muxStatus: row.mux_status ?? null,
    createdAt: row.created_at ?? null,
  }
}

function assertSupabaseAdminEnv() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin credentials missing')
  }
  return { supabaseUrl, supabaseServiceKey }
}

export function createSupabaseAdminClient() {
  const { supabaseUrl, supabaseServiceKey } = assertSupabaseAdminEnv()
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

async function detectVideoContext(supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>): Promise<VideoContext> {
  if (cachedContext) return cachedContext

  const tryVideoAssets = await supabaseAdmin.from('video_assets').select('id').limit(1)
  if (!tryVideoAssets.error) {
    cachedContext = {
      table: 'video_assets',
      columns: new Set([
        'id',
        'title',
        'description',
        'order_index',
        'duration_seconds',
        'is_active',
        'chapter_id',
        'mux_asset_id',
        'mux_playback_id',
        'mux_status',
        'created_at',
      ]),
    }
    return cachedContext
  }

  if (!isMissingRelation(tryVideoAssets.error, 'video_assets')) {
    throw tryVideoAssets.error
  }

  const tryMpuVideoLibrary = await supabaseAdmin.from('mpu_video_library').select('id').limit(1)
  if (!tryMpuVideoLibrary.error) {
    cachedContext = {
      table: 'mpu_video_library',
      columns: new Set([
        'id',
        'title',
        'description',
        'order_index',
        'duration_seconds',
        'is_published',
        'category',
        'video_url',
        'thumbnail_url',
        'created_at',
      ]),
    }
    return cachedContext
  }

  throw new Error('No supported video table found (expected video_assets or mpu_video_library).')
}

function putIfColumn(
  payload: Record<string, any>,
  columns: Set<string>,
  key: string,
  value: any,
) {
  if (!columns.has(key)) return
  payload[key] = value
}

function buildWritePayload(ctx: VideoContext, input: UpsertVideoInput) {
  const payload: Record<string, any> = {}
  const playbackId = input.muxPlaybackId || parseMuxPlaybackIdFromUrl(input.videoUrl)
  const videoUrl = input.videoUrl || muxStreamUrl(playbackId)
  const thumbnailUrl = input.thumbnailUrl || muxThumbnailUrl(playbackId)

  if (input.title !== undefined) putIfColumn(payload, ctx.columns, 'title', input.title.trim())
  if (input.description !== undefined) putIfColumn(payload, ctx.columns, 'description', input.description ?? null)
  if (input.orderIndex !== undefined) putIfColumn(payload, ctx.columns, 'order_index', input.orderIndex ?? 1)
  if (input.durationSeconds !== undefined) putIfColumn(payload, ctx.columns, 'duration_seconds', input.durationSeconds ?? null)
  if (input.isPublished !== undefined) putIfColumn(payload, ctx.columns, 'is_published', input.isPublished)
  if (input.isPublished !== undefined) putIfColumn(payload, ctx.columns, 'is_active', input.isPublished)
  if (input.category !== undefined) putIfColumn(payload, ctx.columns, 'category', input.category || 'general')
  if (input.videoUrl !== undefined || input.muxPlaybackId !== undefined) putIfColumn(payload, ctx.columns, 'video_url', videoUrl || null)
  if (input.thumbnailUrl !== undefined || input.muxPlaybackId !== undefined) putIfColumn(payload, ctx.columns, 'thumbnail_url', thumbnailUrl || null)
  if (input.muxAssetId !== undefined) putIfColumn(payload, ctx.columns, 'mux_asset_id', input.muxAssetId ?? null)
  if (input.muxPlaybackId !== undefined || input.videoUrl !== undefined) putIfColumn(payload, ctx.columns, 'mux_playback_id', playbackId ?? null)
  if (input.muxStatus !== undefined) putIfColumn(payload, ctx.columns, 'mux_status', input.muxStatus ?? null)

  if (!ctx.columns.has('category') && ctx.columns.has('chapter_id') && input.category !== undefined) {
    // Some legacy schemas use chapter_id where newer screens use category.
    payload.chapter_id = input.category || null
  }

  return payload
}

export async function listVideosAdmin() {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .select('*')
    .order('order_index', { ascending: true })

  if (error) throw error
  return (data || []).map((row: any) => toVideoRecord(row, ctx.table))
}

export async function listVideosPublic() {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  let query = supabaseAdmin.from(ctx.table).select('*').order('order_index', { ascending: true })
  if (ctx.columns.has('is_published')) query = query.eq('is_published', true)
  if (ctx.columns.has('is_active')) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row: any) => toVideoRecord(row, ctx.table))
}

export async function createVideoFromMux(input: UpsertVideoInput) {
  if (!input.title || !input.title.trim()) {
    throw new Error('Video title is required')
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)
  const payload = buildWritePayload(ctx, input)

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return toVideoRecord(data, ctx.table)
}

export async function updateVideoById(id: string, patch: UpsertVideoInput) {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)
  const payload = buildWritePayload(ctx, patch)
  if (Object.keys(payload).length === 0) {
    throw new Error('No valid fields provided for update')
  }

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return toVideoRecord(data, ctx.table)
}

export async function deleteVideoById(id: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  const { error } = await supabaseAdmin
    .from(ctx.table)
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function findVideoByMuxAssetId(assetId: string): Promise<VideoRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  if (!ctx.columns.has('mux_asset_id')) return null

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .select('*')
    .eq('mux_asset_id', assetId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toVideoRecord(data, ctx.table)
}

export async function findVideoByPlaybackId(playbackId: string): Promise<VideoRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)
  if (!ctx.columns.has('video_url')) return null

  const url = muxStreamUrl(playbackId)
  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .select('*')
    .eq('video_url', url)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toVideoRecord(data, ctx.table)
}

export async function updateVideoByMuxAssetId(assetId: string, patch: UpsertVideoInput): Promise<VideoRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  if (!ctx.columns.has('mux_asset_id')) return null
  const payload = buildWritePayload(ctx, patch)

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .update(payload)
    .eq('mux_asset_id', assetId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toVideoRecord(data, ctx.table)
}
