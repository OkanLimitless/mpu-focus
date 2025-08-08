import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT } from '@/lib/document-processor';

// No consolidation function needed - single request provides unified results

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const processImageUrls = async () => {
        try {
          const { imageUrls, fileName } = await request.json();
          
          if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            throw new Error('No image URLs provided');
          }

          sendStatus({
            step: 'Processing images',
            progress: 0,
            message: `Analyzing ${imageUrls.length} pages with AI...`
          });

          // Process with GPT-4o Vision
          const { default: OpenAI } = await import('openai');
          
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

                    // SINGLE REQUEST APPROACH: Send all images at once for unified analysis
          sendStatus({
            step: 'AI Analysis',
            progress: 20,
            message: `Analyzing complete document: ${imageUrls.length} pages with GPT-5 Mini (200k TPM)...`
          });

          // Prepare all images for single request
          const imageMessages = imageUrls.map((imageUrl) => ({
            type: "image_url" as const,
            image_url: { url: imageUrl, detail: "high" as const }
          } as any));

          // Single comprehensive analysis of the entire document using GPT-5 Mini
          const completion = await openai.chat.completions.create({
            model: "gpt-5-mini", // GPT-5 Mini with 200k TPM - perfect for large document processing
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: `${VISION_ANALYSIS_PROMPT}\n\nCOMPLETE DOCUMENT ANALYSIS: You are analyzing a complete ${imageUrls.length}-page German legal document for MPU assessment. This contains the ENTIRE document, so you can see all pages and make connections across the full content. Please provide a comprehensive analysis of ALL visible information, connecting related data across all pages for a complete MPU evaluation report.`
                  },
                  ...imageMessages
                ],
              },
            ],
            max_tokens: 16000, // Maximized for GPT-5's comprehensive analysis capabilities
          });

          const allExtractedData = completion.choices[0]?.message?.content || '';

          sendStatus({
            step: 'Finalizing',
            progress: 90,
            message: 'Consolidating and organizing extracted data...'
          });

          // Structure the final result (no consolidation needed - single unified analysis)
          const result = {
            fileName: fileName || 'document.pdf',
            totalPages: imageUrls.length,
            extractedData: allExtractedData,
            processingMethod: 'UploadThing + GPT-5 Mini Single Request Analysis',
            timestamp: new Date().toISOString(),
            processingNotes: 'Complete document analyzed in single request for unified results'
          };

          sendStatus({
            step: 'Complete',
            progress: 100,
            message: 'Document processing completed successfully!',
            result
          });

          controller.close();
          
        } catch (error) {
          console.error('Processing error:', error);
          sendStatus({
            step: 'Error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Processing failed',
            error: true
          });
          controller.close();
        }
      };

      processImageUrls();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}