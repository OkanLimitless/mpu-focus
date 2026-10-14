import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { LandingContent } from './landing-content'
import type { BeratungContent } from './beratung-content'
import {
  websitePages,
  websitePageSchema,
  initialWebsiteState,
  type WebsitePageId,
  type WebsiteContent,
  type WebsiteDocument,
  type WebsiteState,
} from './website-content'

function database() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Website storage is not configured')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
    },
  })
}

export async function getLandingState(
  page: WebsitePageId = 'home'
): Promise<WebsiteState> {
  const definition = websitePages[websitePageSchema.parse(page)]
  const { defaults, schema } = definition
  const { data, error } = await database()
    .from('mpu_settings')
    .select('value, updated_at')
    .eq('key', definition.storageKey)
    .maybeSingle()
  if (error) throw error
  if (!data) return initialWebsiteState(page)
  const value = data.value as WebsiteDocument
  const storedCopy = (copy: Record<string, string>) => {
    if (page !== 'beratung') return copy
    const retired = new Set([
      'question3',
      'question4',
      'questionHint4',
      'question5',
      'questionHint5',
      'successRestartLabel',
    ])
    return Object.fromEntries(
      Object.entries(copy).filter(([key]) => !retired.has(key))
    )
  }
  return {
    revision: data.updated_at,
    document: {
      ...value,
      draft: schema.parse({
        ...defaults,
        ...storedCopy(value.draft),
      }),
      published: schema.parse({
        ...defaults,
        ...storedCopy(value.published),
      }),
      previousPublished: value.previousPublished
        ? schema.parse({
            ...defaults,
            ...storedCopy(value.previousPublished),
          })
        : null,
    },
  }
}

export function getPublishedLandingContent(
  page?: 'home'
): Promise<LandingContent>
export function getPublishedLandingContent(
  page: 'beratung'
): Promise<BeratungContent>
export async function getPublishedLandingContent(
  page: WebsitePageId = 'home'
): Promise<WebsiteContent> {
  try {
    return (await getLandingState(page)).document.published
  } catch (error) {
    console.error('Unable to load published landing content:', error)
    return websitePages[page].defaults
  }
}

export class LandingConflictError extends Error {}

export async function saveLandingContent(input: {
  page?: WebsitePageId
  content: WebsiteContent
  revision: string | null
  action: 'save' | 'publish'
  email: string
}): Promise<WebsiteState> {
  const page = websitePageSchema.parse(input.page ?? 'home')
  const definition = websitePages[page]
  const content = definition.schema.parse(input.content)
  const current = await getLandingState(page)
  if (current.revision !== input.revision) throw new LandingConflictError()
  const now = new Date(
    Math.max(
      Date.now(),
      current.revision ? Date.parse(current.revision) + 1 : 0
    )
  ).toISOString()
  const document: WebsiteDocument = {
    ...current.document,
    draft: content,
    updatedBy: input.email,
    ...(input.action === 'publish'
      ? {
          published: content,
          previousPublished: current.document.published,
          publishedAt: now,
        }
      : {}),
  }
  const db = database()
  const result = current.revision
    ? await db
        .from('mpu_settings')
        .update({ value: document, updated_at: now })
        .eq('key', definition.storageKey)
        .eq('updated_at', current.revision)
        .select('updated_at')
        .maybeSingle()
    : await db
        .from('mpu_settings')
        .insert({
          key: definition.storageKey,
          value: document,
          updated_at: now,
        })
        .select('updated_at')
        .single()
  if (result.error?.code === '23505' || (!result.error && !result.data))
    throw new LandingConflictError()
  if (result.error) throw result.error
  return { document, revision: result.data!.updated_at }
}
