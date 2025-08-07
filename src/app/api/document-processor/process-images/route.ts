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

      const processImages = async () => {
        try {
          const formData = await request.formData();
          const imagesData = formData.get('images') as string;
          
          if (!imagesData) {
            throw new Error('No images data provided');
          }

          const imagePages: string[] = JSON.parse(imagesData);
          
          if (!imagePages || imagePages.length === 0) {
            throw new Error('No valid images provided');
          }

          sendStatus({
            step: 'Processing images',
            progress: 20,
            message: `Analyzing ${imagePages.length} pages with AI...`
          });

          // Process with GPT-4o Vision
          const { default: OpenAI } = await import('openai');
          
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          let allExtractedData = '';
          const maxPagesPerBatch = imagePages.length > 10 ? 3 : 6;

          if (imagePages.length <= maxPagesPerBatch) {
            // Process all images at once for smaller documents
            sendStatus({
              step: 'AI Analysis',
              progress: 50,
              message: `Analyzing all ${imagePages.length} pages...`
            });

            const imageMessages = imagePages.map((imagePage) => ({
              type: "image_url" as const,
              image_url: { url: imagePage, detail: "medium" as const }
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
            const totalBatches = Math.ceil(imagePages.length / maxPagesPerBatch);
            
            for (let i = 0; i < imagePages.length; i += maxPagesPerBatch) {
              const batch = imagePages.slice(i, i + maxPagesPerBatch);
              const batchNumber = Math.floor(i / maxPagesPerBatch) + 1;
              
              sendStatus({
                step: 'AI Analysis',
                progress: 30 + (batchNumber / totalBatches) * 50,
                message: `Processing batch ${batchNumber}/${totalBatches} (${batch.length} pages)...`
              });

              const imageMessages = batch.map((imagePage) => ({
                type: "image_url" as const,
                image_url: { url: imagePage, detail: "medium" as const }
              } as any));

              const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: [
                      { 
                        type: "text", 
                        text: `${VISION_ANALYSIS_PROMPT}\n\nThis is batch ${batchNumber} of ${totalBatches}. Please extract data from these pages and format it clearly.`
                      },
                      ...imageMessages
                    ],
                  },
                ],
                max_tokens: 4000,
              });

              const batchData = completion.choices[0]?.message?.content || '';
              allExtractedData += `\n\n--- Batch ${batchNumber} ---\n${batchData}`;
            }
          }

          // Send final result
          const result = {
            extractedData: allExtractedData,
            totalPages: imagePages.length,
            processingMethod: 'GPT-4o Vision Analysis',
            timestamp: new Date().toISOString()
          };

          sendStatus({
            step: 'Complete',
            progress: 100,
            message: 'Document processing complete!',
            result: result
          });

        } catch (error) {
          console.error('Processing error:', error);
          sendStatus({
            step: 'Error',
            progress: 0,
            message: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: true
          });
        } finally {
          controller.close();
        }
      };

      processImages();
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