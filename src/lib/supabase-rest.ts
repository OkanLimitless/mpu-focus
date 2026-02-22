type QueryValue = string | number | boolean | null | undefined

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL
  if (!url) {
    throw new Error('SUPABASE_URL is not configured')
  }
  return url
}

function getApiKey(useServiceRole: boolean): string {
  if (useServiceRole) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
    }
    return serviceKey
  }

  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not configured')
  }
  return anonKey
}

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

function parseContentRangeCount(contentRange: string | null): number {
  if (!contentRange) return 0
  const total = contentRange.split('/')[1]
  const parsed = Number(total)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function supabaseRest<T = unknown>(params: {
  path: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  useServiceRole?: boolean
  prefer?: string
  extraHeaders?: Record<string, string>
}): Promise<{ data: T; response: Response }> {
  const method = params.method ?? 'GET'
  const useServiceRole = params.useServiceRole ?? false
  const baseUrl = getSupabaseUrl()
  const apiKey = getApiKey(useServiceRole)
  const url = `${baseUrl}/rest/v1/${withQuery(params.path, params.query)}`

  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    ...params.extraHeaders,
  }

  if (params.prefer) {
    headers.Prefer = params.prefer
  }

  if (params.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
    cache: 'no-store',
  })

  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase request failed (${response.status})`
    throw new Error(message)
  }

  return { data: data as T, response }
}

export async function supabaseCount(params: {
  path: string
  query?: Record<string, QueryValue>
  useServiceRole?: boolean
}): Promise<number> {
  const { response } = await supabaseRest({
    path: params.path,
    method: 'GET',
    query: {
      ...(params.query || {}),
      select: 'id',
      limit: 1,
    },
    useServiceRole: params.useServiceRole,
    prefer: 'count=exact',
  })

  return parseContentRangeCount(response.headers.get('content-range'))
}
