export interface ConversionSettings {
  density: number;
  quality: number;
  format: 'jpg' | 'png';
}

export async function convertPdfToImages(
  pdfBuffer: Buffer,
  settings: ConversionSettings
): Promise<string[]> {
  try {
    // Use pdf-to-img - claims to be serverless compatible
    const { pdf } = await import('pdf-to-img');
    
    // Convert density to scale (density/72 is a common conversion)
    const scale = Math.max(1.0, Math.min(settings.density / 72, 4.0)); // Clamp scale between 1.0 and 4.0
    
    // Convert PDF buffer to data URL
    const base64Pdf = pdfBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
    
    // Convert PDF to images
    const document = await pdf(dataUrl, { 
      scale: scale 
    });
    
    if (!document || document.length === 0) {
      throw new Error('No pages were converted from the PDF');
    }
    
    // Convert each page buffer to base64 data URL
    const imagePages: string[] = [];
    
    for await (const page of document) {
      try {
        const base64Image = page.toString('base64');
        imagePages.push(`data:image/png;base64,${base64Image}`);
      } catch (pageError) {
        console.warn(`Failed to process page ${imagePages.length + 1}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (imagePages.length === 0) {
      throw new Error('All pages failed to convert to images');
    }
    
    console.log(`Successfully converted ${imagePages.length} pages from PDF`);
    return imagePages;
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}