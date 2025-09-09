import { NextRequest } from 'next/server'
import { getStorageClient, runVisionPdfOcr } from '@/lib/gcp'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      const logStep = (step: string, progress: number, message: string) => send({ step, progress, message })

      const run = async () => {
        try {
          const { pdfUrl, gcsUri, fileName } = await request.json()
          if (!pdfUrl && !gcsUri) throw new Error('pdfUrl or gcsUri is required')

          // Prepare GCS input/output URIs
          const storage = await getStorageClient()
          const inputBucket = process.env.GCS_INPUT_BUCKET as string
          const outputBucket = process.env.GCS_OUTPUT_BUCKET as string
          if (!inputBucket || !outputBucket) throw new Error('GCS_INPUT_BUCKET and GCS_OUTPUT_BUCKET must be set')

          const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const inputKey = `uploads/${jobId}/${(fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`
          const gcsInputUri = gcsUri && gcsUri.startsWith('gs://') ? gcsUri : `gs://${inputBucket}/${inputKey}`
          const outPrefix = (process.env.GCS_OUTPUT_PREFIX || 'vision-out').replace(/\/$/, '')
          const gcsOutputUri = `gs://${outputBucket}/${outPrefix}/${jobId}/`

          if (!gcsUri) {
            logStep('Upload', 5, 'Uploading PDF to Google Cloud Storage...')
            // Prefer proxy to avoid protected hosts
            const baseOrigin = (
              process.env.EXTERNAL_PUBLIC_BASE_URL
              || process.env.NEXT_PUBLIC_APP_URL
              || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
              || (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : '')
              || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
              || new URL(request.url).origin
            )
            const proxied = `${baseOrigin}/api/documents/proxy?url=${encodeURIComponent(pdfUrl)}`
            const controller = new AbortController()
            const to = setTimeout(() => controller.abort(), 120_000)
            let resp: Response
            try {
              resp = await fetch(proxied, { signal: controller.signal, headers: { 'User-Agent': 'MPU-Focus-App/1.0' } })
            } finally {
              clearTimeout(to)
            }
            if (!resp.ok) throw new Error(`Failed to download PDF: ${resp.status}`)
            const arr = new Uint8Array(await resp.arrayBuffer())
            await storage.bucket(inputBucket).file(inputKey).save(arr, { contentType: 'application/pdf', resumable: false, public: false })
            logStep('Upload', 12, 'Upload to GCS complete.')
          }

          logStep('Vision OCR', 15, 'Starting Google Cloud Vision OCR (PDF)...')
          const { texts, fullText, pages } = await runVisionPdfOcr({ gcsInputUri, gcsOutputUri, batchSize: 20 })
          logStep('Vision OCR', 70, `OCR complete. ${pages} pages extracted.`)

          // LLM structuring (text mode)
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          const systemPrompt = `Je bent een professionele analist van Duitse officiële juridische documenten (MPU-context). Gebruik de GEGEVEN OCR-TEKST hieronder (geen afbeeldingen) als bron. Rapporteer de output in het Nederlands. Voeg paginaverwijzingen toe indien duidelijk, markeer ontbrekende gegevens als "Niet vermeld" en voeg korte Duitse citaten waar relevant.`
          const userPrompt = `OCR-TEKST (geconcateneerd over ${pages} pagina's):\n\n${fullText}\n\nOPDRACHT: Structureer deze gegevens zoals eerder afgesproken (Overzicht van delicten, Algemene gegevens, citaten, paginaverwijzingen). Wees volledig en systematisch.`

          logStep('AI Analysis', 80, 'Structuring OCR text with AI...')
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ],
            max_completion_tokens: 6000,
          })
          const extractedData = completion.choices[0]?.message?.content || ''

          const result = {
            fileName: fileName || 'document.pdf',
            totalPages: pages,
            extractedData,
            processingMethod: 'Google Vision (PDF OCR) + LLM',
            timestamp: new Date().toISOString(),
            supportsPDFGeneration: true,
          }

          logStep('Complete', 100, 'Processing completed successfully.')
          send({ result })
          controller.close()
        } catch (e: any) {
          send({ step: 'Error', progress: 0, message: e?.message || 'Processing failed', error: true })
          controller.close()
        }
      }
      run()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })
}
