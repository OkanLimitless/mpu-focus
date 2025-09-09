import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT, VISION_ANALYSIS_SYSTEM_PROMPT } from '@/lib/document-processor';
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
            role: "system",
            content: VISION_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${VISION_ANALYSIS_PROMPT}\n\nVOLLEDIGE DOCUMENTANALYSE: Dit betreft een document van ${imageUrls.length} pagina's (compleet). Geef een volledige, samenhangende analyse met paginaverwijzingen.`
              },
              ...imageMessages
            ],
          },
        ],
        max_completion_tokens: 16000,
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

          // Build absolute base URL for proxying image URLs (helps external fetchers like OpenAI)
          const baseOrigin = process.env.NEXT_PUBLIC_APP_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);
          const r2PublicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
          const isR2Url = (u: string) => r2PublicBase && u.startsWith(r2PublicBase);
          const proxiedUrls: string[] = imageUrls.map((u: string) => isR2Url(u) ? u : `${baseOrigin}/api/documents/proxy?url=${encodeURIComponent(u)}`);

          sendStatus({
            step: 'Processing images',
            progress: 0,
            message: `Analyzing ${proxiedUrls.length} pages with AI...`
          });

          // Process with GPT-5 Mini Vision
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          // SINGLE REQUEST APPROACH: Send all images at once for unified analysis
          sendStatus({
            step: 'AI Analysis',
            progress: 20,
            message: `Analyzing complete document: ${proxiedUrls.length} pages with GPT-5 Mini (200k TPM)...`
          });

          // Retry logic for handling OpenAI timeouts
          let allExtractedData: string;
          try {
            allExtractedData = await retryOpenAICall(openai, proxiedUrls, 3);
          } catch (error: any) {
            // If all retries failed, try with lower detail to reduce load
            sendStatus({
              step: 'AI Analysis - Fallback',
              progress: 50,
              message: `Retrying with optimized settings due to download timeouts...`
            });

            try {
              // Fallback: Use lower detail to reduce image download load
              const imageMessages = proxiedUrls.map((imageUrl) => ({
                type: "image_url" as const,
                image_url: { url: imageUrl, detail: "low" as const }
              } as any));

              const completion = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: [
                  {
                    role: "system",
                    content: VISION_ANALYSIS_SYSTEM_PROMPT,
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `${VISION_ANALYSIS_PROMPT}\n\nVOLLEDIGE DOCUMENTANALYSE (GEOPTIMALISEERD): Document van ${imageUrls.length} pagina's in geoptimaliseerde afbeeldingskwaliteit. Lever alsnog zo volledig mogelijke resultaten met paginaverwijzingen.`
                      },
                      ...imageMessages
                    ],
                  },
                ],
                max_completion_tokens: 16000,
              });

              allExtractedData = completion.choices[0]?.message?.content || '';
            } catch (fallbackError: any) {
              // Try to clean up files even if processing fails (with timeout)
              try {
                const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
                const cleanupPromise = deleteUploadThingFiles(imageUrls);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
                );
                await Promise.race([cleanupPromise, timeoutPromise]);
                console.log('Cleaned up temporary files after processing failure');
              } catch (cleanupError) {
                console.error('Failed to cleanup files after processing failure:', cleanupError);
              }
              
              throw new Error(`AI processing failed: ${fallbackError.message}. Try uploading a smaller document or check your internet connection.`);
            }
          }

          // Consolidation pass to improve completeness
          try {
            const consolidation = await openai.chat.completions.create({
              model: "gpt-5-mini",
              messages: [
                {
                  role: "system",
                  content: VISION_ANALYSIS_SYSTEM_PROMPT,
                },
                {
                  role: "user",
                  content: `Controleer en consolideer onderstaande extractie op volledigheid. Voeg ontbrekende velden of delicten toe als deze impliciet/expliciet zichtbaar zijn in de gegevens; geen hallucinaties. Behoud Nederlands output, voeg paginaverwijzingen en korte Duitse citaten toe waar mogelijk.\n\nEXTRACTIE:\n\n${allExtractedData}`,
                }
              ],
              max_completion_tokens: 8000,
            });
            const consolidated = consolidation.choices[0]?.message?.content;
            if (consolidated && consolidated.length >= (allExtractedData?.length || 0) * 0.8) {
              allExtractedData = consolidated;
            }
          } catch (e) {
            console.warn('Consolidation step skipped due to error:', e);
          }

          sendStatus({
            step: 'Finalizing',
            progress: 90,
            message: 'Consolidating and organizing extracted data...'
          });

          // Structure the final result (no consolidation needed - single unified analysis)
          const result = {
            fileName: fileName || 'document.pdf',
            totalPages: proxiedUrls.length,
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
            // Only attempt cleanup for UploadThing-hosted URLs
            const uploadThingUrls = (imageUrls as string[]).filter(u => /\.(utfs\.io|ufs\.sh)$/.test(new URL(u).hostname));
            if (uploadThingUrls.length > 0) {
              const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
              const cleanupPromise = deleteUploadThingFiles(uploadThingUrls);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Cleanup timeout')), 10000)
              );
              const cleanupResult = await Promise.race([cleanupPromise, timeoutPromise]) as any;
              if (cleanupResult.success) {
                console.log(`Cleanup successful: Deleted ${cleanupResult.deletedCount} temporary files`);
              } else {
                console.warn(`Cleanup partial: ${cleanupResult.deletedCount} deleted, errors:`, cleanupResult.errors);
              }
            } else {
              console.log('Cleanup skipped: No UploadThing URLs to delete');
            }
          } catch (cleanupError) {
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
          
          // Try to clean up files even on error (with timeout)
          try {
            const { imageUrls: urlsToClean } = await request.clone().json();
            const uploadThingUrls = (urlsToClean as string[] || []).filter((u: string) => {
              try { const h = new URL(u).hostname; return h.endsWith('.utfs.io') || h.endsWith('.ufs.sh') || h === 'utfs.io' || h === 'ufs.sh'; } catch { return false; }
            });
            if (uploadThingUrls.length > 0) {
              const { deleteUploadThingFiles } = await import('@/lib/uploadthing-upload');
              const cleanupPromise = deleteUploadThingFiles(uploadThingUrls);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
              );
              await Promise.race([cleanupPromise, timeoutPromise]);
              console.log('Cleaned up temporary files after error');
            } else {
              console.log('Cleanup skipped after error: No UploadThing URLs to delete');
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