import { createClient } from '@supabase/supabase-js'
import { parseYouTubeVideoId, youtubeThumbnailUrl, youtubeWatchUrl } from './youtube'

export type VideoTable = 'video_assets' | 'mpu_video_library'

export type VideoProvider = 'mux' | 'youtube'

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
  provider: VideoProvider
  youtubeVideoId: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  muxStatus: string | null
  createdAt: string | null
  categoryId: string | null
  categoryTitle: string | null
  categorySlug: string | null
  categoryOrderIndex: number | null
  chapterId: string | null
  chapterTitle: string | null
  chapterSlug: string | null
  chapterOrderIndex: number | null
}

export type VideoCategoryRecord = {
  id: string
  name: string
  slug: string
  description: string | null
  orderIndex: number
  isActive: boolean
  createdAt: string | null
}

export type VideoChapterRecord = {
  id: string
  categoryId: string
  title: string
  slug: string
  description: string | null
  orderIndex: number
  isActive: boolean
  createdAt: string | null
}

export type VideoProgressRecord = {
  videoId: string
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
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
  provider?: VideoProvider | null
  youtubeVideoId?: string | null
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxStatus?: string | null
  videoUrl?: string | null
  thumbnailUrl?: string | null
  chapterId?: string | null
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

function slugify(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'item'
}

function getChapterMeta(row: any) {
  const chapter = row.chapter || null
  const category = chapter?.category || null

  return {
    categoryId: category?.id ?? null,
    categoryTitle: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    categoryOrderIndex: category?.order_index ?? null,
    chapterId: chapter?.id ?? row.chapter_id ?? null,
    chapterTitle: chapter?.title ?? null,
    chapterSlug: chapter?.slug ?? null,
    chapterOrderIndex: chapter?.order_index ?? null,
  }
}

function getSourceMeta(row: any) {
  const youtubeVideoId = row.youtube_video_id || parseYouTubeVideoId(row.video_url)
  if (row.provider === 'youtube' || youtubeVideoId) {
    return {
      provider: 'youtube' as const,
      youtubeVideoId: youtubeVideoId ?? null,
      muxPlaybackId: null,
      videoUrl: row.video_url || (youtubeVideoId ? youtubeWatchUrl(youtubeVideoId) : ''),
      thumbnailUrl: row.thumbnail_url || youtubeThumbnailUrl(youtubeVideoId),
    }
  }

  const muxPlaybackId = row.mux_playback_id || parseMuxPlaybackIdFromUrl(row.video_url)
  return {
    provider: 'mux' as const,
    youtubeVideoId: null,
    muxPlaybackId: muxPlaybackId ?? null,
    videoUrl: row.video_url || muxStreamUrl(muxPlaybackId),
    thumbnailUrl: row.thumbnail_url || muxThumbnailUrl(muxPlaybackId),
  }
}

function toVideoRecord(row: any, table: VideoTable): VideoRecord {
  const meta = getChapterMeta(row)
  const source = getSourceMeta(row)

  if (table === 'video_assets') {
    const categoryRaw = row.category ?? row.chapter_id
    const category = meta.categoryTitle || (categoryRaw ? String(categoryRaw) : 'general')

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      orderIndex: row.order_index ?? 0,
      durationSeconds: row.duration_seconds ?? null,
      isPublished: row.is_published ?? row.is_active ?? true,
      category,
      videoUrl: source.videoUrl,
      thumbnailUrl: source.thumbnailUrl,
      provider: source.provider,
      youtubeVideoId: source.youtubeVideoId,
      muxAssetId: row.mux_asset_id ?? null,
      muxPlaybackId: source.muxPlaybackId,
      muxStatus: row.mux_status ?? null,
      createdAt: row.created_at ?? null,
      ...meta,
    }
  }

  const category = meta.categoryTitle || row.category || 'general'

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    orderIndex: row.order_index ?? 0,
    durationSeconds: row.duration_seconds ?? null,
    isPublished: row.is_published ?? true,
    category,
    videoUrl: source.videoUrl,
    thumbnailUrl: source.thumbnailUrl,
    provider: source.provider,
    youtubeVideoId: source.youtubeVideoId,
    muxAssetId: row.mux_asset_id ?? null,
    muxPlaybackId: source.muxPlaybackId,
    muxStatus: row.mux_status ?? null,
    createdAt: row.created_at ?? null,
    ...meta,
  }
}

function toVideoCategoryRecord(row: any): VideoCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    orderIndex: row.order_index ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at ?? null,
  }
}

function toVideoChapterRecord(row: any): VideoChapterRecord {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? null,
    orderIndex: row.order_index ?? 0,
    isActive: row.is_active ?? true,
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
        'video_url',
        'thumbnail_url',
        'provider',
        'youtube_video_id',
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
        'provider',
        'youtube_video_id',
        'mux_asset_id',
        'mux_playback_id',
        'mux_status',
        'chapter_id',
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
  const youtubeVideoId = input.youtubeVideoId ?? (input.provider === 'youtube' ? parseYouTubeVideoId(input.videoUrl) : null)
  const isYouTube = input.provider === 'youtube' || !!youtubeVideoId
  const playbackId = isYouTube ? null : (input.muxPlaybackId || parseMuxPlaybackIdFromUrl(input.videoUrl))
  const videoUrl = isYouTube
    ? (youtubeVideoId ? youtubeWatchUrl(youtubeVideoId) : input.videoUrl || '')
    : (input.videoUrl || muxStreamUrl(playbackId))
  const thumbnailUrl = input.thumbnailUrl || (isYouTube ? youtubeThumbnailUrl(youtubeVideoId) : muxThumbnailUrl(playbackId))

  if (input.title !== undefined) putIfColumn(payload, ctx.columns, 'title', input.title.trim())
  if (input.description !== undefined) putIfColumn(payload, ctx.columns, 'description', input.description ?? null)
  if (input.orderIndex !== undefined) putIfColumn(payload, ctx.columns, 'order_index', input.orderIndex ?? 1)
  if (input.durationSeconds !== undefined) putIfColumn(payload, ctx.columns, 'duration_seconds', input.durationSeconds ?? null)
  if (input.isPublished !== undefined) putIfColumn(payload, ctx.columns, 'is_published', input.isPublished)
  if (input.isPublished !== undefined) putIfColumn(payload, ctx.columns, 'is_active', input.isPublished)
  if (input.category !== undefined) putIfColumn(payload, ctx.columns, 'category', input.category || 'general')
  if (input.chapterId !== undefined) putIfColumn(payload, ctx.columns, 'chapter_id', input.chapterId ?? null)

  if (isYouTube) {
    putIfColumn(payload, ctx.columns, 'provider', 'youtube')
    putIfColumn(payload, ctx.columns, 'youtube_video_id', youtubeVideoId ?? null)
    if (input.youtubeVideoId !== undefined || input.videoUrl !== undefined) {
      putIfColumn(payload, ctx.columns, 'video_url', videoUrl || null)
      putIfColumn(payload, ctx.columns, 'thumbnail_url', thumbnailUrl || null)
      putIfColumn(payload, ctx.columns, 'mux_asset_id', null)
      putIfColumn(payload, ctx.columns, 'mux_playback_id', null)
      putIfColumn(payload, ctx.columns, 'mux_status', null)
    }
  } else {
    if (input.provider !== undefined || input.muxAssetId !== undefined || input.muxPlaybackId !== undefined) {
      putIfColumn(payload, ctx.columns, 'provider', 'mux')
      putIfColumn(payload, ctx.columns, 'youtube_video_id', null)
    }
    if (input.videoUrl !== undefined || input.muxPlaybackId !== undefined) putIfColumn(payload, ctx.columns, 'video_url', videoUrl || null)
    if (input.thumbnailUrl !== undefined || input.muxPlaybackId !== undefined) putIfColumn(payload, ctx.columns, 'thumbnail_url', thumbnailUrl || null)
    if (input.muxAssetId !== undefined) putIfColumn(payload, ctx.columns, 'mux_asset_id', input.muxAssetId ?? null)
    if (input.muxPlaybackId !== undefined || input.videoUrl !== undefined) putIfColumn(payload, ctx.columns, 'mux_playback_id', playbackId ?? null)
    if (input.muxStatus !== undefined) putIfColumn(payload, ctx.columns, 'mux_status', input.muxStatus ?? null)
  }

  if (!ctx.columns.has('category') && ctx.columns.has('chapter_id') && input.category !== undefined) {
    // Some legacy schemas use chapter_id where newer screens use category.
    payload.chapter_id = input.category || null
  }

  return payload
}

function videoSelect(ctx: VideoContext) {
  if (ctx.table !== 'mpu_video_library' || !ctx.columns.has('chapter_id')) return '*'
  return '*, chapter:mpu_video_chapters(id,title,slug,description,order_index,category:mpu_video_categories(id,name,slug,description,order_index))'
}

export async function listVideosAdmin() {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .select(videoSelect(ctx))
    .order('order_index', { ascending: true })

  if (error) throw error
  return (data || []).map((row: any) => toVideoRecord(row, ctx.table))
}

export async function listVideosPublic() {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  let query = supabaseAdmin.from(ctx.table).select(videoSelect(ctx)).order('order_index', { ascending: true })
  if (ctx.columns.has('is_published')) query = query.eq('is_published', true)
  if (ctx.columns.has('is_active')) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row: any) => toVideoRecord(row, ctx.table))
}

export async function getVideoById(id: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const ctx = await detectVideoContext(supabaseAdmin)

  const { data, error } = await supabaseAdmin
    .from(ctx.table)
    .select(videoSelect(ctx))
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toVideoRecord(data, ctx.table)
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
    .select(videoSelect(ctx))
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
    .select(videoSelect(ctx))
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
    .select(videoSelect(ctx))
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
    .select(videoSelect(ctx))
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
    .select(videoSelect(ctx))
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return toVideoRecord(data, ctx.table)
}

export async function listVideoCategoriesAdmin() {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_video_categories')
    .select('*')
    .order('order_index', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []).map(toVideoCategoryRecord)
}

export async function listVideoChaptersAdmin(categoryId?: string | null) {
  const supabaseAdmin = createSupabaseAdminClient()
  let query = supabaseAdmin
    .from('mpu_video_chapters')
    .select('*')
    .order('order_index', { ascending: true })
    .order('title', { ascending: true })

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(toVideoChapterRecord)
}

export async function getVideoChapterById(id: string): Promise<VideoChapterRecord | null> {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_video_chapters')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? toVideoChapterRecord(data) : null
}

export async function createVideoCategory(input: {
  name: string
  description?: string | null
  orderIndex?: number | null
}) {
  const name = input.name.trim()
  if (!name) throw new Error('Category name is required')

  const supabaseAdmin = createSupabaseAdminClient()
  const payload = {
    name,
    slug: slugify(name),
    description: input.description ?? null,
    order_index: input.orderIndex ?? 1,
  }

  const { data, error } = await supabaseAdmin
    .from('mpu_video_categories')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return toVideoCategoryRecord(data)
}

export async function updateVideoCategory(id: string, patch: {
  name?: string
  description?: string | null
  orderIndex?: number | null
  isActive?: boolean
}) {
  const payload: Record<string, any> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error('Category name is required')
    payload.name = name
    payload.slug = slugify(name)
  }
  if (patch.description !== undefined) payload.description = patch.description
  if (patch.orderIndex !== undefined) payload.order_index = patch.orderIndex ?? 1
  if (patch.isActive !== undefined) payload.is_active = patch.isActive

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_video_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return toVideoCategoryRecord(data)
}

export async function deleteVideoCategory(id: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_video_categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createVideoChapter(input: {
  categoryId: string
  title: string
  description?: string | null
  orderIndex?: number | null
}) {
  const title = input.title.trim()
  if (!input.categoryId) throw new Error('Category is required')
  if (!title) throw new Error('Chapter title is required')

  const supabaseAdmin = createSupabaseAdminClient()
  const payload = {
    category_id: input.categoryId,
    title,
    slug: slugify(title),
    description: input.description ?? null,
    order_index: input.orderIndex ?? 1,
  }

  const { data, error } = await supabaseAdmin
    .from('mpu_video_chapters')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return toVideoChapterRecord(data)
}

export async function updateVideoChapter(id: string, patch: {
  categoryId?: string
  title?: string
  description?: string | null
  orderIndex?: number | null
  isActive?: boolean
}) {
  const payload: Record<string, any> = {}
  if (patch.categoryId !== undefined) payload.category_id = patch.categoryId
  if (patch.title !== undefined) {
    const title = patch.title.trim()
    if (!title) throw new Error('Chapter title is required')
    payload.title = title
    payload.slug = slugify(title)
  }
  if (patch.description !== undefined) payload.description = patch.description
  if (patch.orderIndex !== undefined) payload.order_index = patch.orderIndex ?? 1
  if (patch.isActive !== undefined) payload.is_active = patch.isActive

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_video_chapters')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return toVideoChapterRecord(data)
}

export async function deleteVideoChapter(id: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const { error } = await supabaseAdmin
    .from('mpu_video_chapters')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function moveVideoCategory(id: string, direction: 'up' | 'down') {
  const categories = await listVideoCategoriesAdmin()
  const index = categories.findIndex((category) => category.id === id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return categories[index] || null

  const current = categories[index]
  const target = categories[targetIndex]
  const supabaseAdmin = createSupabaseAdminClient()
  const { error: currentError } = await supabaseAdmin
    .from('mpu_video_categories')
    .update({ order_index: target.orderIndex })
    .eq('id', current.id)
  if (currentError) throw currentError

  const { error: targetError } = await supabaseAdmin
    .from('mpu_video_categories')
    .update({ order_index: current.orderIndex })
    .eq('id', target.id)
  if (targetError) throw targetError

  return current
}

export async function moveVideoChapter(id: string, direction: 'up' | 'down') {
  const chapter = await getVideoChapterById(id)
  if (!chapter) return null

  const chapters = await listVideoChaptersAdmin(chapter.categoryId)
  const index = chapters.findIndex((item) => item.id === id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || targetIndex < 0 || targetIndex >= chapters.length) return chapter

  const current = chapters[index]
  const target = chapters[targetIndex]
  const supabaseAdmin = createSupabaseAdminClient()
  const { error: currentError } = await supabaseAdmin
    .from('mpu_video_chapters')
    .update({ order_index: target.orderIndex })
    .eq('id', current.id)
  if (currentError) throw currentError

  const { error: targetError } = await supabaseAdmin
    .from('mpu_video_chapters')
    .update({ order_index: current.orderIndex })
    .eq('id', target.id)
  if (targetError) throw targetError

  return current
}

export async function moveVideoWithinChapter(id: string, direction: 'up' | 'down') {
  const videos = await listVideosAdmin()
  const current = videos.find((video) => video.id === id)
  if (!current) return null

  const siblings = videos
    .filter((video) => (video.chapterId || null) === (current.chapterId || null))
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))

  const index = siblings.findIndex((video) => video.id === id)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return current

  const target = siblings[targetIndex]
  await updateVideoById(current.id, { orderIndex: target.orderIndex })
  await updateVideoById(target.id, { orderIndex: current.orderIndex })
  return current
}

export async function listVideoProgressForProfile(profileId: string) {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from('mpu_video_progress')
    .select('video_id,last_position_seconds,completion_percentage,is_completed')
    .eq('profile_id', profileId)

  if (error) throw error

  return new Map<string, VideoProgressRecord>(
    (data || []).map((row: any) => [
      row.video_id,
      {
        videoId: row.video_id,
        currentTime: row.last_position_seconds ?? 0,
        watchedDuration: row.last_position_seconds ?? 0,
        completionPercentage: Number(row.completion_percentage ?? 0),
        isCompleted: row.is_completed ?? false,
      },
    ]),
  )
}

export async function upsertVideoProgress(params: {
  profileId: string
  videoId: string
  currentTime: number
  watchedDuration: number
  completionPercentage: number
  isCompleted: boolean
}) {
  const supabaseAdmin = createSupabaseAdminClient()

  const payload = {
    profile_id: params.profileId,
    video_id: params.videoId,
    last_position_seconds: params.currentTime,
    completion_percentage: params.completionPercentage,
    is_completed: params.isCompleted,
  }

  const { data, error } = await supabaseAdmin
    .from('mpu_video_progress')
    .upsert(payload, { onConflict: 'profile_id,video_id' })
    .select('video_id,last_position_seconds,completion_percentage,is_completed')
    .single()

  if (error) throw error

  return {
    videoId: data.video_id,
    currentTime: data.last_position_seconds ?? 0,
    watchedDuration: data.last_position_seconds ?? 0,
    completionPercentage: Number(data.completion_percentage ?? 0),
    isCompleted: data.is_completed ?? false,
  } satisfies VideoProgressRecord
}
