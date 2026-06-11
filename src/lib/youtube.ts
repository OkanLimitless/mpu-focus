const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

export function parseYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null
  const value = input.trim()
  if (!value) return null
  if (YOUTUBE_ID_PATTERN.test(value)) return value

  let url: URL
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^(www|m|music)\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || ''
    return YOUTUBE_ID_PATTERN.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = url.searchParams.get('v')
    if (fromQuery && YOUTUBE_ID_PATTERN.test(fromQuery)) return fromQuery

    const segments = url.pathname.split('/').filter(Boolean)
    if (['embed', 'shorts', 'live', 'v'].includes(segments[0]) && segments[1] && YOUTUBE_ID_PATTERN.test(segments[1])) {
      return segments[1]
    }
  }

  return null
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function youtubeThumbnailUrl(videoId?: string | null): string | null {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}

function parseIsoDurationSeconds(value?: string | null): number | null {
  if (!value) return null
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)
  return seconds > 0 ? seconds : null
}

/**
 * Reads the video duration via the YouTube Data API when YOUTUBE_API_KEY is
 * configured. Without a key this returns null and the duration is backfilled
 * from the player the first time the video is watched.
 */
export async function fetchYouTubeDurationSeconds(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(videoId)}&key=${apiKey}`,
      { cache: 'no-store' },
    )
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    return parseIsoDurationSeconds(payload?.items?.[0]?.contentDetails?.duration)
  } catch {
    return null
  }
}
