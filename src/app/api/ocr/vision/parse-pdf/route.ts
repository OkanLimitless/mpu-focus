import { NextRequest } from 'next/server'
import { getStorageClient, runVisionPdfOcr, deleteGcsFilesByPrefix, deleteGcsFile } from '@/lib/gcp'
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
          // Sanitize bucket envs (strip gs:// and slashes)
          const sanitizeBucket = (v?: string) => (v || '').replace(/^gs:\/\//, '').replace(/^\//, '').replace(/\/$/, '')
          const inputBucket = sanitizeBucket(process.env.GCS_INPUT_BUCKET)
          const outputBucket = sanitizeBucket(process.env.GCS_OUTPUT_BUCKET)
          if (!inputBucket || !outputBucket) throw new Error('GCS_INPUT_BUCKET and GCS_OUTPUT_BUCKET must be set')

          const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const inputKey = `uploads/${jobId}/${(fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`
          const gcsInputUri = gcsUri && gcsUri.startsWith('gs://') ? gcsUri : `gs://${inputBucket}/${inputKey}`
          const outPrefix = (process.env.GCS_OUTPUT_PREFIX || 'vision-out').replace(/\/$/, '')
          const gcsOutputUri = `gs://${outputBucket}/${outPrefix}/${jobId}/`
          console.log('[VisionOCR] inputBucket:', inputBucket, 'outputBucket:', outputBucket)
          console.log('[VisionOCR] gcsInputUri:', gcsInputUri)
          console.log('[VisionOCR] gcsOutputUri:', gcsOutputUri)
          send({ step: 'Upload', progress: 4, message: `GCS buckets resolved: in=${inputBucket} out=${outputBucket}` })

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
              console.log('[VisionOCR] Fetching PDF via proxy:', proxied)
              resp = await fetch(proxied, { signal: controller.signal, headers: { 'User-Agent': 'MPU-Focus-App/1.0' } })
            } finally {
              clearTimeout(to)
            }
            if (!resp.ok) throw new Error(`Failed to download PDF: ${resp.status}`)
            const buf = await resp.arrayBuffer()
            console.log('[VisionOCR] Downloaded PDF bytes:', buf.byteLength)
            logStep('Upload', 10, `Downloaded ${Math.round(buf.byteLength / 1024 / 1024)} MB. Uploading to GCS...`)
            // Probe write to verify permissions (fallback to signed URL if stream upload fails)
            const probePath = `uploads/${jobId}/_probe.txt`
            const probeData = new TextEncoder().encode('ok')
            let probeOk = false
            try {
              await storage.bucket(inputBucket).file(probePath).save(probeData, { contentType: 'text/plain', resumable: false, public: false })
              probeOk = true
              console.log('[VisionOCR] Probe write succeeded (stream)')
              send({ step: 'Upload', progress: 12, message: 'GCS write probe succeeded.' })
            } catch (e: any) {
              console.error('[VisionOCR] Probe write failed (stream):', e?.message || e)
              // Fallback: Signed URL write
              try {
                const fileRef = storage.bucket(inputBucket).file(probePath)
                // @ts-ignore - getSignedUrl supports v4 write
                const [signedUrl] = await fileRef.getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 5 * 60 * 1000, contentType: 'text/plain' })
                const putResp = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: probeData })
                if (!putResp.ok) throw new Error(`Signed URL probe write failed: ${putResp.status}`)
                probeOk = true
                console.log('[VisionOCR] Probe write via signed URL succeeded')
                send({ step: 'Upload', progress: 12, message: 'GCS write probe via signed URL succeeded.' })
              } catch (e2: any) {
                console.error('[VisionOCR] Probe write via signed URL failed:', e2?.message || e2)
                send({ step: 'Error', progress: 0, message: `GCS probe failed: ${e?.message || e} | ${e2?.message || e2}`, error: true })
                return
              }
            }

            // Upload PDF with timeout guard; fallback to signed URL if needed
            const uploadTimeoutMs = 180_000
            let uploaded = false
            try {
              const uploadPromise = storage.bucket(inputBucket).file(inputKey).save(new Uint8Array(buf), { contentType: 'application/pdf', resumable: false, public: false })
              const timedOut = new Promise((_, rej) => setTimeout(() => rej(new Error(`GCS upload timeout after ${uploadTimeoutMs}ms`)), uploadTimeoutMs))
              await Promise.race([uploadPromise, timedOut])
              uploaded = true
              console.log('[VisionOCR] Saved to GCS (stream):', `gs://${inputBucket}/${inputKey}`)
            } catch (e: any) {
              console.error('[VisionOCR] Stream upload failed:', e?.message || e)
              // Fallback to signed URL upload
              try {
                const fileRef = storage.bucket(inputBucket).file(inputKey)
                // @ts-ignore
                const [signedUrl] = await fileRef.getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 5 * 60 * 1000, contentType: 'application/pdf' })
                const putResp = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: new Uint8Array(buf) })
                if (!putResp.ok) throw new Error(`Signed URL upload failed: ${putResp.status}`)
                uploaded = true
                console.log('[VisionOCR] Saved to GCS via signed URL:', `gs://${inputBucket}/${inputKey}`)
              } catch (e2: any) {
                console.error('[VisionOCR] Signed URL upload failed:', e2?.message || e2)
                send({ step: 'Error', progress: 0, message: `GCS upload failed: ${e?.message || e} | ${e2?.message || e2}`, error: true })
                return
              }
            }

            if (uploaded) {
              logStep('Upload', 15, 'Upload to GCS complete.')
            }
          }

          logStep('Vision OCR', 20, 'Starting Google Cloud Vision OCR (PDF)...')
          const { texts, fullText, pages } = await runVisionPdfOcr({ gcsInputUri, gcsOutputUri, batchSize: 20 })
          console.log('[VisionOCR] OCR pages extracted:', pages)
          logStep('Vision OCR', 70, `OCR complete. ${pages} pages extracted.`)

          // LLM structuring (text mode) with page markers for better references
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          const markedText = texts.map((t, idx) => `--- PAGINA ${idx + 1} ---\n${(t || '').trim()}`).join('\n\n')
          const systemPrompt = `Je bent een professionele analist van Duitse juridische/bestuursrechtelijke documenten (MPU-context). Baseer ALLES uitsluitend op de OCR-tekst. Output in het Nederlands. Gebruik korte exacte Duitse citaten. Voeg bij elk feit paginaverwijzingen toe (gebruik de PAGINA-markers). Markeer ontbrekende gegevens als "Niet vermeld" of "Onzeker". Geen hallucinaties.`
          const userPrompt = `OCR-INVOER MET PAGINAMARKERS (totaal ${pages} pagina's):\n\n${markedText}\n\nOPDRACHT: Maak een gestructureerd rapport volgens dit strikte format:\n\nMPU Rapport / Dossieroverzicht\nDocumentinformatie\n- Bestandsnaam: …\n- Datum generatie rapport: …\n- Opmerking extractie: Systematische inventarisatie van meegeleverde pagina’s; ontbrekende gegevens gemarkeerd als \"Niet vermeld\".\n\nPersoonlijke Gegevens / Identificatie\n- Naam: …\n- Geboortedatum: …\n- Adres (vermeld in dossier): …\n- Rijbewijsnummer(s) in dossier: …\n- Totaal aantal punten (FAER): …\n- Belangrijkste aktenzeichen / dossiernummers: …\n\nOverzicht van Delicten / Sachverhalt (één blok per delict)\nDelict N: [korte titel + jaartal]\n- Pagina(s) bron: …\n- Wat is er gebeurd? …\n- Duits citaat ter onderbouwing: \"…\"\n- Wanneer? … (datums)\n- Waar / bevoegde instantie? …\n- Aktenzeichen: …\n- Wetsverwijzing(en): … (bijv. §-verwijzingen BtMG/StVG/StGB)\n- Boete / straf / maatregelen: … (geldstraf, Freiheitsstrafe, Fahrverbot/Entzug, MPU-verplichting)\n- Punten (Flensburg): …\n- Alcohol / Drugs / Bloedwaarden: … (met exacte waarden en citaten)\n- Overige maatregelen / status: … (kort)\n\nAlgemene Gegevens & Aanvullende Documenten\n- Overzicht overige relevante stukken (toxicologie, Führungszeugnis, ordonnanties, correspondentie) met kerncitaat + pagina.\n\nBelangrijke geciteerde fragmenten (kort)\n- \"…\" — Pagina X\n- \"…\" — Pagina Y\n\nSamenvatting & Aanbevelingen\n- Chronologische kernpunten (kort)\n- Belangrijk voor MPU-voorbereiding: …\n- Aanbevolen vervolg: …\n\nRegels:\n1) Geen verzinsels; schrijf \"Niet vermeld\" waar data ontbreekt.\n2) Voeg bij elk feit een Pagina-verwijzing (op basis van inputmarkers).\n3) Gebruik korte Duitse citaten om cruciale velden te staven.\n4) Wees volledig en systematisch zoals in het format.`

          logStep('AI Analysis', 80, 'Structuring OCR text with AI...')
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ],
            max_completion_tokens: 7000,
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

          // Best-effort cleanup of temporary artifacts (time-bounded)
          try {
            logStep('Cleanup', 90, 'Cleaning up temporary OCR artifacts...')
            const outputPrefix = `${outPrefix}/${jobId}/`.replace(/\/+/, '/').replace(/^\//, '')
            const cleanupOutput = deleteGcsFilesByPrefix(outputBucket, outputPrefix)
            const cleanupInput = deleteGcsFile(inputBucket, inputKey)
            const withTimeout = (p: Promise<any>, ms: number) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('cleanup-timeout')), ms))])
            await Promise.all([
              withTimeout(cleanupOutput, 8000).catch(e => console.warn('[VisionOCR] output cleanup:', e?.message || e)),
              withTimeout(cleanupInput, 5000).catch(e => console.warn('[VisionOCR] input cleanup:', e?.message || e)),
            ])
          } catch (e) {
            console.warn('[VisionOCR] Cleanup step failed (ignored):', (e as any)?.message || e)
          }

          logStep('Complete', 100, 'Processing completed successfully.')
          send({ result })
          controller.close()
        } catch (e: any) {
          send({ step: 'Error', progress: 0, message: e?.message || 'Processing failed', error: true })
          // Attempt cleanup on failure (best-effort)
          try {
            if (typeof inputBucket === 'string' && typeof inputKey === 'string') {
              await deleteGcsFile(inputBucket, inputKey)
            }
            if (typeof outputBucket === 'string' && typeof outPrefix === 'string' && typeof jobId === 'string') {
              const outputPrefix = `${outPrefix}/${jobId}/`.replace(/\/+/, '/').replace(/^\//, '')
              await deleteGcsFilesByPrefix(outputBucket, outputPrefix)
            }
          } catch {}
          controller.close()
        }
      }
      run()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })
}
