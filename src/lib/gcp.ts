import type { protos } from '@google-cloud/vision'

export function getGcpCredentials() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL || ''
  let privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY || ''
  // Replace escaped newlines
  privateKey = privateKey.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Google Cloud credentials environment variables')
  }
  return { projectId, client_email: clientEmail, private_key: privateKey }
}

export async function getVisionClient() {
  const creds = getGcpCredentials()
  const vision = await import('@google-cloud/vision')
  const client = new vision.ImageAnnotatorClient({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    projectId: creds.projectId,
  })
  return client
}

export async function getStorageClient() {
  const creds = getGcpCredentials()
  const { Storage } = await import('@google-cloud/storage')
  const storage = new Storage({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    projectId: creds.projectId,
  })
  return storage
}

export function parseLanguageHints(): string[] | undefined {
  const hints = (process.env.VISION_LANGUAGE_HINTS || '').trim()
  if (!hints) return undefined
  return hints.split(',').map(s => s.trim()).filter(Boolean)
}

export type VisionOcrResult = {
  texts: string[]
  fullText: string
  pages: number
}

export async function runVisionPdfOcr(params: { gcsInputUri: string; gcsOutputUri: string; batchSize?: number }) {
  const { gcsInputUri, gcsOutputUri, batchSize = 10 } = params
  const client = await getVisionClient()
  const features: protos.google.cloud.vision.v1.IFeature[] = [{ type: 'DOCUMENT_TEXT_DETECTION' }]
  const languageHints = parseLanguageHints()

  const request: protos.google.cloud.vision.v1.IAsyncBatchAnnotateFilesRequest = {
    requests: [
      {
        inputConfig: { mimeType: 'application/pdf', gcsSource: { uri: gcsInputUri } },
        features,
        imageContext: languageHints ? { languageHints } : undefined,
        outputConfig: {
          gcsDestination: { uri: gcsOutputUri.endsWith('/') ? gcsOutputUri : gcsOutputUri + '/' },
          batchSize,
        },
      },
    ],
  }

  const [operation] = await client.asyncBatchAnnotateFiles(request)
  await operation.promise()

  // After operation completes, results are written to gcsOutputUri
  const storage = await getStorageClient()
  const uri = new URL(gcsOutputUri)
  const bucketName = uri.hostname
  const prefix = (uri.pathname.startsWith('/') ? uri.pathname.slice(1) : uri.pathname).replace(/\/$/, '') + '/'

  console.log('[VisionOCR] Listing output files in', `gs://${bucketName}/${prefix}`)
  const [files] = await storage.bucket(bucketName).getFiles({ prefix })
  const jsonFiles = files.filter(f => f.name.endsWith('.json'))
  jsonFiles.sort((a, b) => a.name.localeCompare(b.name))
  console.log('[VisionOCR] Output files found:', files.length, 'JSON files:', jsonFiles.length)

  const texts: string[] = []
  for (const f of jsonFiles) {
    const [buf] = await f.download()
    const data = JSON.parse(buf.toString('utf8'))
    const responses = data.responses || []
    for (const r of responses) {
      const t = r?.fullTextAnnotation?.text || ''
      if (t) texts.push(t)
    }
  }
  const fullText = texts.join('\n\n')
  return { texts, fullText, pages: texts.length } as VisionOcrResult
}

// Best-effort cleanup helpers
export async function deleteGcsFilesByPrefix(bucketName: string, prefix: string) {
  const storage = await getStorageClient()
  const normalized = prefix.replace(/^\//, '')
  console.log('[VisionOCR] Deleting files by prefix:', `gs://${bucketName}/${normalized}`)
  try {
    await storage.bucket(bucketName).deleteFiles({ prefix: normalized })
    return { success: true }
  } catch (e: any) {
    console.warn('[VisionOCR] deleteFiles failed:', e?.message || e)
    return { success: false, error: e?.message || String(e) }
  }
}

export async function deleteGcsFile(bucketName: string, key: string) {
  const storage = await getStorageClient()
  const normalized = key.replace(/^\//, '')
  console.log('[VisionOCR] Deleting file:', `gs://${bucketName}/${normalized}`)
  try {
    await storage.bucket(bucketName).file(normalized).delete({ ignoreNotFound: true } as any)
    return { success: true }
  } catch (e: any) {
    console.warn('[VisionOCR] delete file failed:', e?.message || e)
    return { success: false, error: e?.message || String(e) }
  }
}
