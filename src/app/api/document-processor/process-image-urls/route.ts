import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT } from '@/lib/document-processor';

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

          let allExtractedData = '';
          
          // Use larger batches for faster processing - GPT-4o can handle this easily
          const maxPagesPerBatch = imageUrls.length > 50 ? 12 : 15; // Much larger batches for speed

          if (imageUrls.length <= maxPagesPerBatch) {
            // Process all images at once for smaller documents
            sendStatus({
              step: 'AI Analysis',
              progress: 20,
              message: `Analyzing all ${imageUrls.length} pages...`
            });

            const imageMessages = imageUrls.map((imageUrl) => ({
              type: "image_url" as const,
              image_url: { url: imageUrl, detail: "high" as const } // Use "high" for better OCR quality
            } as any));

            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: VISION_ANALYSIS_PROMPT },
                    ...imageMessages
                  ],
                },
              ],
              max_tokens: 4000,
            });

            allExtractedData = completion.choices[0]?.message?.content || '';

          } else {
            // Process in batches for large documents
            const totalBatches = Math.ceil(imageUrls.length / maxPagesPerBatch);
            
            for (let i = 0; i < imageUrls.length; i += maxPagesPerBatch) {
              const batch = imageUrls.slice(i, i + maxPagesPerBatch);
              const batchNumber = Math.floor(i / maxPagesPerBatch) + 1;
              
              sendStatus({
                step: 'AI Analysis',
                progress: 10 + (batchNumber / totalBatches) * 70,
                message: `Processing batch ${batchNumber}/${totalBatches} (${batch.length} pages)...`
              });

                              const imageMessages = batch.map((imageUrl) => ({
                  type: "image_url" as const,
                  image_url: { url: imageUrl, detail: "high" as const } // Use "high" for better OCR quality
                } as any));

              // Retry logic for failed requests
              let batchResult = '';
              let retryCount = 0;
              const maxRetries = 2;

              while (retryCount <= maxRetries) {
                try {
                  const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                      {
                        role: "user",
                        content: [
                          { 
                            type: "text", 
                            text: `${VISION_ANALYSIS_PROMPT}\n\nThis is batch ${batchNumber} of ${totalBatches}. Focus on extracting any relevant data from these pages.` 
                          },
                          ...imageMessages
                        ],
                      },
                    ],
                    max_tokens: 4000,
                  });

                  batchResult = completion.choices[0]?.message?.content || '';
                  break; // Success, exit retry loop

                } catch (error: any) {
                  retryCount++;
                  
                  if (error?.code === 'invalid_image_url' && retryCount <= maxRetries) {
                    sendStatus({
                      step: 'AI Analysis',
                      progress: 10 + (batchNumber / totalBatches) * 70,
                      message: `Batch ${batchNumber} failed, retrying... (${retryCount}/${maxRetries})`
                    });
                    
                    // Shorter retry delay for faster recovery
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                  } else {
                    throw error; // Re-throw if not retryable or max retries reached
                  }
                }
              }

              allExtractedData += `\n\n--- Batch ${batchNumber} Results ---\n${batchResult}`;

                              // Minimal delay between batches for faster processing
                await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          sendStatus({
            step: 'Finalizing',
            progress: 90,
            message: 'Organizing extracted data...'
          });

          // Structure the final result
          const result = {
            fileName: fileName || 'document.pdf',
            totalPages: imageUrls.length,
            extractedData: allExtractedData,
            processingMethod: 'UploadThing + GPT-4o Vision',
            timestamp: new Date().toISOString()
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