import OpenAI from 'openai'
import DOMPurify from 'isomorphic-dompurify'
import { uploadBufferToR2 } from '@/lib/r2'

// GPT prompt for generating professional PDF template
const PDF_GENERATION_PROMPT = `
You are a professional document formatter specializing in German legal and MPU (Medizinisch-Psychologische Untersuchung) documentation. Your task is to convert extracted MPU document data into a beautifully formatted HTML template that will be converted to PDF.

CRITICAL REQUIREMENTS:
1. Output ONLY valid HTML (no markdown, no explanations, no backticks)
2. Use INLINE STYLES for all formatting (no external CSS)
3. Create a complete HTML document with <!DOCTYPE html>, <html>, <head>, and <body>
4. Use black text on white background for PDF compatibility
5. Handle missing or incomplete data gracefully

HTML STRUCTURE REQUIREMENTS:
- Start with: <!DOCTYPE html><html><head><title>MPU Report</title></head><body>
- Use inline styles only (style="..." attributes)
- Use standard fonts: Arial, Helvetica, sans-serif
- Use absolute units (px, pt) not relative units (em, rem, %)
- End with: </body></html>

STYLING REQUIREMENTS:
- Body: style="font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; font-size: 14px; line-height: 1.5;"
- Headers: style="color: #000; margin: 20px 0 10px 0; font-weight: bold;"
- Sections: style="margin: 15px 0; padding: 10px; border: 1px solid #ccc;"
- Text: style="color: #000; margin: 5px 0;"

CONTENT STRUCTURE:
1. Document Header (Title, Generation Date)
2. Personal Information Section
3. Offenses Overview - each offense in separate div
4. Summary section

DATA HANDLING:
- If data is missing, display "Niet vermeld"
- Use clear, readable formatting
- Separate each offense clearly
- Use proper German/Dutch terminology

Generate a complete, self-contained HTML document that will render properly when converted to PDF.
`;

type GenerateParams = {
  extractedData: string
  fileName?: string
  userName?: string
}

export async function generatePdfFromExtractedData(params: GenerateParams) {
  const { extractedData, fileName, userName } = params

  if (!extractedData) throw new Error('No extracted data provided')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: PDF_GENERATION_PROMPT },
      {
        role: 'user',
        content: `Convert the following extracted MPU document data into a professional HTML template for PDF generation:\n\nEXTRACTED DATA:\n${extractedData}\n\nDOCUMENT INFO:\n- ${userName ? `User: ${userName}\n- ` : ''}Original filename: ${fileName || 'Unknown'}\n- Generation date: ${new Date().toLocaleDateString('de-DE')}\n\nPlease generate a complete, professional HTML document that will create a beautiful PDF report.`
      }
    ],
    max_completion_tokens: 16000,
  })

  const htmlContent = completion.choices[0]?.message?.content
  if (!htmlContent) throw new Error('Failed to generate HTML template')

  let cleanHtml = htmlContent
    .replace(/```html\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  if (!cleanHtml.includes('<!DOCTYPE html>')) {
    cleanHtml = `<!DOCTYPE html>\n<html>\n<head>\n  <title>MPU Report${userName ? ` - ${userName}` : ''}</title>\n  <meta charset=\"UTF-8\">\n</head>\n<body style=\"font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; font-size: 14px; line-height: 1.5;\">\n${cleanHtml}\n</body>\n</html>`
  }

  const sanitizedHtml = DOMPurify.sanitize(cleanHtml, { ALLOW_UNKNOWN_PROTOCOLS: false })

  // Optional HTML->PDF via CloudConvert (mirrored to R2 if configured)
  let pdfUrl: string | undefined
  const ccApiKey = process.env.CLOUDCONVERT_API_KEY
  const r2PublicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  const haveR2 = r2PublicBase && process.env.R2_BUCKET && process.env.R2_S3_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY

  if (ccApiKey) {
    try {
      const CC_API = 'https://api.cloudconvert.com/v2'
      const safeBase = (fileName || 'MPU_Document').toString().replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60)
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const pdfName = `${safeBase || 'document'}_report.pdf`

      let importUrlForCC: string | null = null
      if (haveR2) {
        const htmlKey = `tmp/pdfgen/${id}/${safeBase || 'document'}.html`
        const htmlBytes = new TextEncoder().encode(sanitizedHtml)
        await uploadBufferToR2(htmlKey, htmlBytes, 'text/html; charset=utf-8')
        importUrlForCC = `${r2PublicBase}/${htmlKey}`
      }

      const tasks: any = importUrlForCC
        ? {
            'import-1': { operation: 'import/url', url: importUrlForCC },
            'convert-1': {
              operation: 'convert', input: 'import-1', input_format: 'html', output_format: 'pdf', engine: 'chrome', filename: pdfName,
              page_size: 'A4', margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10,
            },
            'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
          }
        : {
            'import-1': { operation: 'import/base64', file: Buffer.from(sanitizedHtml, 'utf8').toString('base64'), filename: `${safeBase || 'document'}.html` },
            'convert-1': {
              operation: 'convert', input: 'import-1', input_format: 'html', output_format: 'pdf', engine: 'chrome', filename: pdfName,
              page_size: 'A4', margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10,
            },
            'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
          }

      const jobResp = await fetch(`${CC_API}/jobs`, { method: 'POST', headers: { 'Authorization': `Bearer ${ccApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) })
      if (!jobResp.ok) throw new Error(`CloudConvert job creation failed: ${await jobResp.text()}`)
      const jobJson: any = await jobResp.json()
      const jobId: string = jobJson?.data?.id

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
      const fetchExportUrls = async (): Promise<string[]> => {
        const listResp = await fetch(`${CC_API}/tasks?filter[job_id]=${jobId}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
        if (!listResp.ok) return []
        const listJson: any = await listResp.json()
        const allTasks: any[] = listJson?.data || []
        const exportTasks = allTasks.filter((t: any) => (t?.attributes?.operation || t?.operation || '').includes('export'))
        const finished = exportTasks.find((t: any) => (t?.attributes?.status || t?.status) === 'finished') || exportTasks[0]
        if (!finished?.id) return []
        const detailResp = await fetch(`${CC_API}/tasks/${finished.id}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
        if (!detailResp.ok) return []
        const detailJson: any = await detailResp.json()
        const files = detailJson?.data?.attributes?.result?.files || detailJson?.data?.result?.files || []
        return (files as any[]).map((f: any) => f.url).filter(Boolean)
      }

      let exportUrls: string[] = []
      const started = Date.now()
      while (!exportUrls.length && (Date.now() - started) < 90_000) {
        const statusResp = await fetch(`${CC_API}/jobs/${jobId}?include=tasks`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
        if (!statusResp.ok) break
        const statusJson: any = await statusResp.json()
        const status = statusJson?.data?.status
        if (status === 'error') throw new Error('CloudConvert job failed')
        if (status === 'finished') { exportUrls = await fetchExportUrls(); break }
        await sleep(2000)
      }

      if (!exportUrls.length) throw new Error('CloudConvert did not return export URLs in time')

      if (haveR2) {
        const pdfResp = await fetch(exportUrls[0])
        if (!pdfResp.ok) throw new Error(`Failed to download PDF: ${pdfResp.status}`)
        const pdfArr = new Uint8Array(await pdfResp.arrayBuffer())
        const pdfKey = `generated/pdfs/${Date.now()}/${pdfName}`
        await uploadBufferToR2(pdfKey, pdfArr, 'application/pdf')
        pdfUrl = `${r2PublicBase}/${pdfKey}`
      } else {
        pdfUrl = exportUrls[0]
      }
    } catch (e) {
      console.warn('CloudConvert PDF generation failed (HTML returned without pdfUrl):', e)
    }
  }

  return {
    success: true,
    htmlContent: sanitizedHtml,
    pdfUrl,
    fileName: fileName || 'MPU_Document',
    generatedAt: new Date().toISOString(),
  }
}

export async function convertHtmlToPdf(params: { htmlContent: string; fileName?: string; userName?: string }) {
  const { htmlContent, fileName, userName } = params
  const ccApiKey = process.env.CLOUDCONVERT_API_KEY
  if (!ccApiKey) {
    return { success: false, error: 'CLOUDCONVERT_API_KEY not configured' }
  }

  const r2PublicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '')
  const haveR2 = r2PublicBase && process.env.R2_BUCKET && process.env.R2_S3_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY

  const CC_API = 'https://api.cloudconvert.com/v2'
  const safeBase = (fileName || 'MPU_Document').toString().replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60)
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const pdfName = `${safeBase || 'document'}_report.pdf`

  // Upload HTML to R2 for import/url if available; otherwise import/base64
  let importUrlForCC: string | null = null
  const sanitizedHtml = DOMPurify.sanitize(htmlContent, { ALLOW_UNKNOWN_PROTOCOLS: false })
  if (haveR2) {
    const htmlKey = `tmp/pdfgen/${id}/${safeBase || 'document'}.html`
    const htmlBytes = new TextEncoder().encode(sanitizedHtml)
    await uploadBufferToR2(htmlKey, htmlBytes, 'text/html; charset=utf-8')
    importUrlForCC = `${r2PublicBase}/${htmlKey}`
  }

  const tasks: any = importUrlForCC
    ? {
        'import-1': { operation: 'import/url', url: importUrlForCC },
        'convert-1': { operation: 'convert', input: 'import-1', input_format: 'html', output_format: 'pdf', engine: 'chrome', filename: pdfName, page_size: 'A4', margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10 },
        'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
      }
    : {
        'import-1': { operation: 'import/base64', file: Buffer.from(sanitizedHtml, 'utf8').toString('base64'), filename: `${safeBase || 'document'}.html` },
        'convert-1': { operation: 'convert', input: 'import-1', input_format: 'html', output_format: 'pdf', engine: 'chrome', filename: pdfName, page_size: 'A4', margin_top: 10, margin_bottom: 10, margin_left: 10, margin_right: 10 },
        'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
      }

  const jobResp = await fetch(`${CC_API}/jobs`, { method: 'POST', headers: { 'Authorization': `Bearer ${ccApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) })
  if (!jobResp.ok) {
    const errText = await jobResp.text().catch(() => '')
    return { success: false, error: `CloudConvert job creation failed: ${errText}` }
  }
  const jobJson: any = await jobResp.json()
  const jobId: string = jobJson?.data?.id

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const fetchExportUrls = async (): Promise<string[]> => {
    const listResp = await fetch(`${CC_API}/tasks?filter[job_id]=${jobId}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
    if (!listResp.ok) return []
    const listJson: any = await listResp.json()
    const allTasks: any[] = listJson?.data || []
    const exportTasks = allTasks.filter((t: any) => (t?.attributes?.operation || t?.operation || '').includes('export'))
    const finished = exportTasks.find((t: any) => (t?.attributes?.status || t?.status) === 'finished') || exportTasks[0]
    if (!finished?.id) return []
    const detailResp = await fetch(`${CC_API}/tasks/${finished.id}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
    if (!detailResp.ok) return []
    const detailJson: any = await detailResp.json()
    const files = detailJson?.data?.attributes?.result?.files || detailJson?.data?.result?.files || []
    return (files as any[]).map((f: any) => f.url).filter(Boolean)
  }

  let exportUrls: string[] = []
  const started = Date.now()
  while (!exportUrls.length && (Date.now() - started) < 90_000) {
    const statusResp = await fetch(`${CC_API}/jobs/${jobId}?include=tasks`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } })
    if (!statusResp.ok) break
    const statusJson: any = await statusResp.json()
    const status = statusJson?.data?.status
    if (status === 'error') return { success: false, error: 'CloudConvert job failed' }
    if (status === 'finished') { exportUrls = await fetchExportUrls(); break }
    await sleep(2000)
  }

  if (!exportUrls.length) return { success: false, error: 'CloudConvert did not return export URLs in time' }

  let pdfUrl: string
  if (haveR2) {
    const pdfResp = await fetch(exportUrls[0])
    if (!pdfResp.ok) return { success: false, error: `Failed to download PDF: ${pdfResp.status}` }
    const pdfArr = new Uint8Array(await pdfResp.arrayBuffer())
    const pdfKey = `generated/pdfs/${Date.now()}/${pdfName}`
    await uploadBufferToR2(pdfKey, pdfArr, 'application/pdf')
    pdfUrl = `${r2PublicBase}/${pdfKey}`
  } else {
    pdfUrl = exportUrls[0]
  }

  return { success: true, pdfUrl }
}
