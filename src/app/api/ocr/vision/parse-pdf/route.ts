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
      const logDebug = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
        console.log(`[VisionOCR][${level.toUpperCase()}]`, message, data || '')
        send({ log: { level, message, timestamp: new Date().toISOString(), data: data ? JSON.stringify(data).slice(0, 500) : undefined } })
      }

      const run = async () => {
        // Hoist variables for cleanup access in catch
        let inputBucket: string | undefined
        let outputBucket: string | undefined
        let inputKey: string | undefined
        let outPrefix: string | undefined
        let jobId: string | undefined
        try {
          const { pdfUrl, gcsUri, fileName } = await request.json()
          if (!pdfUrl && !gcsUri) throw new Error('pdfUrl or gcsUri is required')

          // Prepare GCS input/output URIs
          const storage = await getStorageClient()
          // Sanitize bucket envs (strip gs:// and slashes)
          const sanitizeBucket = (v?: string) => (v || '').replace(/^gs:\/\//, '').replace(/^\//, '').replace(/\/$/, '')
          inputBucket = sanitizeBucket(process.env.GCS_INPUT_BUCKET)
          outputBucket = sanitizeBucket(process.env.GCS_OUTPUT_BUCKET)
          if (!inputBucket || !outputBucket) throw new Error('GCS_INPUT_BUCKET and GCS_OUTPUT_BUCKET must be set')

          jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          inputKey = `uploads/${jobId}/${(fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`
          const gcsInputUri = gcsUri && gcsUri.startsWith('gs://') ? gcsUri : `gs://${inputBucket}/${inputKey}`
          outPrefix = (process.env.GCS_OUTPUT_PREFIX || 'vision-out').replace(/\/$/, '')
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
            await storage.bucket(inputBucket!).file(probePath).save(probeData, { contentType: 'text/plain', resumable: false, public: false })
              probeOk = true
              console.log('[VisionOCR] Probe write succeeded (stream)')
              send({ step: 'Upload', progress: 12, message: 'GCS write probe succeeded.' })
            } catch (e: any) {
              console.error('[VisionOCR] Probe write failed (stream):', e?.message || e)
              // Fallback: Signed URL write
              try {
                const fileRef = storage.bucket(inputBucket!).file(probePath)
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
              const uploadPromise = storage.bucket(inputBucket!).file(inputKey!).save(new Uint8Array(buf), { contentType: 'application/pdf', resumable: false, public: false })
              const timedOut = new Promise((_, rej) => setTimeout(() => rej(new Error(`GCS upload timeout after ${uploadTimeoutMs}ms`)), uploadTimeoutMs))
              await Promise.race([uploadPromise, timedOut])
              uploaded = true
              console.log('[VisionOCR] Saved to GCS (stream):', `gs://${inputBucket}/${inputKey}`)
            } catch (e: any) {
              console.error('[VisionOCR] Stream upload failed:', e?.message || e)
              // Fallback to signed URL upload
              try {
                const fileRef = storage.bucket(inputBucket!).file(inputKey!)
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

          // Multi-pass LLM pipeline (fast models) for depth and coverage
          logStep('AI Analysis', 78, 'Indexing and clustering OCR pages...')
          const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`ai-timeout-${ms}`)), ms))])
          const run = async (model: string, messages: any[], maxTokens: number, timeoutMs: number) => withTimeout(openai.chat.completions.create({ model, messages, max_completion_tokens: maxTokens }), timeoutMs)
          const pass1Model = process.env.OCR_PASS1_MODEL || 'gpt-5-nano'
          const pass2Model = process.env.OCR_PASS2_MODEL || 'gpt-5-mini'
          const pass3Model = process.env.OCR_PASS3_MODEL || 'gpt-5-mini'
          const pass4Model = process.env.OCR_PASS4_MODEL || 'gpt-5-nano'
          const clusterConcurrency = Math.max(1, Math.min(4, parseInt(process.env.OCR_CLUSTER_CONCURRENCY || '2', 10) || 2))
          const aiTimeoutMs = Math.max(30000, Math.min(240000, parseInt(process.env.OCR_LLM_TIMEOUT_MS || '120000', 10) || 120000))
          const pass3TimeoutMs = Math.min(240000, Math.max(aiTimeoutMs, 180000)) // consolidation often needs a bit more time
          const clusterProgressBase = 78 // after pass1/vision; keep bar moving through clustering
          const clusterProgressSpan = 16  // finish around 94 before pass3

          send({ phase: 'pass1', status: 'start', model: pass1Model, pages })
          const pass1Sys = 'Je indexeert OCR-tekst (Duits) voor MPU-dossiers. Geef gestructureerde JSON (pages, offense_candidates).'
          const pass1User = `OCR met paginamarkers (totaal ${pages}):\n\n${markedText}\n\nTAKEN:\n1) Per pagina: extraheer namen, datums, Aktenzeichen, §-verwijzingen, bloedwaarden (ng/ml), instanties.\n2) Vind kandidaat-delicten: titel + relevante paginalijst + 1 zin waarom.\n3) JSON output: {\"pages\":[{\"n\":int, \"entities\":{...}}], \"offense_candidates\":[{\"title\":\"…\",\"pages\":[..],\"reason\":\"…\"}]}`
          let idxJson: any = { offense_candidates: [] }
          try {
            logDebug('info', `Starting pass1 with model ${pass1Model}`)
            const idxResp: any = await run(pass1Model, [ { role: 'system', content: pass1Sys }, { role: 'user', content: pass1User } ], 3000, aiTimeoutMs)
            const idxText = idxResp.choices[0]?.message?.content || '{}'
            idxJson = JSON.parse(idxText)
            logDebug('info', 'Pass1 completed successfully', { candidates: idxJson?.offense_candidates?.length || 0 })
          } catch (e: any) {
            logDebug('error', 'Pass1 failed, using fallback clustering', { error: e?.message || String(e) })
            console.error('[VisionOCR] Pass1 error:', e)
          }
          let candidates: { title: string; pages: number[] }[] = Array.isArray(idxJson?.offense_candidates) ? idxJson.offense_candidates : []
          if (!candidates.length) {
            const clusters = [] as any[]
            const maxPagesPer = Math.max(6, Math.min(12, parseInt(process.env.OCR_MAX_CLUSTER_PAGES || '10', 10) || 10))
            for (let i = 0; i < pages; i += maxPagesPer) {
              clusters.push({ title: `Cluster ${Math.floor(i/maxPagesPer)+1}`, pages: Array.from({length: Math.min(maxPagesPer, pages - i)}, (_,k)=> i + k + 1) })
            }
            candidates = clusters
          }
          send({ phase: 'pass1', status: 'done', candidates: candidates.length })

          // Pass 2: Extract delicts per cluster
          send({ phase: 'pass2', status: 'start', model: pass2Model, clusters: candidates.length })
          const pageMap = new Map<number, string>(texts.map((t, i) => [i+1, t || '']))
          const clusterText = (pgs: number[]) => pgs.map(n => `--- PAGINA ${n} ---\n${(pageMap.get(n) || '').trim()}`).join('\n\n')
          const delicts: any[] = []
          let i2 = 0
          const totalClusters = Math.max(1, candidates.length)
          let clustersDone = 0
          const reportClusterProgress = (status: 'ok' | 'fail', title: string) => {
            const pct = clusterProgressBase + Math.min(clusterProgressSpan, Math.round((clustersDone / totalClusters) * clusterProgressSpan))
            send({ step: 'AI Analysis', progress: pct, message: `${status === 'ok' ? 'Cluster' : 'Cluster (retry/skipped)'}: ${title}` })
          }
          const worker = async (): Promise<void> => {
            if (i2 >= candidates.length) return
            const c = candidates[i2++]
            const excerpt = clusterText(c.pages || [])
            const sys = 'Je extraheert één delict uit de gegeven OCR-teksten. JSON output, geen vrije tekst.'
            const usr = `Tekst (pagina's ${JSON.stringify(c.pages)}):\n\n${excerpt}\n\nJSON schema:\n{\"title\":\"\",\"pages\":[],\"what\":\"\",\"when\":\"\",\"where\":\"\",\"case_numbers\":[],\"laws\":[],\"penalties\":\"\",\"points\":\"\",\"blood_values\":\"\",\"status\":\"\",\"quotes\":[{\"quote\":\"\",\"page\":0}]}`
            try {
              send({ phase: 'pass2', status: 'cluster:start', cluster: c.title, pages: c.pages })
              logDebug('info', `Processing cluster: ${c.title}`, { pages: c.pages })
              const r: any = await run(pass2Model, [ { role: 'system', content: sys }, { role: 'user', content: usr } ], 4000, aiTimeoutMs)
              const txt = r.choices[0]?.message?.content || '{}'
              delicts.push(JSON.parse(txt))
              send({ phase: 'pass2', status: 'cluster:done', cluster: c.title })
              logDebug('info', `Cluster ${c.title} completed`)
              clustersDone += 1
              reportClusterProgress('ok', c.title)
            } catch (e: any) {
              const errorMsg = String(e?.message || e)
              logDebug('error', `Cluster ${c.title} failed`, { error: errorMsg })
              send({ phase: 'pass2', status: 'cluster:fail', cluster: c.title, error: errorMsg })
              clustersDone += 1
              reportClusterProgress('fail', c.title)
            }
            await worker()
          }
          await Promise.all(Array.from({ length: Math.min(clusterConcurrency, Math.max(1, candidates.length)) }, () => worker()))
          send({ phase: 'pass2', status: 'done', delicts: delicts.length })

          // Pass 3: Consolidation
          let extractedData = '' // hoist so validation/addendum/result can reuse the consolidated report
          send({ phase: 'pass3', status: 'start', model: pass3Model })
          send({ step: 'AI Analysis', progress: clusterProgressBase + clusterProgressSpan + 1, message: 'Consolideren van delict-JSON...' })
          logDebug('info', `Starting pass3 consolidation with ${delicts.length} delicts`)
          const consSys = 'Je consolideert delict-JSON naar een volledig MPU-rapport (Nederlands) met paginaverwijzingen en korte Duitse citaten.'
          const compactDelicts = (arr: any[]) => arr.map(d => ({
            title: d?.title || '',
            pages: Array.isArray(d?.pages) ? d.pages : [],
            what: (d?.what || '').slice(0, 400),
            when: (d?.when || '').slice(0, 200),
            where: (d?.where || '').slice(0, 200),
            case_numbers: Array.isArray(d?.case_numbers) ? (d.case_numbers as any[]).slice(0, 3) : [],
            laws: Array.isArray(d?.laws) ? (d.laws as any[]).slice(0, 5) : [],
            penalties: (d?.penalties || '').slice(0, 300),
            points: (d?.points || '').slice(0, 120),
            blood_values: (d?.blood_values || '').slice(0, 200),
            status: (d?.status || '').slice(0, 200),
            quotes: Array.isArray(d?.quotes) ? d.quotes.slice(0, 2).map((q: any) => ({ quote: (q?.quote || '').slice(0, 160), page: q?.page })) : []
          }))
          const buildConsUser = (items: any[], note?: string) => {
            const jsonBlock = JSON.stringify(items).slice(0, 180000)
            const metaNote = note ? `\n\nLET OP: ${note}` : ''
            return `DELlCTS(JSON):\n${jsonBlock}\n\nMetadata:\n- Bestandsnaam: ${fileName || 'Niet vermeld'}\n- Totaal pagina's: ${pages}\n- Datum rapport: ${new Date().toLocaleDateString('de-DE')}${metaNote}\n\nGenereer het volledige rapport exact volgens het format.`
          }
          const consAttempts = [
            { model: pass3Model, timeout: pass3TimeoutMs, payload: delicts, note: undefined as string | undefined, label: 'primary' },
            { model: process.env.OCR_PASS3_FALLBACK_MODEL || pass3Model || 'gpt-5-nano', timeout: Math.min(pass3TimeoutMs + 60000, 240000), payload: compactDelicts(delicts), note: 'Compacte input na time-out; gebruik alleen deze feiten en geen aannames.' }
          ]
          let consError: any
          for (let attempt = 0; attempt < consAttempts.length; attempt++) {
            const { model, timeout, payload, note, label } = consAttempts[attempt]
            const attemptName = `pass3-${attempt + 1}-${label}`
            if (attempt > 0) {
              send({ phase: 'pass3', status: 'retry', attempt: attempt + 1, model, reason: consError?.message || 'retry' })
              logDebug('warn', 'Pass3 retrying', { attempt: attempt + 1, model, timeout })
            }
            const consUsr = buildConsUser(payload, note)
            try {
              const consResp: any = await run(model, [ { role: 'system', content: consSys }, { role: 'user', content: consUsr } ], 6000, timeout)
              extractedData = consResp.choices[0]?.message?.content || ''
              send({ phase: 'pass3', status: 'done', outputChars: extractedData.length, attempt: attempt + 1 })
              logDebug('info', 'Pass3 completed', { attempt: attemptName, outputLength: extractedData.length })
              send({ step: 'AI Analysis', progress: clusterProgressBase + clusterProgressSpan + 4, message: 'Validatie-addendum voorbereiden...' })
              consError = null
              break
            } catch (e: any) {
              consError = e
              logDebug('error', 'Pass3 failed', { attempt: attemptName, error: e?.message || String(e) })
            }
          }
          if (!extractedData) {
            throw consError || new Error('Pass3 failed after retries')
          }

          // Pass 4: Validation addendum
          send({ phase: 'pass4', status: 'start', model: pass4Model })
          send({ step: 'AI Analysis', progress: clusterProgressBase + clusterProgressSpan + 6, message: 'Validatie-addendum genereren...' })
          const valSys = 'Je valideert dekking en geeft alleen een kort ADDENDUM met ontbrekende items (of: Geen addendum noodzakelijk).'
          const valUsr = `RAPPORT:\n${extractedData.slice(0, 180000)}\n\nTAKEN: 1) Lijst ontbrekende verplichte velden/secties. 2) Kort ADDENDUM alleen met ontbrekende items; anders: \"Geen addendum noodzakelijk\".`
          try {
            const valResp: any = await run(pass4Model, [ { role: 'system', content: valSys }, { role: 'user', content: valUsr } ], 2000, aiTimeoutMs)
            const addendum = valResp.choices[0]?.message?.content?.trim()
            if (addendum && !/Geen addendum noodzakelijk/i.test(addendum)) {
              extractedData += `\n\n---\nADDENDUM (dekking & ontbrekende velden)\n\n${addendum}`
            }
            send({ phase: 'pass4', status: 'done' })
            send({ step: 'AI Analysis', progress: 99, message: 'Rapport afronden...' })
          } catch (e: any) {
            logDebug('warn', 'Pass4 validation skipped', { error: e?.message || String(e) })
            send({ phase: 'pass4', status: 'skip', error: String(e?.message || e) })
          }

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

            // Also delete the original UploadThing PDF to avoid storage buildup
            if (pdfUrl) {
              try {
                const isUT = (u: string) => {
                  try { const h = new URL(u).hostname; return h.endsWith('.utfs.io') || h.endsWith('.ufs.sh') || h === 'utfs.io' || h === 'ufs.sh' } catch { return false }
                }
                if (isUT(pdfUrl)) {
                  send({ step: 'Cleanup', progress: 92, message: 'Deleting original uploaded PDF…' })
                  const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload')
                  await withTimeout(deleteUploadThingFiles([pdfUrl]), 8000).catch(e => console.warn('[VisionOCR] UT delete failed:', e?.message || e))
                }
              } catch (e: any) {
                console.warn('[VisionOCR] UploadThing cleanup skipped:', e?.message || e)
              }
            }
          } catch (e) {
            console.warn('[VisionOCR] Cleanup step failed (ignored):', (e as any)?.message || e)
          }

          logStep('Complete', 100, 'Processing completed successfully.')
          send({ result })
          controller.close()
        } catch (e: any) {
          const errorMsg = e?.message || 'Processing failed'
          logDebug('error', 'Processing failed', { error: errorMsg, stack: e?.stack })
          console.error('[VisionOCR] Fatal error:', e)
          send({ step: 'Error', progress: 0, message: errorMsg, error: true, log: { level: 'error', message: errorMsg, timestamp: new Date().toISOString() } })
          // Attempt cleanup on failure (best-effort)
          try {
            if (typeof inputBucket === 'string' && typeof inputKey === 'string') {
              await deleteGcsFile(inputBucket, inputKey)
            }
            if (typeof outputBucket === 'string' && typeof outPrefix === 'string' && typeof jobId === 'string') {
              const outputPrefix = `${outPrefix}/${jobId}/`.replace(/\/+/, '/').replace(/^\//, '')
              await deleteGcsFilesByPrefix(outputBucket, outputPrefix)
            }
            // Also try to delete the original UploadThing PDF if present
            try {
              const { pdfUrl } = await request.clone().json()
              const isUT = (u: string) => {
                try { const h = new URL(u).hostname; return h.endsWith('.utfs.io') || h.endsWith('.ufs.sh') || h === 'utfs.io' || h === 'ufs.sh' } catch { return false }
              }
              if (pdfUrl && isUT(pdfUrl)) {
                const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload')
                await deleteUploadThingFiles([pdfUrl]).catch(() => null)
              }
            } catch {}
          } catch {}
          controller.close()
        }
      }
      run()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })
}
