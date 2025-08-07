// Client-side PDF to images converter using PDF.js
export async function convertPdfToImages(
  file: File,
  options: {
    scale?: number;
    onProgress?: (progress: number, message: string) => void;
  } = {}
): Promise<string[]> {
  const { scale = 1.5, onProgress } = options;
  
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Temporary: Use CDN with version auto-matching (update your Cloudflare Worker to @latest)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs';
    
    onProgress?.(10, 'Loading PDF document...');
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const numPages = pdf.numPages;
    
    onProgress?.(20, `Processing ${numPages} pages...`);
    
    const images: string[] = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        onProgress?.(
          20 + (pageNum / numPages) * 70,
          `Converting page ${pageNum} of ${numPages}...`
        );
        
        const page = await pdf.getPage(pageNum);
        
        // Set up canvas
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to base64 image
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6); // Use JPEG with lower quality for smaller files
        images.push(imageDataUrl);
        
        // Clean up
        page.cleanup();
        
      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    onProgress?.(100, `Converted ${images.length} pages successfully!`);
    
    // Clean up PDF document
    pdf.destroy();
    
    return images;
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}