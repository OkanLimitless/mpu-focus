import { NextRequest } from 'next/server';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';

interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  let tempFilePath: string | null = null;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { fileUrl, fileName, fileKey } = await request.json();
        
        if (!fileUrl || !fileName) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Missing file URL or name'
          })}\n\n`));
          controller.close();
          return;
        }
        
        const sendStatus = (status: ProcessingStatus) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status })}\n\n`));
        };
        
        sendStatus({
          step: 'Downloading file',
          progress: 5,
          message: 'Downloading PDF from UploadThing...'
        });
        
        // Download file from UploadThing URL
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }
        
        const fileBuffer = await fileResponse.arrayBuffer();
        const fileSize = fileBuffer.byteLength;
        
        // Check file size after download
        if (fileSize > 100 * 1024 * 1024) { // 100MB limit
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'File too large. Please use a PDF smaller than 100MB.'
          })}\n\n`));
          controller.close();
          return;
        }
        
        // Save to temporary file
        tempFilePath = path.join('/tmp', `pdf_${Date.now()}_${fileName}`);
        writeFileSync(tempFilePath, new Uint8Array(fileBuffer));
        
        sendStatus({
          step: 'File downloaded',
          progress: 15,
          message: `Downloaded ${Math.round(fileSize / 1024 / 1024)}MB PDF file`
        });
        
        // Convert PDF pages to images for GPT-4o Vision
        sendStatus({
          step: 'Converting PDF to images',
          progress: 25,
          message: `Converting ${Math.round(fileSize / 1024 / 1024)}MB PDF to images...`
        });
        
        let imagePages: string[] = [];
        try {
          const { convertPdfToImages } = await import('@/lib/pdf-to-images-api');
          
          // Adaptive quality based on file size
          const getConversionSettings = (fileSize: number) => {
            if (fileSize < 15 * 1024 * 1024) { // < 15MB
              return { density: 150, quality: 85, format: 'jpg' as const };
            } else if (fileSize < 35 * 1024 * 1024) { // 15-35MB
              return { density: 120, quality: 75, format: 'jpg' as const };
            } else if (fileSize < 60 * 1024 * 1024) { // 35-60MB
              return { density: 100, quality: 65, format: 'jpg' as const };
            } else {
              return { density: 80, quality: 60, format: 'jpg' as const };
            }
          };
          
          const conversionSettings = getConversionSettings(fileSize);
          
          // Read PDF buffer
          const fs = await import('fs');
          const pdfBuffer = fs.readFileSync(tempFilePath);
          
          // Convert PDF to images using PDF.js + Canvas
          imagePages = await convertPdfToImages(pdfBuffer, conversionSettings);
          
          sendStatus({
            step: 'Images converted',
            progress: 40,
            message: `Converted ${imagePages.length} pages to images`
          });
          
        } catch (conversionError) {
          console.error('PDF to image conversion failed:', conversionError);
          throw new Error(`Failed to convert PDF to images: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        }
        
        // Process images with GPT-4o Vision using batch processing
        let extractedData = '';
        try {
          sendStatus({
            step: 'Processing with GPT-4o Vision',
            progress: 50,
            message: `Analyzing ${imagePages.length} pages with AI...`
          });

          const { createOpenAIClient, VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');
          const openai = createOpenAIClient();

          // For large documents, process in batches to avoid payload limits
          const maxPagesPerBatch = fileSize > 30 * 1024 * 1024 ? 3 : 6; // Smaller batches for larger files
          
          if (imagePages.length <= maxPagesPerBatch) {
            // Small document - process all pages at once
            const imageMessages = imagePages.map((imagePage) => ({
              type: "image_url" as const,
              image_url: {
                url: imagePage,
                detail: "medium" as const // Use medium for better performance
              }
            } as any));

            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: VISION_ANALYSIS_PROMPT
                    },
                    ...imageMessages
                  ]
                }
              ],
              max_tokens: 4000,
              temperature: 0.1
            });

            extractedData = completion.choices[0]?.message?.content || '';
          } else {
            // Large document - process in batches
            let allResults: string[] = [];
            
            for (let i = 0; i < imagePages.length; i += maxPagesPerBatch) {
              const batch = imagePages.slice(i, i + maxPagesPerBatch);
              const batchNum = Math.floor(i / maxPagesPerBatch) + 1;
              const totalBatches = Math.ceil(imagePages.length / maxPagesPerBatch);
              
              sendStatus({
                step: 'Processing with GPT-4o Vision',
                progress: 50 + (30 * i / imagePages.length),
                message: `Processing batch ${batchNum}/${totalBatches} (${batch.length} pages)...`
              });
              
                             const imageMessages = batch.map((imagePage) => ({
                 type: "image_url" as const,
                 image_url: {
                   url: imagePage,
                   detail: "medium" as const
                 }
               } as any));

              const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `${VISION_ANALYSIS_PROMPT}
                        
This is batch ${batchNum} of ${totalBatches}. Extract any relevant information from these pages.`
                      },
                      ...imageMessages
                    ]
                  }
                ],
                max_tokens: 4000,
                temperature: 0.1
              });

              const batchResult = completion.choices[0]?.message?.content || '';
              if (batchResult.trim()) {
                allResults.push(batchResult);
              }
            }
            
            // Combine all batch results
            extractedData = allResults.join('\n\n--- Next Batch ---\n\n');
          }

          sendStatus({
            step: 'Finalizing results',
            progress: 90,
            message: 'Preparing extracted data...'
          });

        } catch (error) {
          console.error('GPT-4o processing error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Failed to process document with AI. Please try again.'
          })}\n\n`));
          controller.close();
          return;
        }
        
        // Return final results
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          step: 'Complete',
          progress: 100,
          message: 'Document processing complete!',
          result: {
            extractedData: extractedData,
            totalPages: imagePages.length,
            processingMethod: 'GPT-4o Vision Analysis'
          }
        })}\n\n`));
        
        controller.close();
        
        // Clean up UploadThing file if we have the key
        if (fileKey) {
          setTimeout(async () => {
            try {
              const { UTApi } = await import('uploadthing/server');
              const utapi = new UTApi();
              await utapi.deleteFiles([fileKey]);
            } catch (e) {
              console.warn('Could not delete file from UploadThing:', e);
            }
          }, 5000); // Give some time for user to see results
        }
        
      } catch (error) {
        console.error('Processing error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        })}\n\n`));
        controller.close();
      } finally {
        // Clean up temp file
        if (tempFilePath) {
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.warn('Could not delete temp file:', e);
          }
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}