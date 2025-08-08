import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT } from '@/lib/document-processor';
import OpenAI from 'openai';

// Helper function to retry OpenAI calls with exponential backoff
async function retryOpenAICall(
  openai: OpenAI,
  imageUrls: string[],
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
        max_completion_tokens: 16000, // Maximized for GPT-5 Mini's comprehensive analysis capabilities
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error(`OpenAI call attempt ${attempt} failed:`, error.message);
      
      // Check if it's a timeout/download error
      if (error.code === 'invalid_image_url' && error.message?.includes('Timeout while downloading')) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000; // Exponential backoff: 4s, 8s, 16s
          console.log(`Retrying in ${delay}ms due to image download timeout...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If it's not a timeout error, or we've exhausted retries, throw
      throw error;
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`);
}

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

          // Process with GPT-5 Mini Vision
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          // SINGLE REQUEST APPROACH: Send all images at once for unified analysis
          sendStatus({
            step: 'AI Analysis',
            progress: 20,
            message: `Analyzing complete document: ${imageUrls.length} pages with GPT-5 Mini (200k TPM)...`
          });

          // Retry logic for handling OpenAI timeouts
          let allExtractedData: string;
          try {
            allExtractedData = await retryOpenAICall(openai, imageUrls, 3);
          } catch (error: any) {
            // If all retries failed, try with lower detail to reduce load
            sendStatus({
              step: 'AI Analysis - Fallback',
              progress: 50,
              message: `Retrying with optimized settings due to download timeouts...`
            });

            try {
              // Fallback: Use lower detail to reduce image download load
              const imageMessages = imageUrls.map((imageUrl) => ({
                type: "image_url" as const,
                image_url: { url: imageUrl, detail: "low" as const }
              } as any));

              const completion = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `${VISION_ANALYSIS_PROMPT}\n\nCOMPLETE DOCUMENT ANALYSIS (OPTIMIZED MODE): You are analyzing a complete ${imageUrls.length}-page German legal document for MPU assessment. Due to technical constraints, images are provided in optimized quality. Please provide the most comprehensive analysis possible of ALL visible information across all pages.`
                      },
                      ...imageMessages
                    ],
                  },
                ],
                                 max_completion_tokens: 16000,
              });

              allExtractedData = completion.choices[0]?.message?.content || '';
            } catch (fallbackError: any) {
              // Try to clean up files even if processing fails
              try {
                const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
                await deleteUploadThingFiles(imageUrls);
                console.log('Cleaned up temporary files after processing failure');
              } catch (cleanupError) {
                console.error('Failed to cleanup files after processing failure:', cleanupError);
              }
              
              throw new Error(`AI processing failed: ${fallbackError.message}. Try uploading a smaller document or check your internet connection.`);
            }
          }

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
            processingNotes: 'Complete document analyzed in single request for unified results',
            supportsPDFGeneration: true // Flag to indicate PDF generation is available
          };

          // Clean up uploaded images from UploadThing after successful processing
          sendStatus({
            step: 'Cleanup',
            progress: 95,
            message: 'Cleaning up temporary files...'
          });

          try {
            // Import cleanup function
            const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
            const cleanupResult = await deleteUploadThingFiles(imageUrls);
            
            if (cleanupResult.success) {
              console.log(`Cleanup successful: Deleted ${cleanupResult.deletedCount} temporary files`);
            } else {
              console.warn(`Cleanup partial: ${cleanupResult.deletedCount} deleted, errors:`, cleanupResult.errors);
            }
          } catch (cleanupError) {
            // Don't fail the whole process if cleanup fails
            console.error('Cleanup failed (non-critical):', cleanupError);
          }

          sendStatus({
            step: 'Complete',
            progress: 100,
            message: 'Document processing completed successfully!',
            result
          });

          controller.close();

        } catch (error) {
          console.error('Processing error:', error);
          
          // Try to clean up files even on error
          try {
            const { imageUrls: urlsToClean } = await request.clone().json();
            if (urlsToClean && Array.isArray(urlsToClean) && urlsToClean.length > 0) {
              const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
              await deleteUploadThingFiles(urlsToClean);
              console.log('Cleaned up temporary files after error');
            }
          } catch (cleanupError) {
            console.error('Failed to cleanup files after error:', cleanupError);
          }

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