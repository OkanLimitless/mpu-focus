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
    // Use a third-party PDF to image conversion service
    // For now, let's use a simple approach with PDF.co API
    
    const API_KEY = process.env.PDFCO_API_KEY || 'demo'; // Use demo key for testing
    
    // Step 1: Upload PDF to PDF.co
    const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        file: pdfBuffer.toString('base64'),
        name: 'document.pdf'
      })
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    const fileUrl = uploadResult.url;
    
    // Step 2: Convert PDF to images
    const convertResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/png', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        url: fileUrl,
        pages: '', // All pages
        async: false // Synchronous processing
      })
    });
    
    if (!convertResponse.ok) {
      throw new Error(`Conversion failed: ${convertResponse.statusText}`);
    }
    
    const convertResult = await convertResponse.json();
    
    if (!convertResult.urls || convertResult.urls.length === 0) {
      throw new Error('No images were generated from the PDF');
    }
    
    // Step 3: Download images and convert to base64
    const imagePages: string[] = [];
    
    for (const imageUrl of convertResult.urls) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.warn(`Failed to download image: ${imageUrl}`);
          continue;
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        imagePages.push(`data:image/png;base64,${base64Image}`);
        
      } catch (imageError) {
        console.warn(`Error processing image ${imageUrl}:`, imageError);
      }
    }
    
    return imagePages;
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}