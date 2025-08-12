import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import DOMPurify from 'isomorphic-dompurify'

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

    // Return the HTML content for client-side PDF generation
    return NextResponse.json({
      success: true,
      htmlContent: sanitizedHtml,
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