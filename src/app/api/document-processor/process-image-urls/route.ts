import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT, VISION_ANALYSIS_SYSTEM_PROMPT } from '@/lib/document-processor';
import OpenAI from 'openai';

// Helper function to retry OpenAI calls with exponential backoff
async function retryOpenAICall(
  openai: OpenAI,
  imageUrls: string[],
  maxRetries: number = 3
): Promise<string> {
  const defaultDetail = (process.env.VISION_DEFAULT_DETAIL || 'low').toLowerCase() === 'high' ? 'high' : 'low'
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Prepare all images for single request
      const imageMessages = imageUrls.map((imageUrl) => ({
        type: "image_url" as const,
        image_url: { url: imageUrl, detail: defaultDetail as 'low' | 'high' }
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
      
      // Retry on any invalid_image_url download failures (timeout or other fetch errors)
      if (error.code === 'invalid_image_url') {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000; // Exponential backoff: 4s, 8s, 16s
          console.log(`Retrying in ${delay}ms due to image download error...`);
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
  // Keep a reference to parsed payload for later cleanup without cloning the request
  let parsedBody: { imageUrls?: string[]; fileName?: string } | null = null;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const processImageUrls = async () => {
        try {
          const body = await request.json() as { imageUrls?: string[]; fileName?: string };
          parsedBody = body;
          const imageUrls = body.imageUrls as string[];
          const fileName = body.fileName as string;

          if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            throw new Error('No image URLs provided');
          }

          // Build absolute base URL for proxying image URLs (must be publicly accessible for external fetchers like OpenAI)
          // Preference: EXTERNAL_PUBLIC_BASE_URL -> NEXT_PUBLIC_APP_URL -> VERCEL_PROJECT_PRODUCTION_URL -> VERCEL_BRANCH_URL -> VERCEL_URL -> request origin
          const baseOrigin = (
            process.env.EXTERNAL_PUBLIC_BASE_URL
            || process.env.NEXT_PUBLIC_APP_URL
            || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
            || (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : '')
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
            || new URL(request.url).origin
          );
          const r2PublicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
          const isR2Url = (u: string) => r2PublicBase && u.startsWith(r2PublicBase);
          // Only pass through R2 URLs. Proxy everything else (including CloudConvert) for stability.
          const proxiedUrls: string[] = imageUrls.map((u: string) =>
            isR2Url(u) ? u : `${baseOrigin}/api/documents/proxy?url=${encodeURIComponent(u)}`
          );

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
            // If all retries failed, try with higher detail to improve accuracy (second attempt)
            sendStatus({
              step: 'AI Analysis - Fallback',
              progress: 50,
              message: `Retrying with high detail to improve completeness...`
            });

            try {
              // Fallback: Use high detail
              const imageMessages = proxiedUrls.map((imageUrl) => ({
                type: "image_url" as const,
                image_url: { url: imageUrl, detail: "high" as const }
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
                const uploadThingUrls = (parsedBody?.imageUrls || []).filter((u: string) => {
                  try { const h = new URL(u).hostname; return h.endsWith('.utfs.io') || h.endsWith('.ufs.sh') || h === 'utfs.io' || h === 'ufs.sh'; } catch { return false; }
                });
                const cleanupPromise = deleteUploadThingFiles(uploadThingUrls);
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
            const urlsToClean = (parsedBody?.imageUrls || []) as string[];
            const uploadThingUrls = (urlsToClean || []).filter((u: string) => {
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
