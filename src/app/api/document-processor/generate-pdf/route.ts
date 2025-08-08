import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// GPT prompt for generating professional PDF template
const PDF_GENERATION_PROMPT = `
You are a professional document formatter specializing in German legal and MPU (Medizinisch-Psychologische Untersuchung) documentation. Your task is to convert extracted MPU document data into a beautifully formatted HTML template that will be converted to PDF.

CRITICAL REQUIREMENTS:
1. Output ONLY valid HTML (no markdown, no explanations)
2. Use professional German legal document styling
3. Include proper CSS for print media
4. Structure the document with clear sections and hierarchy
5. Handle missing or incomplete data gracefully
6. Use appropriate German legal terminology and formatting

HTML TEMPLATE STRUCTURE:
- Professional header with document title and generation date
- Clean typography optimized for PDF output
- Proper section divisions with clear hierarchy
- Responsive layout that works well in PDF format
- German date formatting and legal document conventions

CSS REQUIREMENTS:
- Include all CSS inline or in <style> tags
- Use professional fonts (Arial, Helvetica as fallbacks)
- Proper margins and spacing for legal documents
- Page break considerations
- Print-friendly colors and layout

CONTENT STRUCTURE:
1. Document Header (Title, Generation Date, Client Info)
2. Algemene Gegevens (General Information)
3. Overzicht van Delicten (Overview of Offenses) - with each delict clearly separated
4. Additional Information (if available)
5. Document Footer

DATA HANDLING:
- If data is missing, display "Nicht angegeben" or "Niet vermeld"
- Format dates in German standard (DD.MM.YYYY)
- Ensure all legal terminology is accurate
- Maintain professional tone throughout

Generate a complete HTML document that will create a professional, print-ready PDF report.
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
      temperature: 0.1, // Low temperature for consistent formatting
    });

    const htmlContent = completion.choices[0]?.message?.content;

    if (!htmlContent) {
      throw new Error('Failed to generate HTML template');
    }

    // Clean up the HTML (remove any markdown artifacts)
    const cleanHtml = htmlContent
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('Converting HTML to PDF...');

    // Configure Chromium for Vercel
    const executablePath = await chromium.executablePath();
    
    // Launch Puppeteer with Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    let pdfBuffer: Buffer;
    try {
      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(cleanHtml, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        },
        timeout: 30000
      });
    } finally {
      await browser.close();
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFileName = fileName ? fileName.replace('.pdf', '') : 'MPU_Document';
    const pdfFileName = `MPU_Report_${baseFileName}_${timestamp}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
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