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
        
        // Extract text from PDF using pdf-parse
        sendStatus({
          step: 'Extracting text from PDF',
          progress: 25,
          message: `Extracting text from ${Math.round(fileSize / 1024 / 1024)}MB PDF...`
        });
        
        const fs = await import('fs');
        const pdfBuffer = fs.readFileSync(tempFilePath);
        
        let extractedText = '';
        try {
          const pdfParse = await import('pdf-parse');
          const pdfData = await pdfParse.default(pdfBuffer);
          extractedText = pdfData.text;
          
          sendStatus({
            step: 'Text extraction complete',
            progress: 40,
            message: `Extracted text from ${pdfData.numpages} pages`
          });
        } catch (parseError) {
          console.error('PDF text extraction failed:', parseError);
          throw new Error(`Failed to extract text from PDF: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
        
        // Process extracted text with GPT-4o
        let extractedData = '';
        try {
          sendStatus({
            step: 'Processing with GPT-4o',
            progress: 50,
            message: 'Analyzing extracted text with AI...'
          });

          const { createOpenAIClient, VISION_ANALYSIS_PROMPT } = await import('@/lib/document-processor');
          const openai = createOpenAIClient();

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: `${VISION_ANALYSIS_PROMPT}

DOCUMENT TEXT TO ANALYZE:
${extractedText}

Please analyze the above document text and extract the required information according to the template provided.`
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
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