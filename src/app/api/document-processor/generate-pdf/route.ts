import { NextRequest, NextResponse } from 'next/server';
import { generatePdfFromExtractedData } from '@/lib/pdf-generator'
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

    const result = await generatePdfFromExtractedData({ extractedData, fileName })
    return NextResponse.json(result)

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
