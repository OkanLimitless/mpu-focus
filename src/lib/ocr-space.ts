// Lightweight OCR.space client (URL mode) with concurrency control

type OcrOptions = {
  language?: string // e.g., 'eng', 'deu'
  isOverlayRequired?: boolean
  OCREngine?: 1 | 2
}

export type OcrResult = {
  success: boolean
  text?: string
  error?: string
  raw?: any
}

const OCR_ENDPOINT = 'https://api.ocr.space/parse/image'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// Simple concurrency pool
async function withConcurrency<T>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<any>) {
  const results: any[] = new Array(items.length)
  let nextIndex = 0
  async function run() {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) break
      try {
        results[i] = await worker(items[i], i)
      } catch (e) {
        results[i] = { success: false, error: (e as any)?.message || 'Unknown error' }
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, limit) }, run)
  await Promise.all(workers)
  return results
}

export async function ocrSpaceParseImageUrl(imageUrl: string, opts: OcrOptions = {}): Promise<OcrResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'
  const form = new FormData()
  form.append('apikey', apiKey)
  form.append('url', imageUrl)
  if (opts.language) form.append('language', opts.language)
  if (opts.isOverlayRequired) form.append('isOverlayRequired', 'true')
  // Engine 2 is usually better; free key may force defaults
  if (opts.OCREngine) form.append('OCREngine', String(opts.OCREngine))

  const resp = await fetch(OCR_ENDPOINT, { method: 'POST', body: form as any })
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    return { success: false, error: `HTTP ${resp.status}: ${t?.slice(0, 200)}` }
  }
  const json: any = await resp.json().catch(() => ({}))
  const errored = json?.IsErroredOnProcessing
  if (errored) {
    const msg = (json?.ErrorMessage && (Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join('; ') : String(json.ErrorMessage))) || json?.ErrorDetails || 'Unknown OCR error'
    return { success: false, error: msg, raw: json }
  }
  const parsedText = json?.ParsedResults?.[0]?.ParsedText || ''
  return { success: true, text: parsedText, raw: json }
}

export async function ocrSpaceParseImagesBatch(imageUrls: string[], opts: OcrOptions & { concurrency?: number; delayMs?: number } = {}) {
  const limit = Math.max(1, Math.min(10, opts.concurrency ?? parseInt(process.env.OCR_SPACE_CONCURRENCY || '5', 10) || 5))
  const delayMs = Math.max(0, opts.delayMs ?? parseInt(process.env.OCR_SPACE_DELAY_MS || '150', 10) || 150)
  let counter = 0
  return withConcurrency(imageUrls, limit, async (url, idx) => {
    // small paced delay to avoid burst rate limits
    if (delayMs > 0 && counter++ > 0) await sleep(delayMs)
    return ocrSpaceParseImageUrl(url, opts)
  })
}

