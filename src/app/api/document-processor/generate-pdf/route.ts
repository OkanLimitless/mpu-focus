import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
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

export async function POST(request: NextRequest) {
  try {
    const { extractedData, fileName } = await request.json();

    if (!extractedData) {
      return NextResponse.json(
        { error: 'No extracted data provided' },
        { status: 400 }
      );
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate HTML template using GPT
    console.log('Generating HTML template with GPT...');
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: PDF_GENERATION_PROMPT
        },
        {
          role: "user",
          content: `Convert the following extracted MPU document data into a professional HTML template for PDF generation:

EXTRACTED DATA:
${extractedData}

DOCUMENT INFO:
- Original filename: ${fileName || 'Unknown'}
- Generation date: ${new Date().toLocaleDateString('de-DE')}

Please generate a complete, professional HTML document that will create a beautiful PDF report.`
        }
      ],
      max_completion_tokens: 16000,
      // Note: GPT-5 Mini only supports default temperature (1)
    });

    const htmlContent = completion.choices[0]?.message?.content;

    if (!htmlContent) {
      throw new Error('Failed to generate HTML template');
    }

    // Clean up and sanitize the HTML (remove any markdown artifacts)
    let cleanHtml = htmlContent
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Ensure we have a complete HTML document
    if (!cleanHtml.includes('<!DOCTYPE html>')) {
      console.warn('GPT did not generate complete HTML, wrapping content...');
      cleanHtml = `<!DOCTYPE html>
<html>
<head>
    <title>MPU Report</title>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; margin: 20px; color: #000; background: #fff; font-size: 14px; line-height: 1.5;">
    ${cleanHtml}
</body>
</html>`;
    }

    const sanitizedHtml = DOMPurify.sanitize(cleanHtml, { ALLOW_UNKNOWN_PROTOCOLS: false })

    console.log('Generated HTML length (sanitized):', sanitizedHtml.length);

    // Attempt CloudConvert HTML->PDF conversion if configured
    let pdfUrl: string | null = null;
    const ccApiKey = process.env.CLOUDCONVERT_API_KEY;
    const r2PublicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const haveR2 = r2PublicBase && process.env.R2_BUCKET && process.env.R2_S3_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;

    if (ccApiKey) {
      try {
        // 1) Upload HTML to R2 (or fallback to direct import/base64 if no R2)
        const safeBase = (fileName || 'MPU_Document')
          .toString()
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-z0-9_-]+/gi, '_')
          .slice(0, 60);
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let importUrlForCC: string | null = null;
        let htmlUploaded = false;

        if (haveR2) {
          const htmlKey = `tmp/pdfgen/${id}/${safeBase || 'document'}.html`;
          const htmlBytes = new TextEncoder().encode(sanitizedHtml);
          await uploadBufferToR2(htmlKey, htmlBytes, 'text/html; charset=utf-8');
          importUrlForCC = `${r2PublicBase}/${htmlKey}`;
          htmlUploaded = true;
        }

        // 2) Create CloudConvert job: import -> convert(html->pdf) -> export/url
        const CC_API = 'https://api.cloudconvert.com/v2';
        const pdfName = `${safeBase || 'document'}_report.pdf`;

        const tasks: any = htmlUploaded
          ? {
              'import-1': { operation: 'import/url', url: importUrlForCC },
              'convert-1': {
                operation: 'convert',
                input: 'import-1',
                input_format: 'html',
                output_format: 'pdf',
                engine: 'chrome',
                filename: pdfName,
                // Reasonable defaults for PDF rendering
                page_size: 'A4',
                margin_top: 10,
                margin_bottom: 10,
                margin_left: 10,
                margin_right: 10,
              },
              'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
            }
          : {
              // Fallback if no R2: use import/base64
              'import-1': { operation: 'import/base64', file: Buffer.from(sanitizedHtml, 'utf8').toString('base64'), filename: `${safeBase || 'document'}.html` },
              'convert-1': {
                operation: 'convert',
                input: 'import-1',
                input_format: 'html',
                output_format: 'pdf',
                engine: 'chrome',
                filename: pdfName,
                page_size: 'A4',
                margin_top: 10,
                margin_bottom: 10,
                margin_left: 10,
                margin_right: 10,
              },
              'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
            };

        const jobResp = await fetch(`${CC_API}/jobs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ccApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks })
        });
        if (!jobResp.ok) {
          const errText = await jobResp.text();
          throw new Error(`CloudConvert job creation failed: ${errText}`);
        }
        const jobJson: any = await jobResp.json();
        const jobId: string = jobJson?.data?.id;

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Helper: try to fetch export URLs
        const fetchExportUrls = async (): Promise<string[]> => {
          const listResp = await fetch(`${CC_API}/tasks?filter[job_id]=${jobId}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } });
          if (!listResp.ok) return [];
          const listJson: any = await listResp.json();
          const allTasks: any[] = listJson?.data || [];
          const exportTasks = allTasks.filter((t: any) => (t?.attributes?.operation || t?.operation || '').includes('export'));
          const finished = exportTasks.find((t: any) => (t?.attributes?.status || t?.status) === 'finished') || exportTasks[0];
          if (!finished?.id) return [];
          const detailResp = await fetch(`${CC_API}/tasks/${finished.id}`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } });
          if (!detailResp.ok) return [];
          const detailJson: any = await detailResp.json();
          const files = detailJson?.data?.attributes?.result?.files || detailJson?.data?.result?.files || [];
          return (files as any[]).map((f: any) => f.url).filter(Boolean);
        };

        // Poll until job finished
        let exportUrls: string[] = [];
        const started = Date.now();
        while (!exportUrls.length && (Date.now() - started) < 90_000) {
          const statusResp = await fetch(`${CC_API}/jobs/${jobId}?include=tasks`, { headers: { 'Authorization': `Bearer ${ccApiKey}` } });
          if (!statusResp.ok) break;
          const statusJson: any = await statusResp.json();
          const status = statusJson?.data?.status;
          if (status === 'error') throw new Error('CloudConvert job failed');
          if (status === 'finished') {
            exportUrls = await fetchExportUrls();
            break;
          }
          await sleep(2000);
        }

        if (!exportUrls.length) {
          throw new Error('CloudConvert did not return export URLs in time');
        }

        // Mirror to R2 for stable hosting (if configured)
        if (haveR2) {
          const pdfResp = await fetch(exportUrls[0]);
          if (!pdfResp.ok) throw new Error(`Failed to download PDF: ${pdfResp.status}`);
          const pdfArr = new Uint8Array(await pdfResp.arrayBuffer());
          const pdfKey = `generated/pdfs/${id}/${pdfName}`;
          await uploadBufferToR2(pdfKey, pdfArr, 'application/pdf');
          pdfUrl = `${r2PublicBase}/${pdfKey}`;
        } else {
          pdfUrl = exportUrls[0];
        }
      } catch (ccError) {
        console.warn('CloudConvert PDF generation failed (continuing with HTML only):', ccError);
      }
    }

    // Return HTML (for backward compatibility) and PDF URL when available
    return NextResponse.json({
      success: true,
      htmlContent: sanitizedHtml,
      pdfUrl: pdfUrl || undefined,
      fileName: fileName || 'MPU_Document',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
