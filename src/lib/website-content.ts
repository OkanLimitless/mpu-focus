import { z } from 'zod'
import {
  defaultLandingContent,
  landingContentSchema,
  landingFields,
  landingSections,
} from './landing-content'
import {
  defaultBeratungContent,
  beratungContentSchema,
  beratungFields,
  beratungSections,
} from './beratung-content'

export const websitePageSchema = z.enum(['home', 'beratung'])
export type WebsitePageId = z.infer<typeof websitePageSchema>
export type WebsiteContent = Record<string, string>
export type WebsiteField = {
  key: string
  label: string
  section: string
  kind: 'text' | 'textarea' | 'image'
  defaultValue: string
}
export type WebsiteDocument = {
  draft: WebsiteContent
  published: WebsiteContent
  previousPublished: WebsiteContent | null
  publishedAt: string | null
  updatedBy: string | null
}
export type WebsiteState = {
  document: WebsiteDocument
  revision: string | null
}

type WebsiteDefinition = {
  label: string
  path: string
  storageKey: string
  defaults: WebsiteContent
  schema: z.ZodType<WebsiteContent>
  fields: readonly WebsiteField[]
  sections: readonly { id: string; label: string; description: string }[]
}

export const websitePages: Record<WebsitePageId, WebsiteDefinition> = {
  home: {
    label: 'Startseite',
    path: '/',
    storageKey: 'landing_home',
    defaults: defaultLandingContent,
    schema: landingContentSchema,
    fields: landingFields,
    sections: landingSections,
  },
  beratung: {
    label: 'Google Ads · Beratung',
    path: '/beratung',
    storageKey: 'landing_beratung',
    defaults: defaultBeratungContent,
    schema: beratungContentSchema,
    fields: beratungFields,
    sections: beratungSections,
  },
}

export function initialWebsiteState(page: WebsitePageId): WebsiteState {
  return {
    revision: null,
    document: {
      draft: websitePages[page].defaults,
      published: websitePages[page].defaults,
      previousPublished: null,
      publishedAt: null,
      updatedBy: null,
    },
  }
}

export function resolveWebsitePage(value: unknown): WebsitePageId {
  const parsed = websitePageSchema.safeParse(value)
  return parsed.success ? parsed.data : 'home'
}
