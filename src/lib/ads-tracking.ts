import type { LeadRegion } from './lead-acquisition'

// Basic consent mode: no Google script or conversion request before opt-in.
// This module never receives names, contact details or MPU questionnaire answers.
export const ADS_CONSENT_KEY = 'mpu-ads-consent-v1'
export const ADS_CONSENT_EVENT = 'mpu-ads-consent-change'
const ATTRIBUTION_KEY = 'mpu-beratung-attribution-v1'
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
] as const
export type LeadAttribution = Partial<
  Record<(typeof ATTRIBUTION_KEYS)[number], string>
>
export function sanitizeAttribution(value: unknown): LeadAttribution {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    ATTRIBUTION_KEYS.flatMap((key) => {
      const item = (value as Record<string, unknown>)[key]
      return typeof item === 'string' &&
        /^[a-zA-Z0-9_.~+% /=-]{1,200}$/.test(item)
        ? [[key, item]]
        : []
    })
  )
}
let memoryConsent = false
export function hasAdsConsent() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ADS_CONSENT_KEY) === 'granted'
  } catch {
    return memoryConsent
  }
}
export function saveAdsConsent(granted: boolean) {
  memoryConsent = granted
  try {
    localStorage.setItem(ADS_CONSENT_KEY, granted ? 'granted' : 'denied')
  } catch {
    /* Storage may be disabled. */
  }
  if (!granted) {
    // The global cookie control also works after leaving /beratung.
    if (initialized) (window as TagWindow).gtag?.('consent', 'update', denied)
    try {
      sessionStorage.removeItem(ATTRIBUTION_KEY)
    } catch {
      /* Optional storage. */
    }
  }
  window.dispatchEvent(new Event(ADS_CONSENT_EVENT))
}
export function getLeadAttribution(): LeadAttribution {
  if (!hasAdsConsent()) return {}
  const fromUrl = sanitizeAttribution(
    Object.fromEntries(new URLSearchParams(window.location.search))
  )
  try {
    if (Object.keys(fromUrl).length)
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fromUrl))
    return Object.keys(fromUrl).length
      ? fromUrl
      : sanitizeAttribution(
          JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}')
        )
  } catch {
    return fromUrl
  }
}

type TagWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}
let initialized = false
const sentLeads = new Set<string>()
type ContactChannel = 'phone' | 'whatsapp'
function config() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || ''
  return /^AW-\d+$/.test(id) ? { id } : null
}
function conversionLabel(channel: 'form' | ContactChannel, region: LeadRegion) {
  const general = {
    form: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
    phone: process.env.NEXT_PUBLIC_GOOGLE_ADS_PHONE_LABEL,
    whatsapp: process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL,
  }
  const regional = {
    soest: {
      form: process.env.NEXT_PUBLIC_GOOGLE_ADS_SOEST_FORM_LABEL,
      phone: process.env.NEXT_PUBLIC_GOOGLE_ADS_SOEST_PHONE_LABEL,
      whatsapp: process.env.NEXT_PUBLIC_GOOGLE_ADS_SOEST_WHATSAPP_LABEL,
    },
    olpe: {
      form: process.env.NEXT_PUBLIC_GOOGLE_ADS_OLPE_FORM_LABEL,
      phone: process.env.NEXT_PUBLIC_GOOGLE_ADS_OLPE_PHONE_LABEL,
      whatsapp: process.env.NEXT_PUBLIC_GOOGLE_ADS_OLPE_WHATSAPP_LABEL,
    },
  }
  const label = (region !== 'general' ? regional[region]?.[channel] : undefined) || general[channel] || ''
  return /^[\w-]+$/.test(label) ? label : null
}
const denied = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}
export function startBeratungTracking() {
  function sync() {
    const settings = config()
    const win = window as TagWindow
    if (!hasAdsConsent()) {
      if (initialized) win.gtag?.('consent', 'update', denied)
      return
    }
    getLeadAttribution()
    if (!settings) return
    if (!initialized) {
      win.dataLayer = win.dataLayer || []
      win.gtag = function () {
        win.dataLayer!.push(arguments)
      }
      win.gtag('consent', 'default', denied)
      win.gtag('js', new Date())
    }
    win.gtag?.('consent', 'update', {
      ...denied,
      ad_storage: 'granted',
      ad_user_data: 'granted',
    })
    if (!initialized) {
      win.gtag?.('config', settings.id, {
        send_page_view: false,
        page_location: `${window.location.origin}/beratung`,
        page_referrer: '',
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      })
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.id}`
      document.head.appendChild(script)
      initialized = true
    }
  }
  sync()
  window.addEventListener(ADS_CONSENT_EVENT, sync)
  window.addEventListener('storage', sync)
  return () => {
    window.removeEventListener(ADS_CONSENT_EVENT, sync)
    window.removeEventListener('storage', sync)
  }
}
export function trackBeratungLead(leadId: string, region: LeadRegion = 'general') {
  const settings = config()
  const label = conversionLabel('form', region)
  if (!settings || !label || !initialized || !hasAdsConsent() || sentLeads.has(leadId))
    return
  const win = window as TagWindow
  if (!win.gtag) return
  win.gtag('event', 'conversion', {
    send_to: `${settings.id}/${label}`,
    transaction_id: leadId,
    page_location: `${window.location.origin}/beratung`,
    page_title: 'Beratungsanfrage',
  })
  sentLeads.add(leadId)
}

// Secondary signals only: these clicks do not create CRM leads or confirm a conversation.
export function trackBeratungContact(channel: ContactChannel, region: LeadRegion = 'general') {
  const settings = config()
  const label = conversionLabel(channel, region)
  if (!settings || !label || !initialized || !hasAdsConsent()) return
  ;(window as TagWindow).gtag?.('event', 'conversion', {
    send_to: `${settings.id}/${label}`,
    page_location: `${window.location.origin}/beratung`,
    page_title: 'Beratung Kontakt',
    contact_channel: channel,
    contact_placement: 'direct_contact',
    region,
  })
}
