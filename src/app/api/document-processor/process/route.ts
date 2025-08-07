import { NextRequest } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let tempFilePath: string | null = null;
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'No file provided'
          })}\n\n`));
          controller.close();
          return;
        }

        if (file.type !== 'application/pdf') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'File must be a PDF'
          })}\n\n`));
          controller.close();
          return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB limit
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'File too large. Please use a PDF smaller than 100MB.'
          })}\n\n`));
          controller.close();
          return;
        }

        const sendStatus = (status: ProcessingStatus) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status })}\n\n`));
        };

        sendStatus({
          step: 'Processing file',
          progress: 5,
          message: 'Initializing document processing...'
        });

        // Dynamic import for document processor
        const { createOpenAIClient, VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');

        // Handle large files via UploadThing (for files > 10MB)
        if (file.size > 10 * 1024 * 1024) {
          try {
            sendStatus({
              step: 'Processing large file',
              progress: 10,
              message: 'Uploading large file to temporary storage...'
            });

            // Upload to UploadThing for temporary processing
            const { UTApi } = await import('uploadthing/server');
            const utapi = new UTApi();
            const uploadResult = await utapi.uploadFiles([file]);
            
            if (!uploadResult || uploadResult.length === 0 || uploadResult[0].error) {
              throw new Error('Upload failed: ' + (uploadResult[0]?.error?.message || 'Unknown error'));
            }
            
            const fileUrl = uploadResult[0].data.ufsUrl;
            
            sendStatus({
              step: 'Downloading for processing',
              progress: 15,
              message: 'Downloading file for analysis...'
            });
            
            // Download for processing
            const fileResponse = await fetch(fileUrl);
            const fileBuffer = await fileResponse.arrayBuffer();
            const buffer = Buffer.from(fileBuffer);
            
            tempFilePath = join('/tmp', `upload_${Date.now()}.pdf`);
            await writeFile(tempFilePath, buffer);
            
            // Clean up from UploadThing after download
            setTimeout(async () => {
              try {
                if (uploadResult[0]?.data?.key) {
                  await utapi.deleteFiles([uploadResult[0].data.key]);
                }
              } catch (e) {
                console.warn('Could not delete temporary file from UploadThing:', e);
              }
            }, 5000); // Give some time for processing to complete
            
          } catch (error) {
            console.error('Large file handling error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: 'Failed to process large file. Please try a smaller file or try again.'
            })}\n\n`));
            controller.close();
            return;
          }
        } else {
          // For smaller files, handle directly 
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          tempFilePath = join('/tmp', `upload_${Date.now()}.pdf`);
          await writeFile(tempFilePath, buffer);
        }

        // Send initial status for PDF preparation
        sendStatus({
          step: 'Preparing PDF for analysis',
          progress: 30,
          message: 'Preparing PDF for direct GPT-4o analysis...'
        });

        // Convert PDF pages to images for GPT-4o Vision
        try {
                    let imagePages: string[] = [];
          try {
            const { convertPdfToImages } = await import('@/lib/pdf-to-images-serverless');
            
            sendStatus({
              step: 'Converting PDF to images',
              progress: 30,
              message: `Converting PDF to images for AI analysis...`
            });
            
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
            
            const conversionSettings = getConversionSettings(file.size);
            
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

          sendStatus({
            step: 'Processing with GPT-4o Vision',
            progress: 50,
            message: `Analyzing ${imagePages.length} pages with AI...`
          });

          // Process images with GPT-4o Vision
          let extractedData = '';
          try {
            const openai = createOpenAIClient();
            
            // For large documents, process in batches
            const maxPagesPerBatch = file.size > 30 * 1024 * 1024 ? 3 : 6;
            
            if (imagePages.length <= maxPagesPerBatch) {
              // Small document - process all at once
                             const imageMessages = imagePages.map((imagePage) => ({
                 type: "image_url" as const,
                 image_url: {
                   url: imagePage,
                   detail: "medium" as const
                 }
               } as any));

              const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{
                  role: 'user',
                  content: [
                    {
                      type: "text",
                      text: VISION_ANALYSIS_PROMPT
                    },
                    ...imageMessages
                  ]
                }],
                max_tokens: 4000,
                temperature: 0.1
              });

              extractedData = completion.choices[0].message.content || 'No data could be extracted';
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
                  model: 'gpt-4o',
                  messages: [{
                    role: 'user',
                    content: [
                      {
                        type: "text",
                        text: `${VISION_ANALYSIS_PROMPT}
                        
This is batch ${batchNum} of ${totalBatches}. Extract any relevant information from these pages.`
                      },
                      ...imageMessages
                    ]
                  }],
                  max_tokens: 4000,
                  temperature: 0.1
                });

                const batchResult = completion.choices[0].message.content || '';
                if (batchResult.trim()) {
                  allResults.push(batchResult);
                }
              }
              
              // Combine all batch results
              extractedData = allResults.join('\n\n--- Next Batch ---\n\n');
            }
            
            sendStatus({
              step: 'GPT-4o analysis complete',
              progress: 80,
              message: 'Document analysis completed successfully'
            });
          } catch (visionError) {
            console.error('GPT-4o vision processing failed:', visionError);
            extractedData = `Error during GPT-4o vision processing: ${visionError instanceof Error ? visionError.message : 'Unknown error'}`;
          }

          sendStatus({
            step: 'Finalizing',
            progress: 95,
            message: 'Cleaning up and preparing results...'
          });

          // Clean up temporary PDF file
          if (tempFilePath) {
            await unlink(tempFilePath);
          }

          const processingTime = Math.round((Date.now() - startTime) / 1000);

          // Send final result
          const result = {
            id: `doc_${Date.now()}`,
            fileName: file.name,
            totalPages: imagePages.length,
            processingMethod: 'GPT-4o Vision Analysis',
            extractedData,
            processingTime,
            createdAt: new Date().toISOString()
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
          controller.close();

        } catch (conversionError) {
          console.error('PDF preparation failed:', conversionError);
          throw new Error(`Failed to prepare PDF for analysis: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        }

      } catch (error) {
        console.error('Processing error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        })}\n\n`));
        controller.close();
      } finally {
        // Clean up temp file if it exists
        if (tempFilePath) {
          try {
            await unlink(tempFilePath);
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