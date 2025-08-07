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
        
        // Convert PDF to images using pdf-poppler with adaptive quality
        let imagePages: string[] = [];
        try {
          const pdfPoppler = await import('pdf-poppler');
          
          // Adaptive quality based on file size
          const getConversionSettings = (fileSize: number) => {
            if (fileSize < 15 * 1024 * 1024) { // < 15MB
              return { out_size: 300, quality: 'high' }; // High quality
            } else if (fileSize < 35 * 1024 * 1024) { // 15-35MB
              return { out_size: 200, quality: 'medium' }; // Medium quality  
            } else if (fileSize < 60 * 1024 * 1024) { // 35-60MB
              return { out_size: 150, quality: 'low' }; // Lower quality
            } else {
              return { out_size: 100, quality: 'ultra_low' }; // Very compressed
            }
          };
          
          const conversionSettings = getConversionSettings(fileSize);
          
          sendStatus({
            step: 'Converting PDF to images',
            progress: 25,
            message: `Converting PDF with ${conversionSettings.quality} quality (${Math.round(fileSize / 1024 / 1024)}MB file)...`
          });
          
          const options = {
            format: 'jpeg' as const,
            out_dir: '/tmp',
            out_prefix: `pdf_${Date.now()}`,
            page: null, // Convert all pages
            file_path: tempFilePath,
            // Adaptive quality settings
            out_size: conversionSettings.out_size,
            poppler_path: undefined, // Use system poppler
          };

          const imageFiles = await pdfPoppler.convert(options);
          
          sendStatus({
            step: 'Loading image data',
            progress: 40,
            message: `Processing ${imageFiles.length} pages...`
          });
          
          // Convert images to base64
          const fs = await import('fs');
          imagePages = imageFiles.map((imagePath) => {
            const imageBuffer = fs.readFileSync(imagePath.path);
            const base64Image = imageBuffer.toString('base64');
            // Clean up individual image files
            try {
              unlinkSync(imagePath.path);
            } catch (e) {
              console.warn('Could not delete temp image:', e);
            }
            return `data:image/jpeg;base64,${base64Image}`;
          });
          
        } catch (error) {
          console.error('PDF conversion error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Failed to convert PDF to images. Please ensure the PDF is valid and not corrupted.'
          })}\n\n`));
          controller.close();
          return;
        }
        
        // Process images with GPT-4o vision using batch processing for large documents
        let extractedData = '';
        try {
          // Adaptive batch settings based on file size
          const getProcessingSettings = (fileSize: number) => {
            if (fileSize < 15 * 1024 * 1024) { // Small files
              return { maxPagesPerBatch: 8, maxPayloadSize: 20 * 1024 * 1024 };
            } else if (fileSize < 35 * 1024 * 1024) { // Medium files
              return { maxPagesPerBatch: 6, maxPayloadSize: 18 * 1024 * 1024 };
            } else if (fileSize < 60 * 1024 * 1024) { // Large files
              return { maxPagesPerBatch: 4, maxPayloadSize: 15 * 1024 * 1024 };
            } else { // Very large files
              return { maxPagesPerBatch: 3, maxPayloadSize: 12 * 1024 * 1024 };
            }
          };
          
          const processingSettings = getProcessingSettings(fileSize);
          const { maxPagesPerBatch, maxPayloadSize } = processingSettings;
          
          if (imagePages.length <= maxPagesPerBatch) {
            // Process small documents in a single batch
            sendStatus({
              step: 'Processing with GPT-4o Vision',
              progress: 50,
              message: `Analyzing ${imagePages.length} pages with AI...`
            });

            const { createOpenAIClient, VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');
            const openai = createOpenAIClient();

            const imageMessages = imagePages.map((imagePage) => ({
              type: "image_url" as const,
              image_url: {
                url: imagePage,
                detail: "medium" as const // Reduced from "high" to manage payload size
              } as any
            }));

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
            });

            extractedData = completion.choices[0]?.message?.content || '';
          } else {
            // Process large documents in batches
            sendStatus({
              step: 'Processing with GPT-4o Vision',
              progress: 50,
              message: `Processing ${imagePages.length} pages in batches...`
            });

            const { processPDFInBatches } = await import('@/lib/batch-processor');
            const { VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');

            extractedData = await processPDFInBatches(imagePages, {
              maxPagesPerBatch,
              maxPayloadSize,
              analysisPrompt: VISION_ANALYSIS_PROMPT
            });
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
            totalPages: imagePages.length
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