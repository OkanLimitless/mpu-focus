import { sanitizeAttribution, type LeadAttribution } from './ads-tracking'

export type LeadRegion = 'soest' | 'olpe' | 'general'
export function resolveLeadRegion(value: unknown): LeadRegion {
  return value === 'soest' || value === 'olpe' ? value : 'general'
}
export interface LeadAcquisition {
  website: 'focus' | 'kompakt'
  landingPage: string
  region: LeadRegion
  channel: 'form'
  attribution: LeadAttribution
  consent: { version: string; acceptedAt: string } | null
}
// Site/channel are derived here, never accepted from a public request.
export function buildFocusAcquisition(body: Record<string, unknown>, source: string | null): LeadAcquisition {
  return {
    website: 'focus',
    landingPage: source === 'beratung-quiz-de' ? '/beratung' : source === 'landing-page-de' ? '/' : 'unknown',
    region: source === 'beratung-quiz-de' ? resolveLeadRegion(body.region) : 'general',
    channel: 'form',
    attribution: sanitizeAttribution(body.attribution),
    consent: body.consentAccepted === true ? {
      version: source === 'beratung-quiz-de' ? 'beratung_v1' : 'landing_v3',
      acceptedAt: new Date().toISOString(),
    } : null,
  }
}
