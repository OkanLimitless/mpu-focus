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
        
        // Convert PDF to base64 for direct GPT-4o processing
        sendStatus({
          step: 'Preparing PDF for analysis',
          progress: 25,
          message: `Preparing ${Math.round(fileSize / 1024 / 1024)}MB PDF for AI analysis...`
        });
        
        const fs = await import('fs');
        const pdfBuffer = fs.readFileSync(tempFilePath);
        const base64Pdf = pdfBuffer.toString('base64');
        const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;
        
        sendStatus({
          step: 'PDF prepared for analysis',
          progress: 40,
          message: 'PDF converted to format compatible with AI analysis...'
        });
        
        // Process PDF directly with GPT-4o vision
        let extractedData = '';
        try {
          sendStatus({
            step: 'Processing with GPT-4o Vision',
            progress: 50,
            message: 'Analyzing PDF content with AI...'
          });

          const { createOpenAIClient, VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');
          const openai = createOpenAIClient();

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
                  {
                    type: "image_url",
                    image_url: {
                      url: pdfDataUrl,
                      detail: "high" // Use high detail for PDF analysis
                    } as any
                  }
                ]
              }
            ],
            max_tokens: 4000,
          });

          extractedData = completion.choices[0]?.message?.content || '';

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
            processingMethod: 'Direct PDF Analysis'
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