import { NextRequest, NextResponse } from 'next/server'
import { ocrSpaceParseImagesBatch } from '@/lib/ocr-space'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, language = 'deu', isOverlayRequired = false, concurrency, delayMs } = await request.json()
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'imageUrls array required' }, { status: 400 })
    }

    const results = await ocrSpaceParseImagesBatch(imageUrls, { language, isOverlayRequired, concurrency, delayMs, OCREngine: 2 })
    const texts = results.map((r: any) => (r?.success ? (r.text as string || '') : ''))
    const errors = results.map((r: any, i: number) => (r?.success ? null : { index: i, error: r?.error || 'Unknown error' })).filter(Boolean)

    return NextResponse.json({
      success: errors.length === 0,
      count: imageUrls.length,
      texts,
      errors,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

